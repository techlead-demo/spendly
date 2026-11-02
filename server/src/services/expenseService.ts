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
  /**
   * Records an expense whose fields the route has validated and normalised (BR-11: note trimmed, blank → null).
   * Throws a validation error for an unknown category (BR-2).
   */
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
    createExpense(expense) {
      if (!categories.exists(expense.categoryId)) {
        throw validationError(`categoryId ${expense.categoryId} does not exist`);
      }
      return expenses.create(expense);
    },
  };
}
