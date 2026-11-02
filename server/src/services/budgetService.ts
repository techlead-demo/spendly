import { validationError } from '../errors.js';
import { toMonth } from '../lib/dates.js';
import type { BudgetRepository } from '../repositories/budgetRepository.js';
import type { CategoryRepository } from '../repositories/categoryRepository.js';
import type { MonthBudgets } from '../types.js';

export interface BudgetService {
  /** BR-16: the budget in effect for every category in `month`. */
  getBudgets(month: string): MonthBudgets;
  /**
   * Sets or removes the given budgets from `change.month` onward (BR-16, BR-17) and returns the budgets of that month.
   * Throws a validation error, storing nothing, for a month before the current month (BR-18) or an unknown category.
   */
  setBudgets(change: MonthBudgets): MonthBudgets;
}

export function createBudgetService(
  budgets: BudgetRepository,
  categories: CategoryRepository,
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
  };
}
