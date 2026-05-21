/**
 * Mock PrismaService for Unit Tests
 *
 * Usage:
 * ```typescript
 * import { createMockPrismaService } from 'test/utils';
 *
 * let mockPrisma: MockPrismaService;
 *
 * beforeEach(async () => {
 *   mockPrisma = createMockPrismaService();
 *
 *   const module = await Test.createTestingModule({
 *     providers: [
 *       MyService,
 *       { provide: PrismaService, useValue: mockPrisma },
 *     ],
 *   }).compile();
 * });
 *
 * // Example: Mock a Prisma query
 * mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@test.com' });
 * ```
 */
export const createMockPrismaService = () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  permission: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  file: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  otpCode: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $executeRaw: jest.fn(),
  $executeRawUnsafe: jest.fn(),
  $queryRaw: jest.fn(),
  $queryRawUnsafe: jest.fn(),
  $transaction: jest.fn(),
});

export type MockPrismaService = ReturnType<typeof createMockPrismaService>;
