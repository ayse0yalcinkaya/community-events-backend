// Libraries
import { IsUUID, IsNotEmpty } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RefreshTokenDto {
  @IsUUID(4, { message: i18nValidationMessage('validation.IS_UUID') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  refreshToken!: string; // UUID format: 550e8400-e29b-41d4-a716-446655440000
}
