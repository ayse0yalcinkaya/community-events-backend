// Libraries
import * as crypto from 'crypto';

/**
 * Secret key for AES-256-GCM encryption
 * Uses environment variable AES_SECRET_KEY or generates a fixed key
 */
const SECRET_KEY = process.env.AES_SECRET_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Hash a password using AES-256-GCM encryption
 * Uses a secret key from environment (AES_SECRET_KEY, 32 bytes) or generates one
 * Returns a formatted string containing iv, content, and authTag
 *
 * @param password - Plain text password to hash
 * @returns Promise resolving to encrypted hash string
 *
 * @example
 * ```typescript
 * const hash = await hashPassword('MyPassword123!');
 * // Returns: base64 formatted string with iv:content:authTag
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(SECRET_KEY, 'hex'), iv);

  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Compare plain password with AES-256-GCM encrypted hash
 * Uses timing-safe comparison to prevent timing attacks
 *
 * @param password - Plain text password to verify
 * @param hash - AES-256-GCM hash string to compare against (format: iv:content:authTag)
 * @returns Promise resolving to true if match, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = await comparePassword('MyPassword123!', storedHash);
 * if (isValid) {
 *   // Password matches
 * } else {
 *   // Password does not match
 * }
 * ```
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    const [ivHex, encrypted, authTagHex] = hash.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(SECRET_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Use timing-safe comparison
    const a = Buffer.from(password);
    const b = Buffer.from(decrypted);

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  } catch (error) {
    return false;
  }
}
