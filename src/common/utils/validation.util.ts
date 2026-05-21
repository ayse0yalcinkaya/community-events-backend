/**
 * Validate Turkish phone number format
 * Expects E.164 format: +90XXXXXXXXXX (10 digits after country code)
 *
 * @param phone - Phone number string to validate
 * @param countryCode - Country code (default: '+90' for Turkey)
 * @returns true if valid Turkish phone format, false otherwise
 *
 * @example
 * ```typescript
 * isValidPhone('+905551234567');
 * // Returns: true (valid Turkish mobile)
 *
 * isValidPhone('05551234567');
 * // Returns: false (missing country code)
 *
 * isValidPhone('+90555123456');
 * // Returns: false (only 9 digits after country code)
 *
 * isValidPhone('+905551234567', '+90');
 * // Returns: true (explicitly specify country code)
 * ```
 */
export function isValidPhone(phone: string, countryCode: string = '+90'): boolean {
  // Turkish phone format: +90XXXXXXXXXX (country code + 10 digits)
  const phoneRegex = /^\+90\d{10}$/;
  return phoneRegex.test(phone);
}

/**
 * Check if password meets strong password requirements
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 number (0-9)
 * - At least 1 special character (!@#$%^&*(),.?":{}|<>)
 *
 * @param password - Password string to validate
 * @returns true if password meets all requirements, false otherwise
 *
 * @example
 * ```typescript
 * isStrongPassword('Test1234!');
 * // Returns: true (meets all requirements)
 *
 * isStrongPassword('weak');
 * // Returns: false (too short, no uppercase, no number, no special char)
 *
 * isStrongPassword('NoNumbers!');
 * // Returns: false (no numbers)
 *
 * isStrongPassword('noUppercase123!');
 * // Returns: false (no uppercase)
 *
 * isStrongPassword('NoSpecialChar123');
 * // Returns: false (no special character)
 * ```
 */
export function isStrongPassword(password: string): boolean {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}

/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and script content
 * - Strips all <script> tags and their content
 * - Removes all HTML tags (<tag>)
 *
 * @param input - User input string to sanitize
 * @returns Sanitized string without HTML/script tags
 *
 * @example
 * ```typescript
 * sanitizeInput('<script>alert("XSS")</script>Hello');
 * // Returns: "Hello"
 *
 * sanitizeInput('<img src=x onerror="alert(1)">');
 * // Returns: ""
 *
 * sanitizeInput('Normal text <b>with</b> tags');
 * // Returns: "Normal text with tags"
 *
 * sanitizeInput('Safe text without tags');
 * // Returns: "Safe text without tags"
 * ```
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/<[^>]+>/g, ''); // Remove all HTML tags
}
