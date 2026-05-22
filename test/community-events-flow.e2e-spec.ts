import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { hashPassword } from '../src/common/utils/hash.util';

describe('Community Events Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let accessToken: string;
  let communityId: string;
  let eventId: string;
  let eventSlug: string;
  let primaryCategoryId: string;
  let interestIds: string[];

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    await prisma.role.upsert({
      where: { name: 'admin' },
      update: {
        parentType: 'ADMIN',
        isDefault: true,
      },
      create: {
        name: 'admin',
        parentType: 'ADMIN',
        isDefault: true,
      },
    });

    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });
    const passwordHash = await hashPassword('Admin123!');

    const requiredPermissions = [
      { moduleKey: 'INTERESTS', action: 'VIEW' },
      { moduleKey: 'INTERESTS', action: 'UPDATE' },
      { moduleKey: 'COMMUNITIES', action: 'CREATE' },
      { moduleKey: 'COMMUNITIES', action: 'VIEW' },
      { moduleKey: 'COMMUNITIES', action: 'UPDATE' },
      { moduleKey: 'EVENTS', action: 'CREATE' },
      { moduleKey: 'EVENTS', action: 'VIEW' },
      { moduleKey: 'EVENTS', action: 'UPDATE' },
    ] as const;

    for (const { moduleKey, action } of requiredPermissions) {
      const moduleRecord = await prisma.module.upsert({
        where: { nameKey: `modules.${moduleKey}.NAME` },
        update: {
          descriptionKey: `modules.${moduleKey}.DESCRIPTION`,
        },
        create: {
          nameKey: `modules.${moduleKey}.NAME`,
          descriptionKey: `modules.${moduleKey}.DESCRIPTION`,
        },
      });

      const permission = await prisma.permission.upsert({
        where: {
          moduleID_action: {
            moduleID: moduleRecord.id,
            action,
          },
        },
        update: {
          description: `${moduleKey} ${action}`,
        },
        create: {
          moduleID: moduleRecord.id,
          action,
          description: `${moduleKey} ${action}`,
        },
      });

      await prisma.rolePermission.upsert({
        where: {
          roleID_permissionID: {
            roleID: adminRole.id,
            permissionID: permission.id,
          },
        },
        update: {},
        create: {
          roleID: adminRole.id,
          permissionID: permission.id,
        },
      });
    }

    const adminUser = await prisma.user.upsert({
      where: { phoneNumber: '+905551111111' },
      update: {
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@communityevents.local',
        phoneVerified: true,
        isActive: true,
        userType: 'ADMIN',
        roleID: adminRole.id,
      },
      create: {
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@communityevents.local',
        phoneNumber: '+905551111111',
        phoneVerified: true,
        isActive: true,
        userType: 'ADMIN',
        roleID: adminRole.id,
      },
    });

    await prisma.userProvider.upsert({
      where: {
        userID_provider: {
          userID: adminUser.id,
          provider: 'LOGIN',
        },
      },
      update: {
        identifier: adminUser.phoneNumber,
        credentials: passwordHash,
        status: 1,
      },
      create: {
        userID: adminUser.id,
        provider: 'LOGIN',
        identifier: adminUser.phoneNumber,
        credentials: passwordHash,
        status: 1,
      },
    });

    const rootCategory = await prisma.category.upsert({
      where: { slug: 'teknoloji-test' },
      update: {
        name: 'Teknoloji Test',
        status: 'ACTIVE',
      },
      create: {
        name: 'Teknoloji Test',
        slug: 'teknoloji-test',
        status: 'ACTIVE',
      },
    });

    const childCategory = await prisma.category.upsert({
      where: { slug: 'yapay-zeka-test' },
      update: {
        name: 'Yapay Zeka Test',
        parentID: rootCategory.id,
        status: 'ACTIVE',
      },
      create: {
        name: 'Yapay Zeka Test',
        slug: 'yapay-zeka-test',
        parentID: rootCategory.id,
        status: 'ACTIVE',
      },
    });

    await Promise.all(
      ['llm-test', 'ml-test', 'data-test'].map((slug, index) =>
        prisma.interest.upsert({
          where: { slug },
          update: {
            name: `Interest ${index + 1}`,
            categoryID: childCategory.id,
          },
          create: {
            name: `Interest ${index + 1}`,
            slug,
            categoryID: childCategory.id,
          },
        }),
      ),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const loginResponse = await request(app.getHttpServer()).post('/auth/login/admin').send({
      phoneNumber: '+905551111111',
      password: 'Admin123!',
    });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('lists category tree and captures category id', async () => {
    const response = await request(app.getHttpServer()).get('/categories/tree').expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    primaryCategoryId = response.body[0].id;
    expect(primaryCategoryId).toBeDefined();
  });

  it('lists interests and updates current user interests', async () => {
    const interestsResponse = await request(app.getHttpServer()).get('/interests').expect(200);

    expect(Array.isArray(interestsResponse.body)).toBe(true);
    expect(interestsResponse.body.length).toBeGreaterThanOrEqual(3);
    interestIds = interestsResponse.body.slice(0, 3).map((item: { id: string }) => item.id);

    const updateResponse = await request(app.getHttpServer())
      .post('/users/me/interests')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ interestIds })
      .expect(201);

    expect(updateResponse.body).toHaveLength(3);
  });

  it('creates a community', async () => {
    const response = await request(app.getHttpServer())
      .post('/communities')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Tech Community ${Date.now()}`,
        shortDescription: 'A community for builders',
        description: 'We bring together people interested in technology and events.',
        city: 'Ankara',
      })
      .expect(201);

    expect(response.body.name).toContain('Tech Community');
    expect(response.body.currentUserMembershipRole).toBe('OWNER');
    communityId = response.body.id;
  });

  it('creates and publishes an event through wizard endpoints', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: `AI Meetup ${Date.now()}`,
        shortDescription: 'Meetup for AI builders',
        primaryCategoryID: primaryCategoryId,
        organizerCommunityID: communityId,
      })
      .expect(201);

    eventId = createResponse.body.id;
    eventSlug = createResponse.body.slug;

    await request(app.getHttpServer())
      .patch(`/events/${eventId}/schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sessions: [
          {
            startAt: '2026-06-15T10:00:00.000Z',
            endAt: '2026-06-15T13:00:00.000Z',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/events/${eventId}/location`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        city: 'Ankara',
        venueName: 'Teknokent',
        address: 'ODTU Teknokent',
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/events/${eventId}/details`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        description: 'An in-depth event for AI builders, founders, and researchers.',
        format: 'PHYSICAL',
        visibility: 'PUBLIC',
        approvalMode: 'OPEN',
        language: 'tr',
        capacity: 100,
        isPaid: false,
      })
      .expect(200);

    const publishResponse = await request(app.getHttpServer())
      .post(`/events/${eventId}/publish`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    expect(publishResponse.body.status).toBe('PUBLISHED');
  });

  it('returns published event in discover and event detail endpoints', async () => {
    const detailResponse = await request(app.getHttpServer()).get(`/events/${eventSlug}`).expect(200);
    expect(detailResponse.body.id).toBe(eventId);

    const homeResponse = await request(app.getHttpServer()).get('/discover/home').expect(200);
    expect(Array.isArray(homeResponse.body.featuredEvents)).toBe(true);

    const searchResponse = await request(app.getHttpServer())
      .get('/discover/search')
      .query({ q: 'AI Meetup', city: 'Ankara' })
      .expect(200);

    expect(searchResponse.body.items.some((item: { id: string }) => item.id === eventId)).toBe(true);
  });

  it('supports attend, bookmark, and current user dashboard endpoints', async () => {
    const attendResponse = await request(app.getHttpServer())
      .post(`/events/${eventId}/attend`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);
    expect(attendResponse.body.currentUserAttendanceStatus).toBe('APPROVED');

    const bookmarkResponse = await request(app.getHttpServer())
      .post(`/events/${eventId}/bookmark`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);
    expect(bookmarkResponse.body.isBookmarked).toBe(true);

    const myBookmarks = await request(app.getHttpServer())
      .get('/users/me/bookmarks')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(myBookmarks.body.some((item: { id: string }) => item.id === eventId)).toBe(true);

    const myAttendances = await request(app.getHttpServer())
      .get('/users/me/attendances')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(myAttendances.body.some((item: { id: string }) => item.id === eventId)).toBe(true);

    const myCommunities = await request(app.getHttpServer())
      .get('/users/me/communities')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(myCommunities.body.some((item: { id: string }) => item.id === communityId)).toBe(true);
  });
});
