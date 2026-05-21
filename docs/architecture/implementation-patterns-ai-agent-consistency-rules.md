# Implementation Patterns (AI Agent Consistency Rules)

## CRITICAL: These patterns are MANDATORY for all AI agents

**File & Folder Naming:**
```
Files: kebab-case (advance-payments.service.ts)
Folders: kebab-case (advance-payments/)
Classes: PascalCase (AdvancePaymentsService)
Variables: camelCase (domainID, staffID)
Constants: SCREAMING_SNAKE_CASE (PERMISSIONS_KEY)
Database Tables: snake_case, plural (advance_payments)
Database Columns: snake_case (created_at, response_note)
API Endpoints: plural, kebab-case (/advance-payments)
```

**Module Structure (Mandatory):**
```
src/modules/[module-name]/
  __test__/                   # Unit tests
  controllers/                # HTTP layer
  dto/
    request/                  # Input DTOs
    response/                 # Output DTOs
  entities/                   # Database models
  enums/                      # Module-specific enums
  interfaces/                 # Service/Repository contracts
  repositories/               # Data access layer
  services/                   # Business logic
  [module-name].module.ts     # NestJS module definition
```

**Import Organization (8-Group Order):**
```typescript
// 1. Libraries (external packages)
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// 2. DTOs
import { CreateUserDto } from '../dto/request/create-user.dto';

// 3. Services (other modules)
import { MailService } from '../../mail/services/mail.service';

// 4. Repositories
import { UsersRepository } from '../repositories/users.repository';

// 5. Entities
import { User } from '../entities/user.entity';

// 6. Interfaces
import { IUsersService } from '../interfaces/users.service.interface';

// 7. Enums
import { UserStatus } from '../enums/user-status.enum';

// 8. Events
import { UserCreatedEvent } from '../events/user.events';
```

**API Response Format (Auto-Wrapped by Interceptor):**
```typescript
// Controllers return DTOs directly
return userDto;

// Interceptor wraps automatically:
{
  success: true,
  status: 200,
  data: userDto,
  message: "operation.success"
}

// Paginated (return { data, count })
return { data: users, count: 150 };

// Interceptor wraps:
{
  success: true,
  status: 200,
  data: users,
  count: 150,
  message: "operation.success"
}
```

**Error Handling Pattern:**
```typescript
// Services
try {
  const result = await this.repository.operation();
  if (!result) throw new NotFoundException(this.i18n.t('module.NOT_FOUND'));
  return plainToInstance(ResDto, result, { excludeExtraneousValues: true });
} catch (error) {
  if (error instanceof NotFoundException) throw error;
  throw new BadRequestException(
    error?.response?.message || this.i18n.t('module.OPERATION_FAILED')
  );
}

// Controllers
const result = await this.service.findOne(id, domainID);
if (!result) throw new NotFoundException(`Resource ${id} not found`);
return result;
```

**Multi-Tenancy Pattern (MANDATORY):**
```typescript
// Controllers: Extract from JWT
@Get()
async findAll(@CurrentUser('domainID') domainID: string) {
  return this.service.findAll(domainID);
}

// Services: Require domainID parameter
async findAll(domainID: string): Promise<UserResDto[]> {
  return this.repository.findAll(domainID);
}

// Repositories: Always filter by domainID
async findAll(domainID: string): Promise<User[]> {
  return this.prisma.user.findMany({
    where: { domainID, deletedAt: null }
  });
}
```

**DTO Transformation Pattern:**
```typescript
// Response DTOs use @Expose() and @Exclude()
export class UserResDto {
  @Expose() id: string;
  @Expose() email: string;
  @Exclude() passwordHash: string;
  @Exclude() domainID: string;

  @Expose()
  @Type(() => SimpleRoleDto)
  roles: SimpleRoleDto[];
}

// Always use plainToInstance with options
return plainToInstance(UserResDto, user, {
  excludeExtraneousValues: true,
  enableImplicitConversion: true,
});
```

**Status Enum Pattern (Integer-Based):**
```typescript
/**
 * User Status Enum
 *
 * Integer values for database efficiency and indexing.
 */
export enum UserStatusEnum {
  /** User account is inactive */
  INACTIVE = 0,

  /** User account is active */
  ACTIVE = 1,

  /** User account is suspended */
  SUSPENDED = 2,
}

// Database column
@Column({ type: 'smallint', default: UserStatusEnum.ACTIVE })
status: UserStatusEnum;
```

**Controller Pattern:**
```typescript
@ApiTags('Users')
@Controller({ path: 'users', version: VERSION_NEUTRAL })
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permission('USERS', ActionEnum.CREATE)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({ type: createApiResponseClass(UserResDto) })
  @ApiBadRequestResponse({ type: ErrorApiResponseClass })
  async create(
    @Body() createDto: CreateUserDto,
    @CurrentUser('domainID') domainID: string,
  ): Promise<UserResDto> {
    return this.usersService.create(createDto, domainID);
  }
}
```

**Service Pattern:**
```typescript
@Injectable()
export class UsersService implements IUsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly i18n: I18nService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a new user
   *
   * Validates email uniqueness, hashes password, and creates user record.
   *
   * @param createDto - User creation data
   * @param domainID - Domain identifier
   * @returns Created user record
   * @throws NotFoundException When related entity not found
   * @throws BadRequestException When validation fails
   */
  async create(createDto: CreateUserDto, domainID: string): Promise<UserResDto> {
    // Implementation with try-catch, validation, transformation
  }
}
```

**Repository Pattern:**
```typescript
@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findAll(domainID: string, options?: QueryUserDto): Promise<PaginatedResponse<UserResDto>> {
    const query = this.repository
      .createQueryBuilder('user')
      .where('user.domainID = :domainID', { domainID })
      .andWhere('user.deletedAt IS NULL');

    // Apply filters, pagination, sorting
    const [data, count] = await Promise.all([query.getMany(), query.getCount()]);

    return {
      data: plainToInstance(UserResDto, data, { excludeExtraneousValues: true }),
      count,
    };
  }
}
```

**Entity Pattern:**
```typescript
@Entity('users')  // snake_case table name
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  domainID: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phone: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;

  @ManyToOne(() => Role, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'roleID' })
  role: Role;
}
```

**Complete Pattern Reference:** See `/docs/PRD-NFR-CodingStandards.md` for exhaustive hrsync-backend proven patterns.

---
