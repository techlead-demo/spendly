import { describe, expect, it } from 'vitest';
import { formatShare } from './share';

describe('formatShare', () => {
  it('AC-17: formats the shares of the example month with one decimal in vi-VN format', () => {
    expect(formatShare(6_500_000, 6_805_000)).toBe('95,5%');
    expect(formatShare(205_000, 6_805_000)).toBe('3,0%');
    expect(formatShare(50_000, 6_805_000)).toBe('0,7%');
    expect(formatShare(6_805_000, 6_805_000)).toBe('100,0%');
  });

  it('AC-18: rounds half up (99,95% → 100,0%, 0,05% → 0,1%)', () => {
    expect(formatShare(1_999, 2_000)).toBe('100,0%');
    expect(formatShare(1, 2_000)).toBe('0,1%');
  });

  it('AC-19: shows a tiny share as 0,0%', () => {
    expect(formatShare(1, 6_805_001)).toBe('0,0%');
  });

  it('AC-20: shows a single 1 ₫ expense as 100,0%', () => {
    expect(formatShare(1, 1)).toBe('100,0%');
  });

  it('shows 0,0% when the month total is 0', () => {
    expect(formatShare(0, 0)).toBe('0,0%');
  });
});
