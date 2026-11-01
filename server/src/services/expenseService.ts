import type { ExpenseFilter, ExpenseRepository } from '../repositories/expenseRepository.js';
import type { Expense } from '../types.js';

export interface ExpenseList {
  items: Expense[];
  monthTotalMinor: number;
}

export interface ExpenseService {
  listExpenses(filter: ExpenseFilter): ExpenseList;
}

export function createExpenseService(expenses: ExpenseRepository): ExpenseService {
  return {
    listExpenses(filter) {
      return {
        items: expenses.findByMonth(filter),
        monthTotalMinor: expenses.sumByMonth(filter.month),
      };
    },
  };
}
