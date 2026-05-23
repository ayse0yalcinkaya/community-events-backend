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
  let adminUserId: string;
  let attendeeOneToken: string;
  let attendeeTwoToken: string;
  let communityId: string;
  let eventId: string;
  let eventSlug: string;
  let primaryCategoryId: string;
  let interestIds: string[];
  let otherUserId: string;
  let attendeeTwoUserId: string;

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

    adminUserId = adminUser.id;

    const otherUser = await prisma.user.upsert({
      where: { phoneNumber: '+905552222222' },
      update: {
        firstName: 'Other',
        lastName: 'User',
        email: 'other@communityevents.local',
        phoneVerified: true,
        isActive: true,
        userType: 'ADMIN',
        roleID: adminRole.id,
      },
      create: {
        firstName: 'Other',
        lastName: 'User',
        email: 'other@communityevents.local',
        phoneNumber: '+905552222222',
        phoneVerified: true,
        isActive: true,
        userType: 'ADMIN',
        roleID: adminRole.id,
      },
    });

    const attendeeTwo = await prisma.user.upsert({
      where: { phoneNumber: '+905553333333' },
      update: {
        firstName: 'Third',
        lastName: 'User',
        email: 'third@communityevents.local',
        phoneVerified: true,
        isActive: true,
        userType: 'ADMIN',
        roleID: adminRole.id,
      },
      create: {
        firstName: 'Third',
        lastName: 'User',
        email: 'third@communityevents.local',
        phoneNumber: '+905553333333',
        phoneVerified: true,
        isActive: true,
        userType: 'ADMIN',
        roleID: adminRole.id,
      },
    });

    otherUserId = otherUser.id;
    attendeeTwoUserId = attendeeTwo.id;

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

    await prisma.userProvider.upsert({
      where: {
        userID_provider: {
          userID: otherUser.id,
          provider: 'LOGIN',
        },
      },
      update: {
        identifier: '+905552222222',
        credentials: passwordHash,
        status: 1,
      },
      create: {
        userID: otherUser.id,
        provider: 'LOGIN',
        identifier: '+905552222222',
        credentials: passwordHash,
        status: 1,
      },
    });

    await prisma.userProvider.upsert({
      where: {
        userID_provider: {
          userID: attendeeTwo.id,
          provider: 'LOGIN',
        },
      },
      update: {
        identifier: '+905553333333',
        credentials: passwordHash,
        status: 1,
      },
      create: {
        userID: attendeeTwo.id,
        provider: 'LOGIN',
        identifier: '+905553333333',
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

    const seededInterests = await prisma.interest.findMany({
      where: { slug: { in: ['llm-test', 'ml-test'] } },
      select: { id: true },
    });

    await prisma.userInterest.deleteMany({
      where: { userID: { in: [adminUserId, otherUserId, attendeeTwoUserId] } },
    });

    await prisma.userInterest.createMany({
      data: [adminUserId, otherUserId, attendeeTwoUserId].flatMap((userID) =>
        seededInterests.map((interest) => ({
          userID,
          interestID: interest.id,
        })),
      ),
      skipDuplicates: true,
    });

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

    const attendeeOneLoginResponse = await request(app.getHttpServer()).post('/auth/login/admin').send({
      phoneNumber: '+905552222222',
      password: 'Admin123!',
    });

    attendeeOneToken = attendeeOneLoginResponse.body.accessToken;

    const attendeeTwoLoginResponse = await request(app.getHttpServer()).post('/auth/login/admin').send({
      phoneNumber: '+905553333333',
      password: 'Admin123!',
    });

    attendeeTwoToken = attendeeTwoLoginResponse.body.accessToken;
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
            title: 'Acilis Konusmasi',
            description: 'Etkinligin acilis ve genel cercevesi.',
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
    expect(detailResponse.body.sessions[0].title).toBe('Acilis Konusmasi');

    const homeResponse = await request(app.getHttpServer()).get('/discover/home').expect(200);
    expect(Array.isArray(homeResponse.body.featuredEvents)).toBe(true);

    const searchResponse = await request(app.getHttpServer())
      .get('/discover/search')
      .query({ q: 'AI Meetup', city: 'Ankara' })
      .expect(200);

    expect(searchResponse.body.items.some((item: { id: string }) => item.id === eventId)).toBe(true);

    const unifiedCommunitySearchResponse = await request(app.getHttpServer())
      .get('/discover/search/all')
      .query({ q: 'Community', city: 'Ankara', limit: 20 })
      .expect(200);

    expect(unifiedCommunitySearchResponse.body.events).toBeDefined();
    expect(unifiedCommunitySearchResponse.body.communities).toBeDefined();
    expect(unifiedCommunitySearchResponse.body.users).toBeDefined();
    expect(unifiedCommunitySearchResponse.body.categories).toBeDefined();
    expect(unifiedCommunitySearchResponse.body.communities.items.some((item: { id: string }) => item.id === communityId)).toBe(true);

    const unifiedCategorySearchResponse = await request(app.getHttpServer())
      .get('/discover/search/all')
      .query({ q: 'Teknoloji', limit: 20 })
      .expect(200);

    expect(unifiedCategorySearchResponse.body.categories.items.some((item: { id: string }) => item.id === primaryCategoryId)).toBe(
      true,
    );

    const similarEventCreate = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: `AI Meetup Similar ${Date.now()}`,
        shortDescription: 'Benzer etkinlik',
        primaryCategoryID: primaryCategoryId,
        organizerCommunityID: communityId,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/events/${similarEventCreate.body.id}/schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sessions: [
          {
            title: 'Benzer Oturum',
            startAt: '2026-06-20T10:00:00.000Z',
            endAt: '2026-06-20T12:00:00.000Z',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/events/${similarEventCreate.body.id}/location`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ city: 'Ankara', venueName: 'Teknokent', address: 'ODTU Teknokent' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/events/${similarEventCreate.body.id}/details`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        description: 'Benzer kategori ve formatta etkinlik.',
        format: 'PHYSICAL',
        visibility: 'PUBLIC',
        approvalMode: 'OPEN',
        language: 'tr',
        capacity: 40,
        isPaid: false,
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/events/${similarEventCreate.body.id}/publish`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    const similarEventsResponse = await request(app.getHttpServer()).get(`/events/${eventSlug}/similar`).expect(200);
    expect(similarEventsResponse.body.some((item: { id: string }) => item.id === similarEventCreate.body.id)).toBe(true);

    const categoryOverview = await request(app.getHttpServer()).get('/categories/teknoloji-test/overview').expect(200);
    expect(categoryOverview.body.id).toBe(primaryCategoryId);
    expect(categoryOverview.body.events.some((item: { id: string }) => item.id === eventId)).toBe(true);
    expect(categoryOverview.body.communities.some((item: { id: string }) => item.id === communityId)).toBe(true);
    expect(categoryOverview.body.people.length).toBeGreaterThan(0);
  });

  it('supports gallery management with file ownership validation', async () => {
    const timestamp = Date.now();

    const ownFile = await prisma.file.create({
      data: {
        userID: adminUserId,
        filename: `gallery-${timestamp}.png`,
        originalName: 'gallery.png',
        mimeType: 'image/png',
        size: 1024,
        s3Key: `test/${timestamp}-gallery.png`,
        s3Bucket: process.env.S3_BUCKET || 'test-bucket',
      },
    });

    const foreignFile = await prisma.file.create({
      data: {
        userID: otherUserId,
        filename: `foreign-${timestamp}.png`,
        originalName: 'foreign.png',
        mimeType: 'image/png',
        size: 1024,
        s3Key: `test/${timestamp}-foreign.png`,
        s3Bucket: process.env.S3_BUCKET || 'test-bucket',
      },
    });

    const addGalleryResponse = await request(app.getHttpServer())
      .post(`/events/${eventId}/gallery`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fileID: ownFile.id,
        caption: 'Kapak sonrasi galeri gorseli',
        order: 0,
      })
      .expect(201);

    expect(addGalleryResponse.body.gallery).toHaveLength(1);
    expect(addGalleryResponse.body.gallery[0].fileID).toBe(ownFile.id);

    await request(app.getHttpServer())
      .post(`/events/${eventId}/gallery`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fileID: foreignFile.id })
      .expect(400);

    const galleryId = addGalleryResponse.body.gallery[0].id;

    const reorderResponse = await request(app.getHttpServer())
      .put(`/events/${eventId}/gallery/reorder`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([{ id: galleryId, order: 1 }])
      .expect(200);

    expect(reorderResponse.body.gallery[0].order).toBe(1);

    await request(app.getHttpServer())
      .put(`/events/${eventId}/gallery/reorder`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([{ id: galleryId, order: 0 }, { id: galleryId, order: 1 }])
      .expect(400);

    const removeResponse = await request(app.getHttpServer())
      .delete(`/events/${eventId}/gallery/${galleryId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(removeResponse.body.gallery).toHaveLength(0);
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

    const upcomingEvents = await request(app.getHttpServer())
      .get('/users/me/upcoming-events')
      .query({ limit: 50 })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(upcomingEvents.body.some((item: { id: string }) => item.id === eventId)).toBe(true);

    const myCommunities = await request(app.getHttpServer())
      .get('/users/me/communities')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(myCommunities.body.some((item: { id: string }) => item.id === communityId)).toBe(true);

    const myEvents = await request(app.getHttpServer())
      .get('/events/me/list')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(myEvents.body.some((item: { id: string }) => item.id === eventId)).toBe(true);

    const organizerDashboard = await request(app.getHttpServer())
      .get('/events/organizer/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(organizerDashboard.body.stats.totalEvents).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(organizerDashboard.body.recentEvents)).toBe(true);
    expect(organizerDashboard.body.recentEvents.some((item: { id: string }) => item.id === eventId)).toBe(true);
  });

  it('supports calendar endpoints for add-to-calendar and my calendar view', async () => {
    const calendarFeedResponse = await request(app.getHttpServer())
      .get('/events/me/calendar')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(calendarFeedResponse.body)).toBe(true);
    expect(calendarFeedResponse.body.some((item: { eventID: string }) => item.eventID === eventId)).toBe(true);

    const icsResponse = await request(app.getHttpServer()).get(`/events/${eventId}/calendar.ics`).expect(200);

    expect(icsResponse.headers['content-type']).toContain('text/calendar');
    expect(icsResponse.text).toContain('BEGIN:VCALENDAR');
    expect(icsResponse.text).toContain('SUMMARY:AI Meetup');
  });

  it('supports organizer approval workflow for attendance requests', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: `Approval Event ${Date.now()}`,
        shortDescription: 'Approval required event',
        primaryCategoryID: primaryCategoryId,
        organizerCommunityID: communityId,
      })
      .expect(201);

    const approvalEventId = createResponse.body.id;

    await request(app.getHttpServer())
      .patch(`/events/${approvalEventId}/schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sessions: [
          {
            startAt: '2026-07-15T10:00:00.000Z',
            endAt: '2026-07-15T13:00:00.000Z',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/events/${approvalEventId}/location`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        city: 'Ankara',
        venueName: 'Teknokent',
        address: 'ODTU Teknokent',
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/events/${approvalEventId}/details`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        description: 'Approval workflow event for attendee management.',
        format: 'PHYSICAL',
        visibility: 'PUBLIC',
        approvalMode: 'APPROVAL_REQUIRED',
        language: 'tr',
        capacity: 50,
        isPaid: false,
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/events/${approvalEventId}/publish`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    const attendeeOneAttendResponse = await request(app.getHttpServer())
      .post(`/events/${approvalEventId}/attend`)
      .set('Authorization', `Bearer ${attendeeOneToken}`)
      .expect(201);

    const attendeeTwoAttendResponse = await request(app.getHttpServer())
      .post(`/events/${approvalEventId}/attend`)
      .set('Authorization', `Bearer ${attendeeTwoToken}`)
      .expect(201);

    expect(attendeeOneAttendResponse.body.currentUserAttendanceStatus).toBe('PENDING');
    expect(attendeeTwoAttendResponse.body.currentUserAttendanceStatus).toBe('PENDING');

    const pendingAttendances = await request(app.getHttpServer())
      .get(`/events/${approvalEventId}/attendances`)
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ status: 'PENDING' })
      .expect(200);

    expect(pendingAttendances.body).toHaveLength(2);

    const attendeeOneAttendance = pendingAttendances.body.find((item: { userID: string }) => item.userID === otherUserId);
    const attendeeTwoAttendance = pendingAttendances.body.find(
      (item: { userID: string }) => item.userID === attendeeTwoUserId,
    );

    expect(attendeeOneAttendance).toBeDefined();
    expect(attendeeTwoAttendance).toBeDefined();

    const approveResponse = await request(app.getHttpServer())
      .patch(`/events/${approvalEventId}/attendances/${attendeeOneAttendance.id}/approve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(approveResponse.body.status).toBe('APPROVED');

    const rejectResponse = await request(app.getHttpServer())
      .patch(`/events/${approvalEventId}/attendances/${attendeeTwoAttendance.id}/reject`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(rejectResponse.body.status).toBe('REJECTED');

    const approvedAttendances = await request(app.getHttpServer())
      .get(`/events/${approvalEventId}/attendances`)
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ status: 'APPROVED' })
      .expect(200);

    expect(approvedAttendances.body.some((item: { userID: string }) => item.userID === otherUserId)).toBe(true);

    const rejectedAttendances = await request(app.getHttpServer())
      .get(`/events/${approvalEventId}/attendances`)
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ status: 'REJECTED' })
      .expect(200);

    expect(rejectedAttendances.body.some((item: { userID: string }) => item.userID === attendeeTwoUserId)).toBe(true);
  });

  it('supports event based networking recommendations', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: `Networking Event ${Date.now()}`,
        shortDescription: 'Network event',
        primaryCategoryID: primaryCategoryId,
        organizerCommunityID: communityId,
      })
      .expect(201);

    const networkingEventId = createResponse.body.id;

    await request(app.getHttpServer())
      .patch(`/events/${networkingEventId}/schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sessions: [
          {
            startAt: '2026-08-15T10:00:00.000Z',
            endAt: '2026-08-15T13:00:00.000Z',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/events/${networkingEventId}/location`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ city: 'Ankara', venueName: 'Teknokent', address: 'ODTU Teknokent' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/events/${networkingEventId}/details`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        description: 'Networking event to meet people.',
        format: 'PHYSICAL',
        visibility: 'PUBLIC',
        approvalMode: 'OPEN',
        language: 'tr',
        capacity: 50,
        isPaid: false,
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/events/${networkingEventId}/publish`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/events/${networkingEventId}/attend`)
      .set('Authorization', `Bearer ${attendeeOneToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/events/${networkingEventId}/attend`)
      .set('Authorization', `Bearer ${attendeeTwoToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/events/${networkingEventId}/attendance`)
      .set('Authorization', `Bearer ${attendeeTwoToken}`)
      .send({ visibility: 'PRIVATE' })
      .expect(200);

    const attendeePeople = await request(app.getHttpServer())
      .get(`/events/${networkingEventId}/people`)
      .set('Authorization', `Bearer ${attendeeOneToken}`)
      .expect(200);

    expect(attendeePeople.body.some((item: { userID: string; isCurrentUser: boolean }) => item.userID === otherUserId && item.isCurrentUser)).toBe(true);
    expect(attendeePeople.body.some((item: { userID: string }) => item.userID === attendeeTwoUserId)).toBe(false);

    const organizerPeople = await request(app.getHttpServer())
      .get(`/events/${networkingEventId}/people`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(organizerPeople.body.some((item: { userID: string }) => item.userID === otherUserId)).toBe(true);
    expect(organizerPeople.body.some((item: { userID: string; attendanceVisibility: string }) => item.userID === attendeeTwoUserId && item.attendanceVisibility === 'PRIVATE')).toBe(true);

    const recommendations = await request(app.getHttpServer())
      .get(`/events/${networkingEventId}/network/recommendations`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(recommendations.body)).toBe(true);
    expect(recommendations.body.some((item: { userID: string; sharedInterestCount: number }) => item.userID === otherUserId && item.sharedInterestCount >= 1)).toBe(true);
    expect(recommendations.body.some((item: { userID: string }) => item.userID === attendeeTwoUserId)).toBe(false);
  });

  it('supports connection request accept reject and listing flows', async () => {
    await prisma.userConnection.deleteMany({
      where: {
        OR: [
          { requesterUserID: otherUserId, addresseeUserID: adminUserId },
          { requesterUserID: adminUserId, addresseeUserID: otherUserId },
          { requesterUserID: attendeeTwoUserId, addresseeUserID: adminUserId },
          { requesterUserID: adminUserId, addresseeUserID: attendeeTwoUserId },
        ],
      },
    });

    const sentRequest = await request(app.getHttpServer())
      .post(`/connections/${adminUserId}/request`)
      .set('Authorization', `Bearer ${attendeeOneToken}`)
      .expect(201);

    expect(sentRequest.body.status).toBe('PENDING');
    expect(sentRequest.body.direction).toBe('sent');
    expect(sentRequest.body.otherUser.id).toBe(adminUserId);

    const receivedConnections = await request(app.getHttpServer())
      .get('/connections')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ direction: 'received', status: 'PENDING' })
      .expect(200);

    const pendingIncoming = receivedConnections.body.find((item: { otherUser: { id: string } }) => item.otherUser.id === otherUserId);
    expect(pendingIncoming).toBeDefined();

    const acceptedConnection = await request(app.getHttpServer())
      .patch(`/connections/${pendingIncoming.id}/accept`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(acceptedConnection.body.status).toBe('ACCEPTED');
    expect(acceptedConnection.body.otherUser.id).toBe(otherUserId);

    const secondRequest = await request(app.getHttpServer())
      .post(`/connections/${adminUserId}/request`)
      .set('Authorization', `Bearer ${attendeeTwoToken}`)
      .expect(201);

    expect(secondRequest.body.status).toBe('PENDING');

    const secondPendingList = await request(app.getHttpServer())
      .get('/connections')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ direction: 'received', status: 'PENDING' })
      .expect(200);

    const secondPending = secondPendingList.body.find(
      (item: { otherUser: { id: string } }) => item.otherUser.id === attendeeTwoUserId,
    );
    expect(secondPending).toBeDefined();

    const rejectedConnection = await request(app.getHttpServer())
      .patch(`/connections/${secondPending.id}/reject`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(rejectedConnection.body.status).toBe('REJECTED');

    const acceptedList = await request(app.getHttpServer())
      .get('/connections')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ status: 'ACCEPTED' })
      .expect(200);

    expect(acceptedList.body.some((item: { otherUser: { id: string } }) => item.otherUser.id === otherUserId)).toBe(true);

    const rejectedList = await request(app.getHttpServer())
      .get('/connections')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ status: 'REJECTED' })
      .expect(200);

    expect(rejectedList.body.some((item: { otherUser: { id: string } }) => item.otherUser.id === attendeeTwoUserId)).toBe(true);
  });

  it('supports community announcement creation and listing', async () => {
    const announcementResponse = await request(app.getHttpServer())
      .post(`/communities/${communityId}/announcements`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        communityID: communityId,
        title: `Community Update ${Date.now()}`,
        type: 1,
        content: 'Yeni topluluk bulusmasi duyuruldu.',
        scope: 0,
        status: 1,
      })
      .expect(201);

    expect(announcementResponse.body.communityID).toBe(communityId);

    const listResponse = await request(app.getHttpServer())
      .get(`/communities/${communityId}/announcements`)
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(Array.isArray(listResponse.body.items)).toBe(true);
    expect(listResponse.body.items.some((item: { id: string }) => item.id === announcementResponse.body.id)).toBe(true);
  });

  it('supports community role management and member admin flows', async () => {
    await request(app.getHttpServer())
      .post(`/communities/${communityId}/join`)
      .set('Authorization', `Bearer ${attendeeOneToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/communities/${communityId}/join`)
      .set('Authorization', `Bearer ${attendeeTwoToken}`)
      .expect(201);

    const promoteResponse = await request(app.getHttpServer())
      .patch(`/communities/${communityId}/members/${otherUserId}/role`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'ADMIN' })
      .expect(200);

    expect(promoteResponse.body.currentUserMembershipRole).toBe('OWNER');

    const membersAfterPromote = await request(app.getHttpServer()).get(`/communities/${communityId}/members`).expect(200);
    expect(membersAfterPromote.body.some((item: { userID: string; role: string }) => item.userID === otherUserId && item.role === 'ADMIN')).toBe(true);

    await request(app.getHttpServer())
      .patch(`/communities/${communityId}/members/${attendeeTwoUserId}/role`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'OWNER' })
      .expect(200);

    const membersAfterTransfer = await request(app.getHttpServer()).get(`/communities/${communityId}/members`).expect(200);
    expect(membersAfterTransfer.body.some((item: { userID: string; role: string }) => item.userID === attendeeTwoUserId && item.role === 'OWNER')).toBe(true);
    expect(membersAfterTransfer.body.some((item: { userID: string; role: string }) => item.userID === adminUserId && item.role === 'ADMIN')).toBe(true);

    const removeMemberResponse = await request(app.getHttpServer())
      .delete(`/communities/${communityId}/members/${otherUserId}`)
      .set('Authorization', `Bearer ${attendeeTwoToken}`)
      .expect(200);

    expect(removeMemberResponse.body.currentUserMembershipRole).toBe('OWNER');

    const membersAfterRemoval = await request(app.getHttpServer()).get(`/communities/${communityId}/members`).expect(200);
    expect(membersAfterRemoval.body.some((item: { userID: string }) => item.userID === otherUserId)).toBe(false);
  });

  it('supports ticket purchase flow with stock decrement and attendance link', async () => {
    const ticketCreateResponse = await request(app.getHttpServer())
      .post(`/events/${eventId}/tickets`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Genel Katilim',
        type: 'FREE',
        quota: 20,
        available: 20,
        description: 'Standart katilim bileti',
      })
      .expect(201);

    const purchaseResponse = await request(app.getHttpServer())
      .post(`/events/${eventId}/tickets/${ticketCreateResponse.body.id}/purchase`)
      .set('Authorization', `Bearer ${attendeeTwoToken}`)
      .send({ quantity: 2 })
      .expect(201);

    expect(purchaseResponse.body.ticketID).toBe(ticketCreateResponse.body.id);
    expect(purchaseResponse.body.quantity).toBe(2);
    expect(purchaseResponse.body.status).toBe('COMPLETED');

    const ticketsResponse = await request(app.getHttpServer()).get(`/events/${eventId}/tickets`).expect(200);
    const updatedTicket = ticketsResponse.body.find((item: { id: string }) => item.id === ticketCreateResponse.body.id);
    expect(updatedTicket.available).toBe(18);

    const attendeeEventResponse = await request(app.getHttpServer())
      .get('/users/me/attendances')
      .set('Authorization', `Bearer ${attendeeTwoToken}`)
      .expect(200);

    expect(attendeeEventResponse.body.some((item: { id: string }) => item.id === eventId)).toBe(true);
  });
});
