/**
 * Splits a full name string into first and last name components.
 *
 * This function separates a full name into two parts:
 * - `first_name`: all words except the last one
 * - `last_name`: the last word in the full name
 *
 * If only one word is provided, it is treated as the last name,
 * and the first name is set to `"-"` as a placeholder.
 *
 * ## Examples
 * ```ts
 * splitName("John Doe");            // { first_name: "John", last_name: "Doe" }
 * splitName("Alice Mary Johnson");  // { first_name: "Alice Mary", last_name: "Johnson" }
 * splitName("Tolga");               // { first_name: "-", last_name: "Tolga" }
 * ```
 *
 * @param full - The full name string to be split (e.g. "John Doe").
 * @returns An object with `first_name` and `last_name` properties.
 */
export function splitName(full: string): { first_name: string; last_name: string } {
  // Trim whitespace and split the full name by any number of spaces
  const parts = full.trim().split(/\s+/);

  return {
    // The last part is assumed to be the last name
    last_name: parts.pop()! || '-',

    // Remaining parts are joined back to form the first name
    first_name: parts.join(' ') || '-',
  };
}
