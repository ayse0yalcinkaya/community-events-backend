// Libraries
import { BadRequestException, Injectable } from '@nestjs/common';

// Services
import { PrismaService } from '@/database/prisma.service';
@Injectable()
export class InterestsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(categoryId?: string) {
    return this.prisma.interest.findMany({
      where: categoryId ? { categoryID: categoryId } : undefined,
      include: {
        category: true,
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
  }

  async getUserInterests(userId: string) {
    return this.prisma.userInterest.findMany({
      where: { userID: userId },
      include: {
        interest: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { interest: { name: 'asc' } },
    });
  }

  async getOnboardingStatus(userId: string) {
    const count = await this.prisma.userInterest.count({
      where: { userID: userId },
    });

    return {
      interestCount: count,
      isComplete: count >= 3,
      minRequired: 3,
    };
  }

  async setUserInterests(userId: string, interestIds: string[]) {
    const interests = await this.prisma.interest.findMany({
      where: { id: { in: interestIds } },
      select: { id: true },
    });

    if (interests.length !== interestIds.length) {
      throw new BadRequestException('interests.INVALID_SELECTION');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userInterest.deleteMany({ where: { userID: userId } });
      await tx.userInterest.createMany({
        data: interestIds.map((interestId) => ({
          userID: userId,
          interestID: interestId,
        })),
      });
    });

    return this.getUserInterests(userId);
  }
}
