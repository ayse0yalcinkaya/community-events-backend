/**
 * Phone Number Validation Utility
 *
 * This utility provides functions for validating and formatting phone numbers
 * according to international standards (E.164 format).
 *
 * @example
 * ```typescript
 * import { isPhoneNumber, formatPhoneNumber } from './phone-validator.util';
 *
 * const isValid = isPhoneNumber('+905551234567'); // true
 * const formatted = formatPhoneNumber('05551234567', 'TR'); // '+905551234567'
 * ```
 */

/**
 * Validates if a string is a valid phone number
 *
 * Checks against international phone number format (E.164):
 * - Starts with optional '+' sign
 * - Followed by country code (1-3 digits)
 * - Followed by national number (up to 15 digits total)
 * - No special characters except spaces, hyphens, and parentheses (which are stripped)
 *
 * @param identifier - The string to validate as a phone number
 * @returns boolean - True if the identifier is a valid phone number format
 *
 * @example
 * ```typescript
 * isPhoneNumber('+905551234567') // true
 * isPhoneNumber('905551234567')  // true
 * isPhoneNumber('+1234567890123456') // false (too long)
 * isPhoneNumber('invalid-phone') // false
 * ```
 */
export function isPhoneNumber(identifier: string): boolean {
  if (!identifier || typeof identifier !== 'string') return false;

  // Remove common formatting characters (spaces, hyphens, parentheses)
  const cleanedNumber = identifier.replace(/[\s\-()]/g, '');

  // E.164 format: + followed by up to 15 digits, starting with country code (1-9)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;

  return phoneRegex.test(cleanedNumber);
}

/**
 * Validates if a string is a valid email address
 *
 * Uses a comprehensive regex pattern that covers most valid email formats
 * according to RFC 5322 specification.
 *
 * @param identifier - The string to validate as an email address
 * @returns boolean - True if the identifier is a valid email format
 *
 * @example
 * ```typescript
 * isEmailAddress('user@example.com') // true
 * isEmailAddress('invalid-email') // false
 * isEmailAddress('user@') // false
 * ```
 */
export function isEmailAddress(identifier: string): boolean {
  if (!identifier || typeof identifier !== 'string') return false;

  // RFC 5322 compliant email regex (simplified but comprehensive)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(identifier);
}

/**
 * Formats a phone number to E.164 international format
 *
 * Adds country code prefix if missing and formats the number
 * to international standard (+CountryCodeNationalNumber).
 *
 * @param phoneNumber - The phone number to format
 * @param defaultCountryCode - Default country code to use if none provided (default: '90' for Turkey)
 * @returns string - Formatted phone number in E.164 format
 *
 * @example
 * ```typescript
 * formatPhoneNumber('05551234567', '90') // '+905551234567'
 * formatPhoneNumber('905551234567') // '+905551234567'
 * formatPhoneNumber('+905551234567') // '+905551234567'
 * ```
 */
export function formatPhoneNumber(phoneNumber: string, defaultCountryCode: string = '90'): string {
  if (!phoneNumber) return phoneNumber;

  // Remove all non-digit characters except the leading +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // If it already starts with +, return as is (assuming it's already formatted)
  if (cleaned.startsWith('+')) return cleaned;

  // If it starts with the country code, add the + prefix
  if (cleaned.startsWith(defaultCountryCode)) return `+${cleaned}`;

  // If it starts with 0 (national format), replace 0 with country code
  if (cleaned.startsWith('0')) return `+${defaultCountryCode}${cleaned.substring(1)}`;

  // Otherwise, assume it's a national number and add country code
  return `+${defaultCountryCode}${cleaned}`;
}

/**
 * Determines the type of identifier (phone or email)
 *
 * Analyzes the given identifier and returns its type based on format validation.
 *
 * @param identifier - The identifier to analyze
 * @returns 'phone' | 'email' | 'unknown' - The detected identifier type
 *
 * @example
 * ```typescript
 * getIdentifierType('+905551234567') // 'phone'
 * getIdentifierType('user@example.com') // 'email'
 * getIdentifierType('invalid') // 'unknown'
 * ```
 */
export function getIdentifierType(identifier: string): 'phone' | 'email' | 'unknown' {
  if (isPhoneNumber(identifier)) return 'phone';

  if (isEmailAddress(identifier)) return 'email';

  return 'unknown';
}
