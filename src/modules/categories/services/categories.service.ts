import { Injectable, NotFoundException } from '@nestjs/common';

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
}
