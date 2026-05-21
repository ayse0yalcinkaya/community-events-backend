# PRD - Non-Functional Requirements: Coding Standards

**⚠️ IMPORTANT: Bu standartlar hrsync-backend projesinden çıkarılmıştır ve production-tested pattern'lerdir.**

Bu dokümantasyonu PRD.md'nin NFR-4 bölümüne entegre edin.

---

## NFR-4.1: File & Folder Naming (hrsync-backend proven)

**Folder Structure Standard:**
```
src/
  [module-name]/              # kebab-case (örn: advance-payments)
    __test__/                 # Test folder
      [module-name].service.spec.ts
      [module-name].controller.spec.ts
      [module-name].repository.spec.ts
    controllers/
      [module-name].controller.ts
      [module-name]-admin.controller.ts
      [module-name]-staff-portal.controller.ts
    dto/
      request/
        create-[entity].dto.ts
        update-[entity].dto.ts
        query-[entity].dto.ts
      response/
        [entity]-res.dto.ts
        [entity]-paginated-res.dto.ts
    entities/
      [entity].entity.ts      # singular (örn: advance-payment.entity.ts)
    enums/
      status.enum.ts
      type.enum.ts
      [specific-name].enum.ts
    events/
      [entity].events.ts
    interfaces/
      [module-name].service.interface.ts
      [module-name].repository.interface.ts
    repositories/
      [module-name].repository.ts
    services/
      [module-name].service.ts
      [module-name]-notification.service.ts
    [module-name].module.ts
```

**File Naming Rules:**
- **Files:** kebab-case (e.g., `advance-payments.service.ts`)
- **Folders:** kebab-case (e.g., `advance-payments/`)
- **Test folders:** `__test__` or `__tests__`
- **DTOs:** `[action]-[entity].dto.ts` (create, update, query)
- **Response DTOs:** `[entity]-res.dto.ts`
- **Entities:** `[entity].entity.ts` (singular)
- **Enums:** `[name].enum.ts`

**Acceptance:** All files/folders follow naming conventions

---

## NFR-4.2: Class Naming Conventions (hrsync-backend proven)

**Pattern:**
```typescript
// Services: [ModuleName]Service
export class AdvancePaymentsService { }

// Controllers: [ModuleName]Controller
export class AdvancePaymentsController { }

// Repositories: [ModuleName]Repository
export class AdvancePaymentsRepository { }

// DTOs: [Action][Entity]Dto
export class CreateAdvancePaymentDto { }
export class UpdateAdvancePaymentDto { }
export class AdvancePaymentResDto { }

// Entities: [Entity] (singular, PascalCase)
export class AdvancePayment { }

// Enums: [Entity][Type]Enum
export enum AdvancePaymentStatusEnum { }
export enum AssignmentTypeEnum { }

// Modules: [ModuleName]Module
export class AdvancePaymentsModule { }
```

**Variable & Method Naming:**
- **Variables:** camelCase (`domainID`, `staffID`, `advancePayment`)
- **Constants:** SCREAMING_SNAKE_CASE (`PERMISSIONS_KEY`, `IS_PUBLIC_KEY`)
- **Private fields:** prefix with `private readonly`
- **Methods:** camelCase, verb-first (`create`, `findAll`, `findOne`, `update`, `remove`, `approve`, `reject`)
- **Boolean variables:** prefix with `is`, `has`, `should` (`isActive`, `hasPermission`)

**Database Column Naming:**
```typescript
// Use snake_case for database columns
created_at: Date;
updated_at: Date;
deleted_at: Date;
response_note: string;
first_name: string;
last_name: string;
```

**Acceptance:** All classes, variables, methods follow naming conventions

---

## NFR-4.3: Import Organization (hrsync-backend proven)

