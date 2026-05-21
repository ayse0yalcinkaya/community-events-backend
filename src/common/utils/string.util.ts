/**
 * Convert string to URL-safe slug
 * Converts to lowercase, replaces spaces with hyphens, removes special characters
 *
 * @param text - Input string to slugify
 * @returns URL-safe slug (lowercase, hyphens, alphanumeric only)
 *
 * @example
 * ```typescript
 * slugify('Hello World!');
 * // Returns: "hello-world"
 *
 * slugify('Product Name - 2025');
 * // Returns: "product-name-2025"
 *
 * slugify('Türkçe Karakterler İÇİN');
 * // Returns: "trkce-karakterler-iin"
 * ```
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars (keep alphanumeric, spaces, hyphens)
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Truncate string to maximum length with ellipsis
 * Adds '...' if string exceeds maxLength
 *
 * @param text - Input string to truncate
 * @param maxLength - Maximum length (including ellipsis)
 * @returns Truncated string with ellipsis if needed
 *
 * @example
 * ```typescript
 * truncate('This is a very long text that needs truncation', 20);
 * // Returns: "This is a very lo..."
 *
 * truncate('Short text', 20);
 * // Returns: "Short text" (unchanged - under maxLength)
 *
 * truncate('Exactly 20 chars!!!', 20);
 * // Returns: "Exactly 20 chars!!!" (no truncation at exactly maxLength)
 * ```
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter of string
 * Converts first character to uppercase, rest remains unchanged
 *
 * @param text - Input string to capitalize
 * @returns String with first letter capitalized
 *
 * @example
 * ```typescript
 * capitalize('hello world');
 * // Returns: "Hello world"
 *
 * capitalize('HELLO WORLD');
 * // Returns: "HELLO WORLD" (only first letter affected)
 *
 * capitalize('');
 * // Returns: "" (empty string unchanged)
 * ```
 */
export function capitalize(text: string): string {
  if (!text) {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Remove all special characters from string
 * Keeps only alphanumeric characters (a-z, A-Z, 0-9)
 *
 * @param text - Input string
 * @returns String with only alphanumeric characters
 *
 * @example
 * ```typescript
 * removeSpecialChars('Hello, World! 123');
 * // Returns: "HelloWorld123"
 *
 * removeSpecialChars('user@email.com');
 * // Returns: "useremailcom"
 *
 * removeSpecialChars('Price: $19.99');
 * // Returns: "Price1999"
 * ```
 */
export function removeSpecialChars(text: string): string {
  return text.replace(/[^a-zA-Z0-9]/g, '');
}
