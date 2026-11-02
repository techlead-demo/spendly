import { validationError } from '../errors.js';
import type { CategoryRepository } from '../repositories/categoryRepository.js';
import type { ExpenseFilter, ExpenseRepository } from '../repositories/expenseRepository.js';
import type { Expense, MonthlySummary, NewExpense } from '../types.js';

/** BR-11: maximum note length, counted after trimming. */
export const NOTE_MAX_LENGTH = 200;

export interface ExpenseList {
  items: Expense[];
  monthTotalMinor: number;
}

export interface ExpenseService {
  listExpenses(filter: ExpenseFilter): ExpenseList;
  /** BR-13: one row per category with expenses in the month, largest total first, ties in category order. */
  summarizeMonth(month: string): MonthlySummary;
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
    summarizeMonth(month) {
      // The repository returns rows in category order and Array.prototype.sort is stable,
      // so equal totals keep the fixed category order.
      const items = expenses.sumByCategory(month).sort((a, b) => b.totalMinor - a.totalMinor);
      return {
        month,
        items,
        monthCount: items.reduce((sum, item) => sum + item.count, 0),
        monthTotalMinor: items.reduce((sum, item) => sum + item.totalMinor, 0),
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
