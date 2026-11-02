import { validationError } from '../errors.js';
import { toMonth } from '../lib/dates.js';
import type { BudgetRepository } from '../repositories/budgetRepository.js';
import type { CategoryRepository } from '../repositories/categoryRepository.js';
import type { ExpenseRepository } from '../repositories/expenseRepository.js';
import type { MonthBudgets, MonthOverBudget, OverBudgetCategory } from '../types.js';

export interface BudgetService {
  /** BR-16: the budget in effect for every category in `month`. */
  getBudgets(month: string): MonthBudgets;
  /**
   * Sets or removes the given budgets from `change.month` onward (BR-16, BR-17) and returns the budgets of that month.
   * Throws a validation error, storing nothing, for a month before the current month (BR-18) or an unknown category.
   */
  setBudgets(change: MonthBudgets): MonthBudgets;
  /** BR-19: the categories whose total in `month` is greater than their budget in effect, largest amount over first. */
  getOverBudget(month: string): MonthOverBudget;
}

export function createBudgetService(
  budgets: BudgetRepository,
  categories: CategoryRepository,
  expenses: ExpenseRepository,
  now: () => Date,
): BudgetService {
  function getBudgets(month: string): MonthBudgets {
    return { month, items: budgets.findInEffect(month) };
  }

  return {
    getBudgets,
    setBudgets({ month, items }) {
      const current = toMonth(now());
      if (month < current) {
        throw validationError(`month must be the current month (${current}) or later`);
      }
      const unknown = items.find((item) => !categories.exists(item.categoryId));
      if (unknown) {
        throw validationError(`categoryId ${unknown.categoryId} does not exist`);
      }
      budgets.saveFrom(month, items);
      return getBudgets(month);
    },
    getOverBudget(month) {
      const budgetByCategory = new Map(budgets.findInEffect(month).map((b) => [b.categoryId, b.amountMinor]));
      const items: OverBudgetCategory[] = [];
      // sumByCategory is in category order and the sort is stable, so equal amounts keep that order (BR-5).
      for (const total of expenses.sumByCategory(month)) {
        const budgetMinor = budgetByCategory.get(total.categoryId);
        // No budget in effect means no limit (BR-16); spending equal to the budget is not over (BR-19).
        if (budgetMinor == null || total.totalMinor <= budgetMinor) continue;
        items.push({
          categoryId: total.categoryId,
          categoryName: total.categoryName,
          spentMinor: total.totalMinor,
          budgetMinor,
          overMinor: total.totalMinor - budgetMinor,
        });
      }
      return { month, items: items.sort((a, b) => b.overMinor - a.overMinor) };
    },
  };
}
