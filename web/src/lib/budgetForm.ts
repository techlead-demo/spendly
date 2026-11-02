import type { Budget } from '../api/types';
import { FIELD_MESSAGES, parseAmountMinor } from './expenseForm';

/** Same rule and message as the expense Amount field (spec A-4, BR-17). */
export const BUDGET_MESSAGE = FIELD_MESSAGES.amount;

/** Raw budget fields as typed, by category id. */
export type BudgetFormValues = Record<number, string>;

export type BudgetFormResult = { ok: true; changes: Budget[] } | { ok: false; invalidCategoryIds: number[] };

/** Field values for the budgets in effect: plain digits, or '' for no budget. */
export function toBudgetFormValues(budgets: Budget[]): BudgetFormValues {
  return Object.fromEntries(budgets.map((b) => [b.categoryId, b.amountMinor === null ? '' : String(b.amountMinor)]));
}

/**
 * Validates the fields on Save. An empty or blank field means no budget. On success returns only the categories
 * whose value differs from the budget in effect (spec A-2), in table order; on failure the invalid ones in table order.
 */
export function validateBudgetForm(values: BudgetFormValues, inEffect: Budget[]): BudgetFormResult {
  const invalidCategoryIds: number[] = [];
  const changes: Budget[] = [];
  for (const { categoryId, amountMinor: current } of inEffect) {
    const text = values[categoryId] ?? '';
    const amountMinor = text.trim() === '' ? null : parseAmountMinor(text);
    if (text.trim() !== '' && amountMinor === null) {
      invalidCategoryIds.push(categoryId);
    } else if (amountMinor !== current) {
      changes.push({ categoryId, amountMinor });
    }
  }
  return invalidCategoryIds.length > 0 ? { ok: false, invalidCategoryIds } : { ok: true, changes };
}
