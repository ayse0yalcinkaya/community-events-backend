// Libraries
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsUUID } from 'class-validator';
export class SetUserInterestsDto {
  @ArrayMinSize(3, { message: 'At least 3 interests are required' })
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  interestIds!: string[];
}
