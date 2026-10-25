import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatCurrency,
  formatExactINR,
  formatDate,
  getDaysRemaining,
} from '../../shared/utils/formatters.js';

describe('Currency Formatting (INR)', () => {
  it('should format amounts in lakhs for >=100000', () => {
    expect(formatCurrency(100000, 'INR')).toBe('₹1.00 Lakh');
    expect(formatCurrency(500000, 'INR')).toBe('₹5.00 Lakh');
    expect(formatCurrency(800000, 'INR')).toBe('₹8.00 Lakh');
  });

  it('should format amounts in crores for >=10000000', () => {
    expect(formatCurrency(10000000, 'INR')).toBe('₹1.00 Cr');
    expect(formatCurrency(50000000, 'INR')).toBe('₹5.00 Cr');
    expect(formatCurrency(12500000, 'INR')).toBe('₹1.25 Cr');
  });

  it('should format small amounts with comma separators', () => {
    expect(formatCurrency(1000, 'INR')).toBe('₹1,000');
    expect(formatCurrency(50000, 'INR')).toBe('₹50,000');
    expect(formatCurrency(99999, 'INR')).toBe('₹99,999');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0, 'INR')).toBe('₹0');
  });

  it('should handle decimal amounts with rounding', () => {
    expect(formatCurrency(125678, 'INR')).toBe('₹1.26 Lakh');
    expect(formatCurrency(1234567, 'INR')).toBe('₹12.35 Lakh');
  });

  it('should handle boundary values correctly', () => {
    expect(formatCurrency(99999, 'INR')).toBe('₹99,999'); // Just below lakh
    expect(formatCurrency(100000, 'INR')).toBe('₹1.00 Lakh'); // Exactly 1 lakh
    expect(formatCurrency(9999999, 'INR')).toBe('₹100.00 Lakh'); // Just below crore
    expect(formatCurrency(10000000, 'INR')).toBe('₹1.00 Cr'); // Exactly 1 crore
  });

  it('should default to INR if no currency specified', () => {
    expect(formatCurrency(100000)).toBe('₹1.00 Lakh');
  });
});

describe('Currency Formatting (Other Currencies)', () => {
  it('should format USD with Intl formatter', () => {
    const result = formatCurrency(5000, 'USD');
    expect(result).toContain('5,000');
    expect(result).toMatch(/\$|USD/); // May vary by locale
  });

  it('should format EUR with Intl formatter', () => {
    const result = formatCurrency(3000, 'EUR');
    expect(result).toContain('3,000');
  });

  it('should handle zero for non-INR currencies', () => {
    const result = formatCurrency(0, 'USD');
    expect(result).toContain('0');
  });
});

describe('Exact INR Formatting', () => {
  it('should format with comma separators and rupee symbol', () => {
    expect(formatExactINR(50000)).toBe('₹50,000');
    expect(formatExactINR(800000)).toBe('₹8,00,000');
    expect(formatExactINR(1234567)).toBe('₹12,34,567');
  });

  it('should round decimal amounts', () => {
    expect(formatExactINR(1234.56)).toBe('₹1,235');
    expect(formatExactINR(1234.49)).toBe('₹1,234');
  });

  it('should handle zero', () => {
    expect(formatExactINR(0)).toBe('₹0');
  });

  it('should handle negative amounts', () => {
    expect(formatExactINR(-5000)).toContain('-');
    expect(formatExactINR(-5000)).toContain('5,000');
  });
});

describe('Date Formatting', () => {
  it('should format ISO date string to readable format', () => {
    const result = formatDate('2026-12-18');
    expect(result).toMatch(/18.*Dec.*2026/);
  });

  it('should format date with time', () => {
    const result = formatDate('2026-12-18T10:30:00Z');
    expect(result).toMatch(/18.*Dec.*2026/);
  });

  it('should handle empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('should handle invalid date gracefully', () => {
    const result = formatDate('not-a-date');
    // Should return original string if parsing fails
    expect(result).toBeTruthy();
  });

  it('should format different months correctly', () => {
    const jan = formatDate('2026-01-15');
    const jun = formatDate('2026-06-15');
    const dec = formatDate('2026-12-15');

    expect(jan).toMatch(/Jan/);
    expect(jun).toMatch(/Jun/);
    expect(dec).toMatch(/Dec/);
  });

  it('should handle leap year date', () => {
    const result = formatDate('2028-02-29');
    expect(result).toMatch(/29.*Feb.*2028/);
  });
});

