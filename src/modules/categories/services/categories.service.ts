// Libraries
import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

// DTOs
import { CategoryOverviewResDto } from '../dto/response/category-overview-res.dto';

// Services
import { PrismaService } from '@/database/prisma.service';
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTree() {
    const categories = await this.prisma.category.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: { status: 'ACTIVE' },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });

    return categories.filter((category) => category.parentID === null);
  }

  async getBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: {
          where: { status: 'ACTIVE' },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        interests: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category || category.status !== 'ACTIVE') {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async getOverview(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: { where: { status: 'ACTIVE' }, select: { id: true } },
      },
    });

    if (!category || category.status !== 'ACTIVE') {
      throw new NotFoundException('Category not found');
    }

    const categoryIds = [category.id, ...category.children.map((child) => child.id)];

    const [events, eventCount, communities, users, peopleCount] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          deletedAt: null,
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          primaryCategoryID: { in: categoryIds },
        },
        include: {
          location: { select: { city: true } },
          sessions: { orderBy: { startAt: 'asc' }, take: 1 },
          _count: { select: { attendances: true } },
        },
        take: 6,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.event.count({
        where: { deletedAt: null, status: 'PUBLISHED', visibility: 'PUBLIC', primaryCategoryID: { in: categoryIds } },
      }),
      this.prisma.community.findMany({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          events: { some: { deletedAt: null, status: 'PUBLISHED', primaryCategoryID: { in: categoryIds } } },
        },
        include: {
          _count: { select: { members: { where: { status: 'ACTIVE' } } } },
        },
        take: 6,
        orderBy: [{ members: { _count: 'desc' } }, { createdAt: 'desc' }],
      }),
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          interests: { some: { interest: { categoryID: { in: categoryIds } } } },
        },
        select: { id: true, firstName: true, lastName: true, headline: true, city: true },
        take: 6,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          isActive: true,
          interests: { some: { interest: { categoryID: { in: categoryIds } } } },
        },
      }),
    ]);

    return plainToInstance(
      CategoryOverviewResDto,
      {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        eventCount,
        communityCount: communities.length,
        peopleCount,
        events: events.map((e) => ({
          id: e.id,
          title: e.title,
          slug: e.slug,
          format: e.format,
          city: e.location?.city ?? null,
          nextSessionStartAt: e.sessions[0]?.startAt ?? null,
          attendeeCount: e._count.attendances,
        })),
        communities: communities.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          shortDescription: c.shortDescription,
          city: c.city,
          memberCount: c._count.members,
        })),
        people: users,
      },
      { excludeExtraneousValues: true },
    );
  }
}
