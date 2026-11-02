import { describe, expect, it } from 'vitest';
import { overBudgetHeading, overBudgetLine } from './overBudget';

// Intl uses a non-breaking space between the number and the currency sign.
const normalize = (s: string) => s.replace(/\s/g, ' ');

describe('overBudgetHeading', () => {
  it('AC-1: says "N categories are over budget this month" for the current month', () => {
    expect(overBudgetHeading(2, '2026-11', '2026-11')).toBe('2 categories are over budget this month');
  });

  it('AC-3: uses the singular for one category', () => {
    expect(overBudgetHeading(1, '2026-11', '2026-11')).toBe('1 category is over budget this month');
  });

  it('AC-10: says "in MM/YYYY" for a month other than the current month', () => {
    expect(overBudgetHeading(1, '2026-10', '2026-11')).toBe('1 category is over budget in 10/2026');
    expect(overBudgetHeading(3, '2027-01', '2026-11')).toBe('3 categories are over budget in 01/2027');
  });
});

describe('overBudgetLine', () => {
  it('AC-1: formats spent, budget and amount over in VND', () => {
    const line = overBudgetLine({
      categoryId: 1,
      categoryName: 'Food',
      spentMinor: 785_000,
      budgetMinor: 700_000,
      overMinor: 85_000,
    });

    expect(normalize(line)).toBe('Food: 785.000 ₫ spent of 700.000 ₫ budget, 85.000 ₫ over');
  });

  it('AC-6: shows 1 ₫ over', () => {
    const line = overBudgetLine({
      categoryId: 1,
      categoryName: 'Food',
      spentMinor: 700_001,
      budgetMinor: 700_000,
      overMinor: 1,
    });

    expect(normalize(line)).toBe('Food: 700.001 ₫ spent of 700.000 ₫ budget, 1 ₫ over');
  });
});
