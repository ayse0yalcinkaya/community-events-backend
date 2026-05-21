/**
 * Authentication provider types for multi-provider support.
 *
 * - AD: Active Directory authentication (future implementation)
 * - LOGIN: Phone/email + password authentication
 *
 * A user can have multiple providers linked to their account,
 * allowing them to authenticate via different methods.
 *
 * @example
 * // Creating a LOGIN provider
 * await prisma.userProvider.create({
 *   data: {
 *     userID: user.id,
 *     provider: AuthProviderEnum.LOGIN,
 *     identifier: user.phoneNumber,
 *     credentials: hashedPassword,
 *   },
 * });
 */
export enum AuthProviderEnum {
  AD = 'AD',
  LOGIN = 'LOGIN',
}
