// DTOs
import { AuthUserResDto } from './user-res.dto';
export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: AuthUserResDto;
  expiresIn!: number; // seconds
}
