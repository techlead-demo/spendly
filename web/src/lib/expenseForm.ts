import type { NewExpense } from '../api/types';
import { isDate } from './dates';

/** BR-11: maximum note length. */
export const NOTE_MAX_LENGTH = 200;

/** Raw values of the expense form, as typed. */
export interface ExpenseFormValues {
  date: string;
  amount: string;
  /** Selected category id, '' when none is chosen. */
  categoryId: string;
  note: string;
}

/** Validated fields in form order; the first invalid one gets focus. */
export const VALIDATED_FIELDS = ['date', 'amount', 'categoryId'] as const;
export type ValidatedField = (typeof VALIDATED_FIELDS)[number];
export type ExpenseFormErrors = Partial<Record<ValidatedField, string>>;

export const FIELD_MESSAGES: Record<ValidatedField, string> = {
  date: 'Enter a valid date.',
  amount: 'Enter a whole amount in đồng, greater than 0.',
  categoryId: 'Choose a category.',
};

export type ExpenseFormResult = { ok: true; expense: NewExpense } | { ok: false; errors: ExpenseFormErrors };

/**
 * Parses the amount field: digits only, surrounding spaces ignored (spec A-3).
 * Returns the amount in minor units, or null when it is not a whole number greater than 0.
 */
export function parseAmountMinor(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const amountMinor = Number(trimmed);
  return Number.isSafeInteger(amountMinor) && amountMinor > 0 ? amountMinor : null;
}

/** Validates the form on Save; on success returns the request body for POST /expenses. */
export function validateExpenseForm(values: ExpenseFormValues): ExpenseFormResult {
  const errors: ExpenseFormErrors = {};
  if (!isDate(values.date)) errors.date = FIELD_MESSAGES.date;
  const amountMinor = parseAmountMinor(values.amount);
  if (amountMinor === null) errors.amount = FIELD_MESSAGES.amount;
  const categoryId = /^[1-9]\d*$/.test(values.categoryId) ? Number(values.categoryId) : null;
  if (categoryId === null) errors.categoryId = FIELD_MESSAGES.categoryId;

  if (amountMinor === null || categoryId === null || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  const note = values.note.trim();
  return { ok: true, expense: { date: values.date, amountMinor, categoryId, note: note === '' ? null : note } };
}
