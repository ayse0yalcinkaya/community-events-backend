/**
 * JWT Payload Interface
 * Phone-based authentication - phoneNumber is the primary identifier
 */
export interface JwtPayload {
  /**
   * User ID (UUID)
   * The subject of the token - identifies the user
   */
  sub: string;

  /**
   * Phone number (E.164 format: +90XXXXXXXXXX)
   * Primary identifier for phone-based authentication
   */
  phoneNumber: string;

  /**
   * User roles
   * Array of role strings: ['admin', 'staff', 'manager']
   */
  roles: string[];

  /**
   * User type
   * ADMIN or USER - determines role hierarchy access
   */
  userType: string;

  /**
   * Issued at (Unix timestamp)
   * When the token was created
   */
  iat: number;

  /**
   * Expiration (Unix timestamp)
   * When the token expires
   */
  exp: number;
}
