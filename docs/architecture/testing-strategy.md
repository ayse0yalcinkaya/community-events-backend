# Testing Strategy

## Test Coverage Requirements

**Minimum Coverage:** 70% (enforced by CI/CD)

**Coverage Breakdown:**
- Utilities: 100% (pure functions, no external dependencies)
- Services: 80%+ (core business logic)
- Controllers: 70%+ (HTTP layer, integration with services)
- Repositories: 70%+ (data access, query logic)

## Unit Tests

**Pattern: Arrange-Act-Assert**

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let mockRepository: jest.Mocked<UsersRepository>;
  let mockI18nService: jest.Mocked<I18nService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: { create: jest.fn() } },
        { provide: I18nService, useValue: { t: jest.fn() } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    mockRepository = module.get(UsersRepository);
    mockI18nService = module.get(I18nService);
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      // Arrange
      const createDto = { email: 'test@example.com', password: 'password123' };
      const mockUser = { id: 'user-123', ...createDto };
      mockRepository.create.mockResolvedValue(mockUser);

      // Act
      const result = await service.create(createDto, 'domain-123');

      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: createDto.email })
      );
    });

    it('should throw NotFoundException when related entity not found', async () => {
      // Arrange
      mockRepository.findRelated.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto, 'domain-123')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
```

## Integration Tests

**Database Setup:**
```typescript
// test/setup.ts
beforeAll(async () => {
  // Use separate test database
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/boilerplate_test';
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database between tests
  await prisma.user.deleteMany();
  await prisma.permission.deleteMany();
});
```

**API Integration Test:**
```typescript
describe('UsersController (integration)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create test user and get token
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });
    accessToken = response.body.data.accessToken;
  });

  it('GET /users should return paginated users', async () => {
    return request(app.getHttpServer())
      .get('/users?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.count).toBeDefined();
      });
  });
});
```

## E2E Tests

**Critical User Journeys:**
```typescript
// test/auth.e2e-spec.ts
describe('Authentication Flow (E2E)', () => {
  it('complete auth flow: register → verify → login → refresh → logout', async () => {
    // 1. Register
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(201);

    const { user } = registerRes.body.data;

    // 2. Verify email (simulate clicking link)
    const verifyToken = 'mock-token-from-email';
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: verifyToken })
      .expect(200);

    // 3. Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(200);

    const { accessToken, refreshToken } = loginRes.body.data;

    // 4. Access protected route
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // 5. Refresh token
    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    const newAccessToken = refreshRes.body.data.accessToken;

    // 6. Logout
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .send({ refreshToken: refreshRes.body.data.refreshToken })
      .expect(200);

    // 7. Old token should be invalid
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(401);
  });
});
```

## Test Utilities

**Mock Factories:**
```typescript
// test/factories/user.factory.ts
export const mockUser = (overrides?: Partial<User>): User => ({
  id: uuid(),
  domainID: 'domain-123',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  firstName: 'Test',
  lastName: 'User',
  phone: null,
  isActive: true,
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

export const mockUserDto = (overrides?: Partial<UserResDto>): UserResDto => ({
  id: uuid(),
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  phone: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
```

---
