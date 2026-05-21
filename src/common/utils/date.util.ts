/**
 * Format date to string using specified format
 * Supports common format patterns
 *
 * @param date - Date object to format
 * @param format - Format string ('ISO', 'YYYY-MM-DD', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss')
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * const date = new Date('2025-11-06T10:30:00Z');
 *
 * formatDate(date, 'ISO');
 * // Returns: "2025-11-06T10:30:00.000Z"
 *
 * formatDate(date, 'YYYY-MM-DD');
 * // Returns: "2025-11-06"
 *
 * formatDate(date, 'DD/MM/YYYY');
 * // Returns: "06/11/2025"
 *
 * formatDate(date, 'YYYY-MM-DD HH:mm:ss');
 * // Returns: "2025-11-06 10:30:00"
 * ```
 */
export function formatDate(date: Date, format: string): string {
  if (format === 'ISO') {
    return date.toISOString();
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    default:
      return date.toISOString();
  }
}

/**
 * Convert date to UTC timezone
 * Returns new Date object in UTC
 *
 * @param date - Date object to convert
 * @returns New Date object in UTC timezone
 *
 * @example
 * ```typescript
 * const localDate = new Date('2025-11-06T10:30:00+03:00'); // Turkey time (UTC+3)
 * const utcDate = toUTC(localDate);
 * // Returns: Date object representing "2025-11-06T07:30:00Z"
 * ```
 */
export function toUTC(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

/**
 * Add or subtract days from a date
 * Returns new Date object (does not mutate original)
 *
 * @param date - Base date
 * @param days - Number of days to add (positive) or subtract (negative)
 * @returns New Date object with days added
 *
 * @example
 * ```typescript
 * const today = new Date('2025-11-06');
 *
 * addDays(today, 7);
 * // Returns: Date object for "2025-11-13"
 *
 * addDays(today, -3);
 * // Returns: Date object for "2025-11-03"
 * ```
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate difference between two dates in milliseconds
 *
 * @param start - Start date
 * @param end - End date
 * @returns Difference in milliseconds (end - start)
 *
 * @example
 * ```typescript
 * const start = new Date('2025-11-06T10:00:00Z');
 * const end = new Date('2025-11-06T10:30:00Z');
 *
 * diffInMs(start, end);
 * // Returns: 1800000 (30 minutes = 30 * 60 * 1000 ms)
 *
 * // Convert to seconds
 * const diffSeconds = diffInMs(start, end) / 1000; // 1800
 *
 * // Convert to minutes
 * const diffMinutes = diffInMs(start, end) / (1000 * 60); // 30
 * ```
 */
export function diffInMs(start: Date, end: Date): number {
  return end.getTime() - start.getTime();
}