**Import Grouping & Order:**
```typescript
// 1. Libraries (external packages)
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { I18nService } from 'nestjs-i18n';

// 2. DTOs
import { CreateAdvancePaymentDto } from '../dto/request/create-advance-payment.dto';
import { UpdateAdvancePaymentDto } from '../dto/request/update-advance-payment.dto';
import { AdvancePaymentResDto } from '../dto/response/advance-payment-res.dto';

// 3. Services (from other modules)
import { StaffService } from '../../staff/services/staff.service';
import { DepartmentsService } from '../../departments/services/departments.service';

// 4. Repositories
import { AdvancePaymentsRepository } from '../repositories/advance-payments.repository';

// 5. Entities
import { AdvancePayment } from '../entities/advance-payment.entity';

// 6. Interfaces
import { IAdvancePaymentsService } from '../interfaces/advance-payments.service.interface';

// 7. Enums
import { AdvancePaymentStatusEnum } from '../enums/advance-payment-status.enum';

// 8. Events
import { AdvancePaymentApprovedEvent } from '../events/advance-payment.events';
```

**Import Conventions:**
- Group imports by category with comment headers
- Order: Libraries → DTOs → Services → Repositories → Entities → Interfaces → Enums → Events
- Use relative paths for same module (`../dto/...`)
- Use module imports for other modules (`../../staff/...`)
- One blank line between groups
- Sort alphabetically within groups

**Named vs Default Exports:**
```typescript
// ✅ Always use Named Exports
export class AdvancePaymentsService { }
export interface ApiResponse<T> { }
export enum AdvancePaymentStatus { }

// Import
import { AdvancePaymentsService } from './advance-payments.service';

// ❌ Avoid default exports
export default class AdvancePaymentsService { } // DON'T DO THIS
```

**Acceptance:** All imports follow organization rules

---

## NFR-4.4: Response Standards (hrsync-backend proven) ⭐

**Standard Response Wrapper:**
```typescript
// Success Response (Single Item)
{
  success: true,
  status: 200,
  data: T,
  message: "operation.success" // i18n key
}

// Success Response (Paginated)
{
  success: true,
  status: 200,
  data: T[],
  count: number,
  message: "operation.success"
}

// Error Response
{
  success: false,
  status: 400|404|500,
  message: "error.message", // i18n key
  errors?: any[] // Optional validation errors
}
```

**Implementation:**
- All responses automatically wrapped by `ResponseTransformInterceptor`
- Controllers return raw DTOs or pre-formatted responses
- Interceptor intelligently detects existing structure
- Message fields use i18n translation keys (e.g., `operation.success`, `advance-payments.NOT_FOUND`)

**Swagger Documentation:**
```typescript
// Use factory functions for typed responses
@ApiOkResponse({ type: createApiResponseClass(AdvancePaymentResDto) })
@ApiOkResponse({ type: createPaginatedApiResponseClass(AdvancePaymentResDto) })
@ApiBadRequestResponse({ type: ErrorApiResponseClass })
```

**Acceptance:** All API responses follow standard format, all endpoints use factory functions for Swagger

---

## NFR-4.5: Status Enum Standards (hrsync-backend proven) ⭐

**Standard Status Enum Pattern:**
```typescript
/**
 * [Entity] Status Enum
 *
 * Defines the possible states of [entity] throughout its lifecycle.
 * Uses integer values for efficient database storage and indexing.
 *
 * @enum {number}
 */
export enum [Entity]StatusEnum {
  /** Initial state when [entity] is created */
  PENDING = 0,

  /** [Entity] has been approved */
  APPROVED = 1,

  /** [Entity] has been rejected */
  REJECTED = 2,
}
```

**Enum Conventions:**
- **Naming:** `[Entity]StatusEnum` or `[Entity]Status`
- **Values:** Integer (0, 1, 2, ...) for database efficiency
- **Common Pattern:** PENDING (0) → APPROVED (1) / REJECTED (2)
- **Documentation:** JSDoc comments for enum and each value
- **Storage:** `smallint` type in database

**String Enum Pattern (for roles/types):**
```typescript
export enum RoleEnum {
  STAFF = 'STAFF',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}
```

**Helper Functions (Optional):**
```typescript
/**
 * Get human-readable status text
 */
export function getStatusText(status: EntityStatus): string {
  switch (status) {
    case EntityStatus.PENDING: return 'Pending';
    case EntityStatus.APPROVED: return 'Approved';
    case EntityStatus.REJECTED: return 'Rejected';
    default: return 'Unknown';
  }
}

/**
 * Check if status is active/in-progress
 */
export function isActiveStatus(status: EntityStatus): boolean {
  return status === EntityStatus.PENDING || status === EntityStatus.APPROVED;
}
```

