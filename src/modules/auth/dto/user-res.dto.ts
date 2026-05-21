// Libraries
import { Exclude } from 'class-transformer';
export class AuthUserResDto {
  id!: string;
  phoneNumber!: string;
  firstName!: string;
  lastName!: string;
  email?: string;
  role!: string;
  isActive!: boolean;
  phoneVerified!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  @Exclude()
  deletedAt?: Date;
}
