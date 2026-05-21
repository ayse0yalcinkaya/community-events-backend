/**
 * Date parsing utilities for handling multiple date formats
 * Supports Turkish date formats (DD.MM.YYYY, DD/MM/YYYY) and ISO format (YYYY-MM-DD)
 */

/**
 * Parse date from multiple formats commonly used in Turkey
 * Supports: DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD, and Excel date numbers
 *
 * @param dateInput - Date string or number from Excel
 * @returns Date object or null if invalid
 */
export function parseFlexibleDate(dateInput: any): Date | null {
  if (!dateInput) return null;

  // Handle Excel date numbers (days since 1900-01-01)
  if (typeof dateInput === 'number') {
    // Excel date serial number (1 = 1900-01-01, but Excel incorrectly treats 1900 as leap year)
    const excelEpoch = new Date(1899, 11, 30); // 1899-12-30 (Excel's epoch adjusted for leap year bug)
    const date = new Date(excelEpoch.getTime() + dateInput * 24 * 60 * 60 * 1000);
    return isValidDate(date) ? date : null;
  }

  // Convert to string and clean up
  const dateStr = String(dateInput).trim();
  if (!dateStr) return null;

  // Try different date formats
  const formats = [
    // Turkish formats (DD.MM.YYYY, DD/MM/YYYY)
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY

    // ISO format (YYYY-MM-DD)
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD

    // Alternative formats
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{1,2}) (\d{1,2}) (\d{4})$/, // DD MM YYYY (space separated)
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let day: number, month: number, year: number;

      // Determine if it's ISO format (YYYY-MM-DD) or Turkish format (DD.MM.YYYY)
      if (format.source.startsWith('^(\\d{4})')) {
        // ISO format: YYYY-MM-DD
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
      } else {
        // Turkish format: DD.MM.YYYY or DD/MM/YYYY
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
      }

      // Validate ranges
      if (year < 1900 || year > 2100) continue;
      if (month < 1 || month > 12) continue;
      if (day < 1 || day > 31) continue;

      // Create date (month is 0-indexed in JavaScript)
      const date = new Date(year, month - 1, day);

      // Verify the date is valid and matches input (handles invalid dates like 31.02.2024)
      if (isValidDate(date) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day)
        return date;
    }
  }

  // Try native Date parsing as fallback
  try {
    const date = new Date(dateStr);
    return isValidDate(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Check if a date object is valid
 * @param date - Date object to validate
 * @returns true if date is valid
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Format date to Turkish format (DD.MM.YYYY)
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateTurkish(date: Date): string {
  if (!isValidDate(date)) return '';

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

/**
 * Format date to ISO format (YYYY-MM-DD)
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateISO(date: Date): string {
  if (!isValidDate(date)) return '';
  return date.toISOString().split('T')[0];
}

/**
 * Validate if a date string matches expected Turkish formats
 * @param dateStr - Date string to validate
 * @returns true if format is valid
 */
export function isValidTurkishDateFormat(dateStr: string): boolean {
  if (!dateStr) return false;

  const turkishFormats = [
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
  ];

  return turkishFormats.some((format) => format.test(dateStr.trim()));
}
