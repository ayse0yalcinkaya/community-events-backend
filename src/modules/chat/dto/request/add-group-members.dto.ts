import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class AddGroupMembersDto {
  @ApiProperty({ type: () => [String], description: 'IDs of users to add to the group.' })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @ArrayMinSize(1, { message: i18nValidationMessage('validation.ARRAY_MIN_SIZE') })
  @IsUUID(4, { each: true, message: i18nValidationMessage('validation.IS_UUID') })
  memberIDs!: string[];
}
