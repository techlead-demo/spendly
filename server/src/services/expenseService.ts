import { notFoundError, validationError } from '../errors.js';
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
   * Throws a validation error for an unknown or retired category (BR-2, BR-24).
   */
  createExpense(expense: NewExpense): Expense;
  /** Throws 404 NOT_FOUND for an unknown or deleted expense. */
  getExpense(id: number): Expense;
  /**
   * BR-20: replaces the fields of an expense under the same rules as recording; id and recording order stay.
   * Throws a validation error for an unknown category or another retired category than the expense's own (BR-24),
   * and 404 NOT_FOUND for an unknown or deleted expense.
   */
  updateExpense(id: number, expense: NewExpense): Expense;
  /** BR-21: marks the expense deleted (kept for Undo). Throws 404 NOT_FOUND for an unknown or deleted expense. */
  deleteExpense(id: number): void;
  /** BR-21: restores a deleted expense; idempotent. Throws 404 NOT_FOUND only for an id never recorded. */
  restoreExpense(id: number): Expense;
}

function expenseNotFound(id: number) {
  return notFoundError(`expense ${id} does not exist`);
}

export function createExpenseService(
  expenses: ExpenseRepository,
  categories: CategoryRepository,
): ExpenseService {
  /** BR-2, BR-24: the category exists and is active, unless it is the category the expense already has. */
  function checkCategory(categoryId: number, currentCategoryId?: number) {
    const category = categories.findById(categoryId);
    if (!category) {
      throw validationError(`categoryId ${categoryId} does not exist`);
    }
    if (category.status === 'retired' && categoryId !== currentCategoryId) {
      throw validationError(`categoryId ${categoryId} is retired`);
    }
  }

  return {
    listExpenses(filter) {
      return {
        items: expenses.findByMonth(filter),
        monthTotalMinor: expenses.sumByMonth(filter.month),
      };
    },
    summarizeMonth(month) {
      // The repository returns rows in category order and Array.prototype.sort is stable,
      // so equal totals keep the category order (BR-22).
      const items = expenses.sumByCategory(month).sort((a, b) => b.totalMinor - a.totalMinor);
      return {
        month,
        items,
        monthCount: items.reduce((sum, item) => sum + item.count, 0),
        monthTotalMinor: items.reduce((sum, item) => sum + item.totalMinor, 0),
      };
    },
    createExpense(expense) {
      checkCategory(expense.categoryId);
      return expenses.create(expense);
    },
    getExpense(id) {
      const expense = expenses.findById(id);
      if (!expense) throw expenseNotFound(id);
      return expense;
    },
    updateExpense(id, expense) {
      // An unknown expense is reported before an unknown category: there is nothing to correct.
      const current = expenses.findById(id);
      if (!current) throw expenseNotFound(id);
      checkCategory(expense.categoryId, current.categoryId);
      const updated = expenses.update(id, expense);
      if (!updated) throw expenseNotFound(id);
      return updated;
    },
    deleteExpense(id) {
      if (!expenses.markDeleted(id)) throw expenseNotFound(id);
    },
    restoreExpense(id) {
      const restored = expenses.restore(id);
      if (!restored) throw expenseNotFound(id);
      return restored;
    },
  };
}
