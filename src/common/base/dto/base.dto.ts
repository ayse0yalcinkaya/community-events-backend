/**
 * Base DTO class providing common DTO functionality
 * All DTOs should extend this class or its specialized variants
 *
 * @example
 * ```typescript
 * export class UserDto extends BaseDto {
 *   @ApiProperty()
 *   @IsString()
 *   email: string;
 * }
 * ```
 */
export abstract class BaseDto {
  /**
   * Base constructor for DTOs
   * Can be extended by child classes for initialization logic
   */
  constructor(partial?: Partial<BaseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
