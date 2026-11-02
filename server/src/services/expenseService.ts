import type { ExpenseFilter, ExpenseRepository } from '../repositories/expenseRepository.js';
import type { Expense, MonthlySummary } from '../types.js';

export interface ExpenseList {
  items: Expense[];
  monthTotalMinor: number;
}

export interface ExpenseService {
  listExpenses(filter: ExpenseFilter): ExpenseList;
  /** BR-13: one row per category with expenses in the month, largest total first, ties in category order. */
  summarizeMonth(month: string): MonthlySummary;
}

export function createExpenseService(expenses: ExpenseRepository): ExpenseService {
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
  };
}