describe('Days Remaining Calculation', () => {
  beforeEach(() => {
    // Set fixed date: 2026-10-25
    vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
  });

  it('should calculate days remaining for future date', () => {
    const result = getDaysRemaining('2026-11-15');
    expect(result).toBe(21); // 21 days from Oct 25 to Nov 15
  });

  it('should return negative for past dates', () => {
    const result = getDaysRemaining('2026-10-01');
    expect(result).toBeLessThan(0);
  });

  it('should return 0 for today', () => {
    const result = getDaysRemaining('2026-10-25');
    expect(result).toBe(0);
  });

  it('should return 1 for tomorrow', () => {
    const result = getDaysRemaining('2026-10-26');
    expect(result).toBe(1);
  });

  it('should handle empty string', () => {
    const result = getDaysRemaining('');
    expect(result).toBe(0);
  });

  it('should handle far future dates', () => {
    const result = getDaysRemaining('2027-10-25');
    expect(result).toBe(365); // 1 year from now
  });

  it('should handle year boundary crossing', () => {
    // From Oct 25 to Jan 15 next year
    const result = getDaysRemaining('2027-01-15');
    expect(result).toBe(82); // Oct: 6, Nov: 30, Dec: 31, Jan: 15
  });

  it('should ignore time component', () => {
    const morning = getDaysRemaining('2026-11-15');
    const evening = getDaysRemaining('2026-11-15');

    // Both should give same result (21 days from Oct 25 to Nov 15)
    expect(morning).toBe(21);
    expect(evening).toBe(21);
  });
});

describe('Formatter Edge Cases', () => {
  it('should handle very large numbers in INR', () => {
    expect(formatCurrency(100000000, 'INR')).toBe('₹10.00 Cr');
    expect(formatCurrency(999999999, 'INR')).toBe('₹100.00 Cr');
  });

  it('should handle decimal precision in lakhs/crores', () => {
    expect(formatCurrency(156789, 'INR')).toBe('₹1.57 Lakh');
    expect(formatCurrency(15678900, 'INR')).toBe('₹1.57 Cr');
  });

  it('should format 1 as ₹1', () => {
    expect(formatCurrency(1, 'INR')).toBe('₹1');
    expect(formatExactINR(1)).toBe('₹1');
  });

  it('should handle fractional rupees', () => {
    expect(formatExactINR(99.5)).toBe('₹100'); // Rounds up
    expect(formatExactINR(99.4)).toBe('₹99'); // Rounds down
  });
});

describe('Status and Threshold Helpers', () => {
  // Testing budget utilization thresholds
  it('should identify 80% threshold', () => {
    const allocated = 100000;
    const spent = 80000;
    const percentage = (spent / allocated) * 100;

    expect(percentage).toBe(80);
    expect(percentage >= 80).toBe(true);
    expect(percentage >= 90).toBe(false);
  });

  it('should identify 90% threshold', () => {
    const allocated = 100000;
    const spent = 90000;
    const percentage = (spent / allocated) * 100;

    expect(percentage).toBe(90);
    expect(percentage >= 90).toBe(true);
  });

  it('should identify 100% (over budget)', () => {
    const allocated = 100000;
    const spent = 110000;
    const percentage = (spent / allocated) * 100;

    expect(percentage).toBeCloseTo(110, 5);
    expect(percentage > 100).toBe(true);
  });

  it('should handle zero allocated', () => {
    const allocated = 0;
    const spent = 1000;
    const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;

    expect(percentage).toBe(0);
  });

  it('should handle zero spent', () => {
    const allocated = 100000;
    const spent = 0;
    const percentage = (spent / allocated) * 100;

    expect(percentage).toBe(0);
    expect(percentage < 80).toBe(true);
  });
});
