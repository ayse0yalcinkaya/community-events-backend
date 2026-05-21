/**
 * Turkish National ID (TC Kimlik No) Validation Utility
 *
 * Provides validation functions for Turkish National ID numbers
 * following the official algorithm used by the Turkish government.
 */

/**
 * Validates Turkish National ID format and checksum
 *
 * Turkish National ID Rules:
 * - Must be 11 digits
 * - Cannot start with 0
 * - Cannot be all same digits
 * - Must pass checksum validation
 *
 * @param tc - Turkish National ID to validate
 * @returns boolean - True if valid TC number
 *
 * @example
 * ```typescript
 * validateTurkishID('12345678901'); // false (invalid checksum)
 * validateTurkishID('10000000146'); // true (valid)
 * validateTurkishID('00000000000'); // false (starts with 0)
 * ```
 */
export function validateTurkishID(tc: string): boolean {
  // Remove any whitespace or special characters
  const cleanTC = tc.replace(/\D/g, '');

  // Must be exactly 11 digits
  if (cleanTC.length !== 11) return false;

  // Cannot start with 0
  if (cleanTC[0] === '0') return false;

  // Cannot be all same digits
  if (new Set(cleanTC).size === 1) return false;

  // Convert to array of numbers
  const digits = cleanTC.split('').map(Number);

  // Calculate first checksum (10th digit)
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const checksum1 = (oddSum * 7 - evenSum) % 10;

  if (checksum1 !== digits[9]) return false;

  // Calculate second checksum (11th digit)
  const totalSum = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0);
  const checksum2 = totalSum % 10;

  return checksum2 === digits[10];
}

/**
 * Extracts and validates TC numbers from text
 *
 * @param text - Text content to search for TC numbers
 * @returns string[] - Array of valid TC numbers found
 *
 * @example
 * ```typescript
 * const text = 'Employee TC: 10000000146 and manager TC: 20000000230';
 * extractValidTCNumbers(text); // ['10000000146', '20000000230']
 * ```
 */
export function extractValidTCNumbers(text: string): string[] {
  // Regular expression to find 11-digit sequences
  const tcPattern = /\b\d{11}\b/g;
  const potentialTCs = text.match(tcPattern) || [];

  // Validate each potential TC number
  return potentialTCs.filter((tc) => validateTurkishID(tc));
}

/**
 * Formats TC number for display (adds spaces for readability)
 *
 * @param tc - TC number to format
 * @returns string - Formatted TC number
 *
 * @example
 * ```typescript
 * formatTurkishID('10000000146'); // '100 000 001 46'
 * ```
 */
export function formatTurkishID(tc: string): string {
  const cleanTC = tc.replace(/\D/g, '');

  if (cleanTC.length !== 11) {
    return tc; // Return as-is if not valid length
  }

  return `${cleanTC.slice(0, 3)} ${cleanTC.slice(3, 6)} ${cleanTC.slice(6, 9)} ${cleanTC.slice(9)}`;
}

/**
 * Cleans and normalizes TC number input
 *
 * @param tc - Raw TC input
 * @returns string - Cleaned TC number (digits only)
 *
 * @example
 * ```typescript
 * cleanTurkishID('100-000-001-46'); // '10000000146'
 * cleanTurkishID('100 000 001 46'); // '10000000146'
 * ```
 */
export function cleanTurkishID(tc: string): string {
  return tc.replace(/\D/g, '');
}

/**
 * Validates and normalizes TC number
 *
 * @param tc - TC number to validate and clean
 * @returns { valid: boolean; tc: string; error?: string } - Validation result
 *
 * @example
 * ```typescript
 * validateAndCleanTurkishID('10000000146'); // { valid: true, tc: '10000000146' }
 * validateAndCleanTurkishID('invalid'); // { valid: false, tc: '', error: 'Invalid format' }
 * ```
 */
export function validateAndCleanTurkishID(tc: string): {
  valid: boolean;
  tc: string;
  error?: string;
} {
  if (!tc || typeof tc !== 'string') {
    return {
      valid: false,
      tc: '',
      error: 'TC number is required and must be a string',
    };
  }

  const cleanTC = cleanTurkishID(tc);

  if (cleanTC.length === 0) {
    return {
      valid: false,
      tc: '',
      error: 'TC number cannot be empty',
    };
  }

  if (cleanTC.length !== 11) {
    return {
      valid: false,
      tc: cleanTC,
      error: 'TC number must be exactly 11 digits',
    };
  }

  if (!validateTurkishID(cleanTC)) {
    return {
      valid: false,
      tc: cleanTC,
      error: 'Invalid TC number checksum',
    };
  }

  return {
    valid: true,
    tc: cleanTC,
  };
}
