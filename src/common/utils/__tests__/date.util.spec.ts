// Libraries
import { addDays, diffInMs, formatDate, toUTC } from '../date.util';

describe('date.util', () => {
  describe('formatDate', () => {
    // Use Date constructor with individual components for consistent local time
    const testDate = new Date(2025, 10, 6, 10, 30, 45, 123); // November 6, 2025, 10:30:45.123 local time

    it('should format date to ISO string', () => {
      const formatted = formatDate(testDate, 'ISO');
      expect(formatted).toBe(testDate.toISOString());
    });

    it('should format date to YYYY-MM-DD', () => {
      const formatted = formatDate(testDate, 'YYYY-MM-DD');
      expect(formatted).toBe('2025-11-06');
    });

    it('should format date to DD/MM/YYYY', () => {
      const formatted = formatDate(testDate, 'DD/MM/YYYY');
      expect(formatted).toBe('06/11/2025');
    });

    it('should format date to YYYY-MM-DD HH:mm:ss', () => {
      const formatted = formatDate(testDate, 'YYYY-MM-DD HH:mm:ss');
      expect(formatted).toBe('2025-11-06 10:30:45');
    });

    it('should default to ISO format for unknown format', () => {
      const formatted = formatDate(testDate, 'UNKNOWN_FORMAT');
      expect(formatted).toBe(testDate.toISOString());
    });

    it('should pad single digit months and days', () => {
      const date = new Date('2025-01-05T00:00:00Z');
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2025-01-05');
      expect(formatDate(date, 'DD/MM/YYYY')).toBe('05/01/2025');
    });
  });

  describe('toUTC', () => {
    it('should convert date to UTC', () => {
      const date = new Date('2025-11-06T10:30:00+03:00'); // Turkey time (UTC+3)
      const utcDate = toUTC(date);

      expect(utcDate.getUTCFullYear()).toBe(2025);
      expect(utcDate.getUTCMonth()).toBe(10); // November (0-indexed)
      expect(utcDate.getUTCDate()).toBe(6);
      expect(utcDate.getUTCHours()).toBe(7); // 10:30 UTC+3 = 07:30 UTC
      expect(utcDate.getUTCMinutes()).toBe(30);
    });

    it('should preserve UTC date when already UTC', () => {
      const date = new Date('2025-11-06T10:30:00Z');
      const utcDate = toUTC(date);

      expect(utcDate.getUTCHours()).toBe(10);
      expect(utcDate.getUTCMinutes()).toBe(30);
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2025-11-06T00:00:00Z');
      const utcDate = toUTC(date);

      expect(utcDate.getUTCHours()).toBe(0);
      expect(utcDate.getUTCMinutes()).toBe(0);
      expect(utcDate.getUTCSeconds()).toBe(0);
    });
  });

  describe('addDays', () => {
    it('should add positive days correctly', () => {
      const date = new Date('2025-11-06T10:30:00Z');
      const result = addDays(date, 7);

      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(10); // November
      expect(result.getUTCDate()).toBe(13);
    });

    it('should subtract days with negative number', () => {
      const date = new Date('2025-11-06T10:30:00Z');
      const result = addDays(date, -3);

      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(10); // November
      expect(result.getUTCDate()).toBe(3);
    });

    it('should handle month boundaries', () => {
      const date = new Date('2025-10-28T10:30:00Z'); // October 28
      const result = addDays(date, 5); // Should become November 2

      expect(result.getUTCMonth()).toBe(10); // November (0-indexed)
      expect(result.getUTCDate()).toBe(2);
    });

    it('should handle year boundaries', () => {
      const date = new Date('2025-12-30T10:30:00Z');
      const result = addDays(date, 5); // Should become January 4, 2026

      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCDate()).toBe(4);
    });

    it('should not mutate original date', () => {
      const date = new Date('2025-11-06T10:30:00Z');
      const originalTime = date.getTime();

      addDays(date, 7);

      expect(date.getTime()).toBe(originalTime);
    });

    it('should handle zero days', () => {
      const date = new Date('2025-11-06T10:30:00Z');
      const result = addDays(date, 0);

      expect(result.getTime()).toBe(date.getTime());
    });
  });

  describe('diffInMs', () => {
    it('should calculate difference in milliseconds', () => {
      const start = new Date('2025-11-06T10:00:00Z');
      const end = new Date('2025-11-06T10:30:00Z');

      const diff = diffInMs(start, end);
      expect(diff).toBe(30 * 60 * 1000); // 30 minutes = 1,800,000 ms
    });

    it('should return negative for reversed dates', () => {
      const start = new Date('2025-11-06T10:30:00Z');
      const end = new Date('2025-11-06T10:00:00Z');

      const diff = diffInMs(start, end);
      expect(diff).toBe(-30 * 60 * 1000); // -30 minutes
    });

    it('should return zero for same date', () => {
      const date = new Date('2025-11-06T10:30:00Z');
      const diff = diffInMs(date, date);
      expect(diff).toBe(0);
    });

    it('should calculate difference across days', () => {
      const start = new Date('2025-11-06T00:00:00Z');
      const end = new Date('2025-11-08T00:00:00Z');

      const diff = diffInMs(start, end);
      expect(diff).toBe(2 * 24 * 60 * 60 * 1000); // 2 days
    });

    it('should handle millisecond precision', () => {
      const start = new Date('2025-11-06T10:00:00.000Z');
      const end = new Date('2025-11-06T10:00:00.123Z');

      const diff = diffInMs(start, end);
      expect(diff).toBe(123);
    });
  });
});
