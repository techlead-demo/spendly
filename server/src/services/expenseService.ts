import { validationError } from '../errors.js';
import type { CategoryRepository } from '../repositories/categoryRepository.js';
import type { ExpenseFilter, ExpenseRepository } from '../repositories/expenseRepository.js';
import type { Expense, NewExpense } from '../types.js';

/** BR-11: maximum note length, counted after trimming. */
export const NOTE_MAX_LENGTH = 200;

export interface ExpenseList {
  items: Expense[];
  monthTotalMinor: number;
}

export interface ExpenseService {
  listExpenses(filter: ExpenseFilter): ExpenseList;
  /** Records an expense (BR-2, BR-11). Throws a validation error for an unknown category or a too long note. */
  createExpense(expense: NewExpense): Expense;
}

export function createExpenseService(
  expenses: ExpenseRepository,
  categories: CategoryRepository,
): ExpenseService {
  return {
    listExpenses(filter) {
      return {
        items: expenses.findByMonth(filter),
        monthTotalMinor: expenses.sumByMonth(filter.month),
      };
    },
    createExpense({ date, amountMinor, categoryId, note }) {
      const trimmed = note?.trim() ?? '';
      if (trimmed.length > NOTE_MAX_LENGTH) {
        throw validationError(`note must be at most ${NOTE_MAX_LENGTH} characters`);
      }
      if (!categories.exists(categoryId)) {
        throw validationError(`categoryId ${categoryId} does not exist`);
      }
      return expenses.create({ date, amountMinor, categoryId, note: trimmed === '' ? null : trimmed });
    },
  };
}
