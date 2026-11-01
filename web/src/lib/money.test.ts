import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';

// Intl uses a non-breaking space between the number and the currency sign.
const normalize = (s: string) => s.replace(/\s/g, ' ');

describe('formatMoney', () => {
  it('formats VND minor units with vi-VN grouping and no decimals', () => {
    expect(normalize(formatMoney(6_500_000))).toBe('6.500.000 ₫');
    expect(normalize(formatMoney(35_000))).toBe('35.000 ₫');
    expect(normalize(formatMoney(0))).toBe('0 ₫');
  });
});
