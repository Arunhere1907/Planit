import { describe, it, expect } from 'vitest';
import { formatCurrency, formatExactINR, formatDate, getDaysRemaining } from '../src/shared/utils/formatters.js';

describe('Formatters & Pure Date Helpers', () => {
  it('formats Indian currency into Lakh and Crore denominations correctly', () => {
    expect(formatCurrency(800000, 'INR')).toBe('₹8.00 Lakh');
    expect(formatCurrency(25000000, 'INR')).toBe('₹2.50 Cr');
    expect(formatCurrency(50000, 'INR')).toBe('₹50,000');
  });

  it('formats exact INR amounts with comma separators', () => {
    expect(formatExactINR(256000)).toBe('₹2,56,000');
    expect(formatExactINR(1000)).toBe('₹1,000');
  });

  it('formats dates consistently in en-IN locale format', () => {
    const formatted = formatDate('2026-12-18');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('Dec');
  });

  it('calculates days remaining without NaN on missing inputs', () => {
    expect(getDaysRemaining('')).toBe(0);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 5);
    const days = getDaysRemaining(tomorrow.toISOString().split('T')[0]);
    expect(days).toBeGreaterThanOrEqual(4);
    expect(days).toBeLessThanOrEqual(6);
  });
});