**Acceptance:** All status enums follow this pattern, helpers added when needed

---

## NFR-4.6: TypeScript DTO Patterns (hrsync-backend proven) ⭐

**Request DTO Pattern:**
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAdvancePaymentDto {
  @ApiProperty({
    description: 'Staff ID for whom the advance payment is requested',
    example: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty()
  @IsUUID()
  staffID: string;

  @ApiProperty({
    description: 'Amount requested as advance payment',
    example: 1000.5,
    type: Number,
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Optional note describing why the advance payment is requested',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
```

**Response DTO Pattern:**
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Exclude, Type, Transform } from 'class-transformer';

export class AdvancePaymentResDto {
  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the advance payment',
    example: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  id: string;

  // Exclude sensitive fields
  @Exclude()
  domainID: string;

  @Exclude()
  staffID: string;

  // Include nested DTOs with Type decorator
  @Expose()
  @Type(() => SimpleStaffDto)
  @ApiProperty({
    description: 'Staff member who requested the advance payment',
    type: () => SimpleStaffDto,
  })
  staff: SimpleStaffDto;

  // Transform dates
  @Expose()
  @Transform(({ value }) => value, { toPlainOnly: true })
  @ApiProperty({
    description: 'Date and time when the advance payment was created',
    example: '2023-08-15T12:00:00Z',
  })
  created_at: Date;

  // Computed fields with Transform
  @Expose()
  @Transform(({ obj }) => {
    if (obj.respondedByUser)
      return `${obj.respondedByUser.first_name} ${obj.respondedByUser.last_name}`;
    return null;
  })
  @ApiProperty({
    description: 'Full name of the user who responded',
    example: 'John Doe',
    required: false,
  })
  responded_by?: string;
}
```

**Decorator Usage:**
```typescript
// Validation decorators
@IsNotEmpty()
@IsUUID()
@IsString()
@IsNumber()
@IsBoolean()
@IsEnum(EnumType)
@IsDate()
@IsOptional()
@Min(0.01)
@Max(100)
@MinLength(8)
@MaxLength(255)
@Matches(/regex/)
@IsEmail()
@Type(() => Date)
@Type(() => String)

// Swagger decorators
@ApiProperty({ description: '...', example: '...', required: false })
@ApiPropertyOptional({ description: '...', example: '...' })

// Transformation decorators (Response DTOs)
@Expose()          // Include in response
@Exclude()         // Exclude from response
@Type(() => DTO)   // Transform nested objects
@Transform(({ value, obj }) => ...)  // Custom transformation
```

**Interface vs Type:**
- **Interfaces (Preferred):** For DTOs, API responses, service/repository contracts
- **Types (Limited):** For utility types, unions, complex transformations

**Acceptance:** All DTOs follow these patterns, proper decorators used

---

## NFR-4.7: NestJS Controller Pattern (hrsync-backend proven) ⭐

**Standard Controller Structure:**
```typescript
// Libraries
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  VERSION_NEUTRAL,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';

// Services
import { AdvancePaymentsService } from '../services/advance-payments.service';

// DTOs
import { CreateAdvancePaymentDto } from '../dto/request/create-advance-payment.dto';

// Decorators & Guards
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Permission } from 'src/auth/decorators/permissions.decorator';

// Enums
import { ActionEnum } from 'src/shared/enums/action.enum';

@ApiTags('Advance Payments')
@Controller({
  path: 'advance-payments',
  version: VERSION_NEUTRAL,
})
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdvancePaymentsController {
  constructor(private readonly advancePaymentsService: AdvancePaymentsService) {}

  @Post()
  @Permission('ADVANCE_PAYMENT', ActionEnum.CREATE)
  @ApiOperation({ summary: 'Create a new advance payment request' })
  @ApiCreatedResponse({
    description: 'Advance payment has been created successfully',
    type: createApiResponseClass(AdvancePaymentResDto),
  })
  @ApiBadRequestResponse({ type: ErrorApiResponseClass })
  create(
    @Body() createDto: CreateAdvancePaymentDto,
    @CurrentUser('domainID') domainID: string,
  ): Promise<AdvancePaymentResDto> {
    return this.advancePaymentsService.create(createDto, domainID);
  }

  @Get()
  @Permission('ADVANCE_PAYMENT', ActionEnum.VIEW)
  @ApiOperation({ summary: 'Get all advance payment requests' })
  @ApiOkResponse({ type: createPaginatedApiResponseClass(AdvancePaymentResDto) })
  findAll(
    @CurrentUser('domainID') domainID: string,
    @Query() queryDto: QueryAdvancePaymentDto,
  ): Promise<SimplePaginatedResponse<AdvancePaymentResDto>> {
    return this.advancePaymentsService.findAll(domainID, queryDto);
  }

  @Get(':id')
  @Permission('ADVANCE_PAYMENT', ActionEnum.VIEW)
  @ApiParam({ name: 'id', description: 'Advance Payment ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('domainID') domainID: string,
  ): Promise<AdvancePaymentResDto> {
    const result = await this.advancePaymentsService.findOne(id, domainID);
    if (!result) throw new NotFoundException(`Advance payment with ID ${id} not found`);
    return result;
  }
}
```

**Controller Conventions:**
- Always use `@ApiTags` for Swagger grouping
- Use `VERSION_NEUTRAL` for API versioning
- Apply guards at class level: `@UseGuards(JwtAuthGuard, PermissionsGuard)`
- Use `@Permission` decorator for route-level authorization
- Use `@CurrentUser` decorator to extract user info from JWT
- Use `ParseUUIDPipe` for UUID params validation
- Throw `NotFoundException` in controller when service returns null
- Document all endpoints with Swagger decorators (`@ApiOperation`, `@ApiResponse`, etc.)
- Use factory functions for response types (`createApiResponseClass`, `createPaginatedApiResponseClass`)

**Acceptance:** All controllers follow this structure

---

## NFR-4.8: NestJS Service Pattern (hrsync-backend proven) ⭐

**Standard Service Structure:**
```typescript
// Libraries
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { I18nService } from 'nestjs-i18n';
import { EventEmitter2 } from '@nestjs/event-emitter';

// DTOs
import { CreateAdvancePaymentDto } from '../dto/request/create-advance-payment.dto';
import { AdvancePaymentResDto } from '../dto/response/advance-payment-res.dto';

// Repositories
import { AdvancePaymentsRepository } from '../repositories/advance-payments.repository';

// Interfaces
import { IAdvancePaymentsService } from '../interfaces/advance-payments.service.interface';

@Injectable()
export class AdvancePaymentsService implements IAdvancePaymentsService {
  constructor(
    private readonly advancePaymentsRepository: AdvancePaymentsRepository,
    private readonly staffService: StaffService,
    private readonly i18n: I18nService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a new advance payment request
   *
   * Validates staff and department existence, ensures domain consistency,
   * and creates an advance payment record with PENDING status.
   *
   * @param {CreateAdvancePaymentDto} createDto - Advance payment creation data
   * @param {string} domainID - Domain identifier for multi-tenant isolation
   * @returns {Promise<AdvancePaymentResDto>} Created advance payment record
   * @throws {NotFoundException} When staff or department not found
   * @throws {BadRequestException} When validation fails
   *
   * @example
   * ```typescript
   * const payment = await service.create({
   *   staffID: 'staff-uuid',
   *   departmentID: 'dept-uuid',
   *   amount: 1000.50,
   *   note: 'Emergency medical expenses'
   * }, 'domain-uuid');
   * ```
   */
  async create(
    createDto: CreateAdvancePaymentDto,
    domainID: string,
  ): Promise<AdvancePaymentResDto> {
    try {
      // 1. Validate related entities
      if (createDto.departmentID || createDto.staffID) {
        const [department, staff] = await Promise.all([
          createDto.departmentID ? this.departmentService.findOne(createDto.departmentID, domainID) : null,
          createDto.staffID ? this.staffService.findOne(createDto.staffID, domainID) : null,
        ]);

        if (createDto.departmentID && !department)
          throw new NotFoundException(this.i18n.t('advance-payments.DEPARTMENT_NOT_FOUND'));

        if (createDto.staffID && !staff)
          throw new NotFoundException(this.i18n.t('advance-payments.STAFF_NOT_FOUND'));
      }

      // 2. Create entity
      const advancePayment = await this.advancePaymentsRepository.createAdvancePayment({
        ...createDto,
        domainID,
        status: AdvancePaymentStatus.PENDING,
      });

      // 3. Emit events (side effects)
      this.eventEmitter.emit(
        'advance-payment.created',
        new AdvancePaymentCreatedEvent(advancePayment, domainID),
      );

      // 4. Fetch with relations and transform to DTO
      const paymentWithRelations = await this.advancePaymentsRepository.findOne(advancePayment.id, domainID);
      return plainToInstance(AdvancePaymentResDto, paymentWithRelations, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });
    } catch (error) {
      // Preserve specific exceptions, wrap others
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        error?.response?.message || this.i18n.t('advance-payments.CREATE_FAILED'),
      );
    }
  }
}
```

**Service Conventions:**
- Implement interface (`IAdvancePaymentsService`)
- Use constructor dependency injection with `private readonly`
- Include comprehensive JSDoc comments for all public methods
- Use try-catch blocks for error handling
- Use `plainToInstance` for DTO transformation with `excludeExtraneousValues: true`
- Translate error messages using `i18n.t()`
- Emit events for side effects using `EventEmitter2`
- Preserve `NotFoundException`, wrap others in `BadRequestException`
- Always include `domainID` parameter for multi-tenancy

**Acceptance:** All services follow this structure

---

## NFR-4.9: NestJS Repository Pattern (hrsync-backend proven) ⭐

**Standard Repository Structure:**
```typescript
// Libraries
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { plainToInstance } from 'class-transformer';

// Entities
import { AdvancePayment } from '../entities/advance-payment.entity';

// Interfaces
import { IAdvancePaymentsRepository } from '../interfaces/advance-payments.repository.interface';

@Injectable()
export class AdvancePaymentsRepository implements IAdvancePaymentsRepository {
  constructor(
    @InjectRepository(AdvancePayment)
    private readonly repository: Repository<AdvancePayment>,
  ) {}

  async createAdvancePayment(data: Partial<AdvancePayment>): Promise<AdvancePayment> {
    const advancePayment = this.repository.create(data);
    return this.repository.save(advancePayment);
  }

  async findAll(
    domainID: string,
    options?: QueryAdvancePaymentDto,
  ): Promise<SimplePaginatedResponse<AdvancePaymentResDto>> {
    const query = this.repository
      .createQueryBuilder('advance_payment')
      .leftJoinAndSelect('advance_payment.staff', 'staff')
      .leftJoinAndSelect('advance_payment.department', 'department')
      .where('advance_payment.domainID = :domainID', { domainID });

    // Apply filters
    this.applyFilters(query, options);

    // Add pagination
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    query.skip((page - 1) * limit).take(limit);

    // Add ordering
    query.orderBy('advance_payment.created_at', 'DESC');

    // Execute
    const [data, count] = await Promise.all([query.getMany(), query.getCount()]);

    return {
      data: plainToInstance(AdvancePaymentResDto, data, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      }),
      count,
    };
  }

  private applyFilters(
    query: SelectQueryBuilder<AdvancePayment>,
    options?: QueryAdvancePaymentDto,
  ): void {
    if (options?.status)
      query.andWhere('advance_payment.status = :status', { status: options.status });

    if (options?.staffID)
      query.andWhere('advance_payment.staffID = :staffID', { staffID: options.staffID });

    if (options?.search)
      query.andWhere('advance_payment.note ILIKE :search', { search: `%${options.search}%` });
  }

  async findOne(id: string, domainID: string): Promise<AdvancePayment | null> {
    return this.repository.findOne({
      where: { id, domainID },
      relations: ['staff', 'department'],
    });
  }

  async update(
    id: string,
    data: Partial<AdvancePayment>,
    domainID: string,
  ): Promise<AdvancePayment | null> {
    await this.repository.update({ id, domainID }, data);
    return this.findOne(id, domainID);
  }

  async remove(id: string, domainID: string): Promise<boolean> {
    const result = await this.repository.softDelete({ id, domainID });
    return result.affected !== undefined && result.affected > 0;
  }
}
```

**Repository Conventions:**
- Implement interface (`IAdvancePaymentsRepository`)
- Use `@InjectRepository` for TypeORM repository
- Always filter by `domainID` for multi-tenant isolation
- Use query builder for complex queries
- Use `leftJoinAndSelect` for eager loading relations
- Extract filter logic to private methods (`applyFilters`)
- Always use `plainToInstance` for DTO transformation
- Use `softDelete` for deletions (never hard delete)
- Return `null` when not found (don't throw exceptions in repository)

**Acceptance:** All repositories follow this structure

---

## NFR-4.10: Database Entity Pattern (hrsync-backend proven) ⭐

**Standard Entity Structure:**
```typescript
// Libraries
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Entities
import { Staff } from '../../staff/entities/staff.entity';
import { Department } from '../../departments/entities/department.entity';

// Enums
import { AdvancePaymentStatus } from '../enums/advance-payment-status.enum';

@Entity('advance_payments')  // snake_case table name
export class AdvancePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  domainID: string;

  @Column({ type: 'uuid' })
  staffID: string;

  @ManyToOne(() => Staff, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'staffID' })
  staff: Staff;

  @Column({ type: 'uuid', nullable: true })
  departmentID: string | null;

  @ManyToOne(() => Department, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'departmentID' })
  department: Department | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({
    type: 'smallint',
    default: AdvancePaymentStatus.PENDING,
  })
  status: AdvancePaymentStatus;

  @Column({ type: 'uuid', nullable: true })
  responded_by: string | null;

  @Column({ type: 'text', nullable: true })
  response_note: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;
}
```

**Entity Conventions:**
- **Table name:** snake_case (`advance_payments`)
- **Entity class:** PascalCase, singular (`AdvancePayment`)
- **Primary key:** Always `id` with UUID (`@PrimaryGeneratedColumn('uuid')`)
- **Foreign keys:** Suffix with `ID`, use camelCase (`staffID`, `departmentID`)
- **Timestamps:** Always include `created_at`, `updated_at`, `deleted_at`
- **Soft deletes:** Use `@DeleteDateColumn` for `deleted_at`
- **Domain isolation:** Always include `domainID` column (type: uuid)
- **Relations:** Use `@ManyToOne` with `onDelete: 'SET NULL'`
- **Join columns:** Explicitly specify with `@JoinColumn({ name: 'foreignKeyID' })`
- **Column names:** snake_case for multi-word columns (`response_note`, `first_name`)
- **Nullable fields:** Explicitly mark with `nullable: true` and TypeScript union type (`string | null`)

**Migration Naming:**
- Pattern: `[timestamp]-[DescriptiveAction].ts`
- Examples:
  - `1761812169622-AddPhotoColumnToUsers.ts`
  - `1761313284000-RenameDisplayGroupColumn.ts`
  - `1761809562594-ConvertOvertimeMinutesToHours.ts`

**Acceptance:** All entities follow this structure

---

## NFR-4.11: Error Handling Pattern (hrsync-backend proven) ⭐

**Exception Handling in Services:**
```typescript
try {
  // Business logic
  const result = await this.someOperation();
  return result;
} catch (error) {
  // Preserve NotFoundException (specific exceptions)
  if (error instanceof NotFoundException) throw error;

  // Wrap others in BadRequestException with i18n message
  throw new BadRequestException(
    error?.response?.message || this.i18n.t('module.OPERATION_FAILED'),
  );
}
```

**Exception Handling in Controllers:**
```typescript
const result = await this.service.findOne(id, domainID);
if (!result) {
  throw new NotFoundException(`Resource with ID ${id} not found`);
}
return result;
```

**Error Message i18n Keys:**
```typescript
// Format: [module].[ACTION_DESCRIPTION]
'advance-payments.NOT_FOUND'
'advance-payments.CREATE_FAILED'
'advance-payments.DEPARTMENT_NOT_FOUND'
'advance-payments.ALREADY_APPROVED'
'permission.FORBIDDEN'
'common.INTERNAL_ERROR'
```

**Exception Types:**
- `NotFoundException` (404): Resource not found
- `BadRequestException` (400): Validation or business logic failure
- `ForbiddenException` (403): Authorization failure (insufficient permissions)
- `UnauthorizedException` (401): Authentication failure (invalid/expired token)
- `ConflictException` (409): Resource conflict (e.g., duplicate entry)

**Error Handling Rules:**
- **Services:** Return `null` for not found, throw `NotFoundException` for related entities not found
- **Controllers:** Check for `null` and throw `NotFoundException`
- **Repositories:** Return `null` when not found (never throw)
- Always use i18n keys for error messages
- Preserve specific exceptions in catch blocks
- Log errors using NestJS Logger

**Acceptance:** All error handling follows these patterns

---

## NFR-4.12: Testing Pattern (hrsync-backend proven) ⭐

**Test File Structure:**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { AdvancePaymentsService } from '../services/advance-payments.service';
import { AdvancePaymentsRepository } from '../repositories/advance-payments.repository';

// Mock class-transformer
jest.mock('class-transformer', () => ({
  plainToInstance: jest.fn(),
  Expose: jest.fn(() => jest.fn()),
}));

describe('AdvancePaymentsService', () => {
  let service: AdvancePaymentsService;
  let mockRepository: jest.Mocked<AdvancePaymentsRepository>;
  let mockI18nService: jest.Mocked<I18nService>;

  const mockDomainId = 'domain-123';
  const mockStaffId = 'staff-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancePaymentsService,
        {
          provide: AdvancePaymentsRepository,
          useValue: {
            createAdvancePayment: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            t: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdvancePaymentsService>(AdvancePaymentsService);
    mockRepository = module.get(AdvancePaymentsRepository);
    mockI18nService = module.get(I18nService);

    mockI18nService.t.mockImplementation((key: string) => `translated.${key}`);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create advance payment successfully', async () => {
      // Arrange
      const createDto = { staffID: mockStaffId, amount: 1000 };
      const mockAdvancePayment = { id: 'payment-123', ...createDto };
      mockRepository.createAdvancePayment.mockResolvedValue(mockAdvancePayment);

      // Act
      const result = await service.create(createDto, mockDomainId);

      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.createAdvancePayment).toHaveBeenCalledWith({
        ...createDto,
        domainID: mockDomainId,
        status: AdvancePaymentStatus.PENDING,
      });
    });

    it('should throw NotFoundException when staff not found', async () => {
      // Arrange
      mockStaffService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto, mockDomainId)).rejects.toThrow(NotFoundException);
      expect(mockI18nService.t).toHaveBeenCalledWith('advance-payments.STAFF_NOT_FOUND');
    });
  });
});
```

**Testing Conventions:**
- **File location:** `__test__/` folder
- **File naming:** `[name].spec.ts`
- **Structure:** Arrange-Act-Assert (AAA) pattern
- **Mock naming:** Prefix with `mock` (`mockRepository`, `mockStaffService`)
- **Describe blocks:** Nest by method name
- **Test names:** Should describe expected behavior ("should create advance payment successfully")
- **Setup:** Use `beforeEach` for test module creation
- **Cleanup:** Use `afterEach` to clear mocks (`jest.clearAllMocks()`)
- **Mock class-transformer:** Always mock at top of file

**Acceptance:** All tests follow AAA pattern, proper mocking, descriptive names

---

## NFR-4.13: Documentation Standards (hrsync-backend proven) ⭐

**JSDoc Pattern:**
```typescript
/**
 * Creates a new resource
 *
 * Detailed description of what this method does, including
 * validation steps, side effects, and business logic flow.
 *
 * @param {CreateResourceDto} createDto - Resource creation data
 * @param {string} domainID - Domain identifier for multi-tenant isolation
 * @returns {Promise<ResourceResDto>} Created resource record
 * @throws {NotFoundException} When related entity not found
 * @throws {BadRequestException} When validation fails or domain mismatch
 *
 * @example
 * ```typescript
 * const resource = await service.create({
 *   name: 'Test Resource',
 *   relatedID: 'uuid-here'
 * }, 'domain-uuid');
 * ```
 */
async create(
  createDto: CreateResourceDto,
  domainID: string,
): Promise<ResourceResDto> {
  // Implementation
}
```

**Swagger/API Documentation:**
```typescript
@ApiTags('Resources')
@Controller('resources')
@ApiBearerAuth('JWT-auth')
export class ResourcesController {

  @Post()
  @ApiOperation({ summary: 'Create a new resource' })
  @ApiBody({ type: CreateResourceDto })
  @ApiCreatedResponse({
    description: 'Resource created successfully',
    type: createApiResponseClass(ResourceResDto),
  })
  @ApiBadRequestResponse({ type: ErrorApiResponseClass })
  @ApiUnauthorizedResponse({ type: ErrorApiResponseClass })
  @ApiForbiddenResponse({ type: ErrorApiResponseClass })
  create(@Body() createDto: CreateResourceDto) { }
}
```

**Documentation Conventions:**
- Add JSDoc to all public methods (services, repositories)
- Include: description, `@param`, `@returns`, `@throws`, `@example`
- Document complex logic with inline comments
- Document enum values with JSDoc
- Add class-level JSDoc for entities, services, controllers
- Use `@ApiTags` for Swagger grouping
- Use `@ApiOperation` for endpoint description
- Document all response types (`@ApiOkResponse`, `@ApiCreatedResponse`, etc.)
- Use factory functions for typed responses (`createApiResponseClass`, `createPaginatedApiResponseClass`)
- Include examples in `@ApiProperty` decorators

**Acceptance:** All public APIs documented with JSDoc and Swagger

---

## NFR-4.14: Additional Patterns (hrsync-backend proven)

**Multi-Tenancy Pattern:**
- Every entity has `domainID` column (type: uuid)
- All queries filter by `domainID` (`where: { id, domainID }`)
- Services always require `domainID` parameter
- Controllers extract `domainID` from `@CurrentUser` decorator
- Never trust domainID from request body (always from JWT)

**i18n (Internationalization) Pattern:**
- All user-facing messages use i18n keys
- Format: `module.ERROR_DESCRIPTION` (e.g., `advance-payments.NOT_FOUND`)
- Translations stored in `/src/i18n/[lang]/` folders
- Language detection via headers: `Accept-Language`, `X-Lang`, `lang`
- Fallback to default language if translation missing

**Event-Driven Pattern:**
```typescript
// Emit events (in services)
this.eventEmitter.emit(
  'resource.created',
  new ResourceCreatedEvent(resource, domainID, staffID),
);

// Listen to events (in event handlers)
@OnEvent('resource.created')
async handleResourceCreated(event: ResourceCreatedEvent) {
  // Handle event (send notification, update related entities, etc.)
  await this.notificationService.sendCreatedNotification(event);
}
```

**Permission Pattern:**
```typescript
// Simple permission check
@Permission('MODULE_NAME', ActionEnum.CREATE)

// Multiple permissions required (AND logic)
@RequirePermissions(['EMPLOYEE:VIEW', 'EMPLOYEE:CREATE'])

// Any permission required (OR logic)
@RequireAnyPermission(['EMPLOYEE:VIEW', 'DEPARTMENT:VIEW'])
```

**Acceptance:** All modules follow these additional patterns

---

## Summary: Key Principles from hrsync-backend

1. **Consistency:** Follow established patterns across all modules
2. **Type Safety:** Use TypeScript features extensively (interfaces, enums, generics)
3. **Documentation:** Comprehensive JSDoc and Swagger documentation
4. **Error Handling:** Consistent exception handling with i18n
5. **Multi-Tenancy:** Always include domain isolation (`domainID`)
6. **Testing:** Comprehensive unit tests with Arrange-Act-Assert
7. **Clean Code:** Use dependency injection, interfaces, separation of concerns
8. **API Standards:** Standardized response format for all endpoints
9. **Security:** JWT authentication, permission guards, input validation
10. **Maintainability:** Clear folder structure, naming conventions, code organization

---

**⭐ IMPORTANT: Bu dokümandaki TÜM pattern'ler hrsync-backend'de production-tested ve şirket standardıdır.**
