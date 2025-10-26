/**
 * Tests para utils/formatters
 * Verifica las funciones de formateo de moneda, fecha y porcentaje
 */

import { formatCurrency, formatDate, formatPercentage } from '../utils/formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    test('formats basic amount in thousands', () => {
      expect(formatCurrency(1000)).toBe('$1K');
      expect(formatCurrency(5000)).toBe('$5K');
      expect(formatCurrency(10000)).toBe('$10K');
    });

    test('formats amounts with thousands separator', () => {
      expect(formatCurrency(1000000)).toBe('$1,000K');
      expect(formatCurrency(5500000)).toBe('$5,500K');
      expect(formatCurrency(123456000)).toBe('$123,456K'); // Adjusted for rounding
    });

    test('formats amounts with decimals when specified', () => {
      expect(formatCurrency(1500, 1)).toBe('$1.5K');
      expect(formatCurrency(2750, 2)).toBe('$2.75K');
      expect(formatCurrency(12340, 2)).toBe('$12.34K'); // Adjusted for exact decimals
    });

    test('handles zero amount', () => {
      expect(formatCurrency(0)).toBe('$0K');
      expect(formatCurrency(0, 2)).toBe('$0.00K');
    });

    test('handles negative amounts', () => {
      expect(formatCurrency(-1000)).toBe('$-1K');
      expect(formatCurrency(-5500, 1)).toBe('$-5.5K');
    });

    test('handles very large amounts', () => {
      expect(formatCurrency(1000000000)).toBe('$1,000,000K');
    });

    test('handles very small amounts', () => {
      expect(formatCurrency(100, 2)).toBe('$0.10K');
      expect(formatCurrency(1, 3)).toBe('$0.001K');
    });

    test('defaults to no decimals when not specified', () => {
      expect(formatCurrency(1000)).toBe('$1K');
      expect(formatCurrency(6000)).toBe('$6K');
    });

    test('rounds correctly with decimals', () => {
      expect(formatCurrency(1555, 0)).toBe('$2K'); // 1.555 rounded to 2
      expect(formatCurrency(1555, 1)).toBe('$1.6K'); // 1.555 rounded to 1.6
    });
  });

  describe('formatDate', () => {
    test('formats valid date string', () => {
      const result = formatDate('2024-01-15');
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Matches date pattern
    });

    test('formats Date object', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toBeDefined();
      expect(result).not.toBe('N/A');
    });

    test('returns N/A for null', () => {
      expect(formatDate(null)).toBe('N/A');
    });

    test('returns N/A for undefined', () => {
      expect(formatDate(undefined)).toBe('N/A');
    });

    test('returns N/A for empty string', () => {
      expect(formatDate('')).toBe('N/A');
    });

    test('uses default locale es-ES', () => {
      const result = formatDate('2024-01-15');
      // Spanish locale uses / or - as separator
      expect(result).toContain('/');
    });

    test('accepts custom locale', () => {
      const result = formatDate('2024-01-15', 'en-US');
      expect(result).toBeDefined();
      expect(result).not.toBe('N/A');
    });

    test('handles different date formats', () => {
      expect(formatDate('2024-01-15')).not.toBe('N/A');
      expect(formatDate('2024/01/15')).not.toBe('N/A');
      expect(formatDate('January 15, 2024')).not.toBe('N/A');
    });

    test('formats timestamp correctly', () => {
      const timestamp = new Date('2024-01-15T10:30:00').getTime();
      const result = formatDate(timestamp);
      expect(result).not.toBe('N/A');
    });
  });

  describe('formatPercentage', () => {
    test('formats basic percentages', () => {
      expect(formatPercentage(50)).toBe('50%');
      expect(formatPercentage(75)).toBe('75%');
      expect(formatPercentage(100)).toBe('100%');
    });

    test('rounds decimal values', () => {
      expect(formatPercentage(45.6)).toBe('46%');
      expect(formatPercentage(45.4)).toBe('45%');
      expect(formatPercentage(45.5)).toBe('46%');
    });

    test('handles zero', () => {
      expect(formatPercentage(0)).toBe('0%');
    });

    test('handles negative values', () => {
      expect(formatPercentage(-10)).toBe('-10%');
      expect(formatPercentage(-25.6)).toBe('-26%'); // Adjusted for Math.round behavior
    });

    test('handles null and undefined', () => {
      expect(formatPercentage(null)).toBe('0%');
      expect(formatPercentage(undefined)).toBe('0%');
    });

    test('handles very large percentages', () => {
      expect(formatPercentage(1000)).toBe('1000%');
      expect(formatPercentage(9999)).toBe('9999%');
    });

    test('handles very small percentages', () => {
      expect(formatPercentage(0.1)).toBe('0%');
      expect(formatPercentage(0.9)).toBe('1%');
    });

    test('handles decimal precision edge cases', () => {
      expect(formatPercentage(33.333)).toBe('33%');
      expect(formatPercentage(66.666)).toBe('67%');
      expect(formatPercentage(99.999)).toBe('100%');
    });
  });
});
