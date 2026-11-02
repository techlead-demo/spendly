import { describe, expect, it } from 'vitest';
import type { Budget } from '../api/types';
import { toBudgetFormValues, validateBudgetForm } from './budgetForm';

const NONE: Budget[] = [1, 2, 3, 4, 5, 6].map((categoryId) => ({ categoryId, amountMinor: null }));

function withValues(entries: Record<number, string>) {
  return { ...toBudgetFormValues(NONE), ...entries };
}

describe('toBudgetFormValues', () => {
  it('shows a budget as plain digits and no budget as an empty field', () => {
    expect(
      toBudgetFormValues([
        { categoryId: 1, amountMinor: 700_000 },
        { categoryId: 2, amountMinor: null },
      ]),
    ).toEqual({ 1: '700000', 2: '' });
  });
});

describe('validateBudgetForm', () => {
  it('AC-4: returns the entered budgets as changes', () => {
    expect(validateBudgetForm(withValues({ 1: '700000', 5: '300000' }), NONE)).toEqual({
      ok: true,
      changes: [
        { categoryId: 1, amountMinor: 700_000 },
        { categoryId: 5, amountMinor: 300_000 },
      ],
    });
  });

  it('AC-10, AC-11: returns only the categories whose value differs from the budget in effect', () => {
    const inEffect: Budget[] = [
      { categoryId: 1, amountMinor: 700_000 },
      { categoryId: 5, amountMinor: 300_000 },
    ];

    expect(validateBudgetForm({ 1: '700000', 5: '300000' }, inEffect)).toEqual({ ok: true, changes: [] });
    expect(validateBudgetForm({ 1: '700000', 5: '250000' }, inEffect)).toEqual({
      ok: true,
      changes: [{ categoryId: 5, amountMinor: 250_000 }],
    });
  });

  it('AC-8: a cleared field removes the budget', () => {
    const inEffect: Budget[] = [{ categoryId: 1, amountMinor: 800_000 }];

    expect(validateBudgetForm({ 1: '' }, inEffect)).toEqual({ ok: true, changes: [{ categoryId: 1, amountMinor: null }] });
  });

  it.each(['0', '-5000', '12,5', '12.5', '700.000', 'abc'])('AC-12: rejects %j', (text) => {
    expect(validateBudgetForm(withValues({ 1: text, 5: '300000' }), NONE)).toEqual({
      ok: false,
      invalidCategoryIds: [1],
    });
  });

  it('AC-13: lists every invalid field in table order', () => {
    expect(validateBudgetForm(withValues({ 2: 'abc', 1: '0' }), NONE)).toEqual({
      ok: false,
      invalidCategoryIds: [1, 2],
    });
  });

  it('AC-15: accepts 1 đồng', () => {
    expect(validateBudgetForm(withValues({ 1: '1' }), NONE)).toEqual({
      ok: true,
      changes: [{ categoryId: 1, amountMinor: 1 }],
    });
  });

  it('AC-16: ignores surrounding spaces and treats a blank field as no budget', () => {
    const inEffect: Budget[] = [
      { categoryId: 1, amountMinor: null },
      { categoryId: 2, amountMinor: 50_000 },
    ];

    expect(validateBudgetForm({ 1: '  700000  ', 2: '   ' }, inEffect)).toEqual({
      ok: true,
      changes: [
        { categoryId: 1, amountMinor: 700_000 },
        { categoryId: 2, amountMinor: null },
      ],
    });
  });
});
