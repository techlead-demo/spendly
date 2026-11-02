import { describe, expect, it } from 'vitest';
import { FIELD_MESSAGES, validateExpenseForm, type ExpenseFormValues } from './expenseForm';

const valid: ExpenseFormValues = { date: '2026-11-02', amount: '85000', categoryId: '1', note: 'Lunch' };

describe('validateExpenseForm', () => {
  it('returns the request body for valid values', () => {
    expect(validateExpenseForm(valid)).toEqual({
      ok: true,
      expense: { date: '2026-11-02', amountMinor: 85_000, categoryId: 1, note: 'Lunch' },
    });
  });

  it('AC-8: trims the note and sends a blank note as null', () => {
    const coffee = validateExpenseForm({ ...valid, note: '  Coffee  ' });
    const blank = validateExpenseForm({ ...valid, note: '   ' });

    expect(coffee.ok && coffee.expense.note).toBe('Coffee');
    expect(blank.ok && blank.expense.note).toBeNull();
  });

  it('AC-18: accepts an amount of 1 and ignores surrounding spaces', () => {
    const one = validateExpenseForm({ ...valid, amount: '1' });
    const spaced = validateExpenseForm({ ...valid, amount: ' 30000 ' });

    expect(one.ok && one.expense.amountMinor).toBe(1);
    expect(spaced.ok && spaced.expense.amountMinor).toBe(30_000);
  });

  it.each(['', '0', '-5000', '12,5', '12.5', '85.000', '85 000', 'abc', '9007199254740992'])(
    'AC-12: rejects the amount %j',
    (amount) => {
      expect(validateExpenseForm({ ...valid, amount })).toEqual({
        ok: false,
        errors: { amount: FIELD_MESSAGES.amount },
      });
    },
  );

  it.each(['', '2026-02-30', '2026-13-01'])('AC-13: rejects the date %j', (date) => {
    expect(validateExpenseForm({ ...valid, date })).toEqual({ ok: false, errors: { date: FIELD_MESSAGES.date } });
  });

  it('AC-14: rejects a missing category', () => {
    expect(validateExpenseForm({ ...valid, categoryId: '' })).toEqual({
      ok: false,
      errors: { categoryId: FIELD_MESSAGES.categoryId },
    });
  });

  it('AC-15: reports all invalid fields at once', () => {
    expect(validateExpenseForm({ date: '', amount: '0', categoryId: '', note: '' })).toEqual({
      ok: false,
      errors: { date: FIELD_MESSAGES.date, amount: FIELD_MESSAGES.amount, categoryId: FIELD_MESSAGES.categoryId },
    });
  });
});
