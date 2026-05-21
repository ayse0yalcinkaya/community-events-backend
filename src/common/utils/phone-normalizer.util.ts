/**
 * Phone number normalization utility for Turkish phone numbers
 * Normalizes various phone number formats to E.164 format (+90XXXXXXXXXX)
 */

/**
 * Normalize Turkish phone numbers to +90 format
 * Removes spaces, handles various input formats, and ensures consistent storage
 *
 * @param phoneNumber - The phone number to normalize (string or number)
 * @returns Normalized phone number in E.164 format or original if invalid
 *
 * @example
 * normalizePhoneNumber('0565234566') // returns '+905652345566'
 * normalizePhoneNumber(5652345566) // returns '+905652345566'
 * normalizePhoneNumber('565 234 566') // returns '+905652345566'
 * normalizePhoneNumber('90 565 234 566') // returns '+905652345566'
 * normalizePhoneNumber('+90 565 234 566') // returns '+905652345566'
 */
export function normalizePhoneNumber(phoneNumber: string | number | null | undefined): string | null {
  // Return null for null/undefined inputs
  if (!phoneNumber) return null;

  // Convert to string if it's a number
  const phoneStr = typeof phoneNumber === 'number' ? phoneNumber.toString() : phoneNumber;

  // Remove all spaces, dashes, parentheses, and other non-digit characters except +
  const cleaned = phoneStr.replace(/[\s\-().]/g, '');

  // Return null for empty string after cleaning
  if (!cleaned) return null;

  // If it contains non-digit characters (except +), return original
  if (!/^[+]?\d+$/.test(cleaned)) return phoneStr;

  const trimmed = cleaned.trim();

  // Already in E.164 format with +90
  if (/^\+90\d{10}$/.test(trimmed)) return trimmed;

  // 0XXXXXXXXXX → +90XXXXXXXXXX (Turkish format with leading 0, 11 digits total)
  if (/^0\d{10}$/.test(trimmed)) return `+90${trimmed.slice(1)}`;

  // 10 digits starting with 5 → +90XXXXXXXXXX (Turkish mobile without country code)
  if (/^5\d{9}$/.test(trimmed)) return `+90${trimmed}`;

  // 90XXXXXXXXXX → +90XXXXXXXXXX (Turkish format without +, 12 digits total)
  if (/^90\d{10}$/.test(trimmed)) return `+${trimmed}`;

  // Other international formats starting with +
  if (trimmed.startsWith('+') && /^\+\d{10,15}$/.test(trimmed)) return trimmed;

  // Return original if no pattern matches
  return phoneStr;
}

/**
 * Validate if a phone number is in valid Turkish mobile format after normalization
 *
 * @param phoneNumber - The phone number to validate
 * @returns true if valid Turkish mobile number, false otherwise
 */
export function isValidTurkishMobile(phoneNumber: string | null | undefined): boolean {
  if (!phoneNumber) return false;

  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return false;

  // Check if it's a valid Turkish mobile number (+905XXXXXXXXX)
  return /^\+905\d{9}$/.test(normalized);
}
