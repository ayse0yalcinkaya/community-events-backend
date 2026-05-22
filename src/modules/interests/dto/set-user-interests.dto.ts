import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsUUID } from 'class-validator';

export class SetUserInterestsDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  interestIds!: string[];
}
