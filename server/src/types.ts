/** API resource shapes (camelCase, as sent over JSON). */

export interface Category {
  id: number;
  name: string;
}

export interface Expense {
  id: number;
  /** Local date, "YYYY-MM-DD". */
  date: string;
  /** Integer amount in minor units of VND (1 = 1 đồng). */
  amountMinor: number;
  categoryId: number;
  note: string | null;
}

/** Body of POST /api/v1/expenses and PUT /api/v1/expenses/:id after validation. */
export type NewExpense = Omit<Expense, 'id'>;

/** Expenses of one category in one month (BR-13). */
export interface CategorySummary {
  categoryId: number;
  categoryName: string;
  count: number;
  /** Integer total in minor units of VND. */
  totalMinor: number;
}

export interface MonthlySummary {
  /** "YYYY-MM" */
  month: string;
  /** Categories with at least one expense, largest total first; equal totals in category order. */
  items: CategorySummary[];
  monthCount: number;
  monthTotalMinor: number;
}

/** The budget of one category in effect for a month; `amountMinor` is null when there is no budget (no limit). */
export interface Budget {
  categoryId: number;
  amountMinor: number | null;
}

/**
 * Response of GET and PUT /api/v1/budgets (all categories), and the validated body of PUT
 * (only the categories whose budget is set or removed from `month` onward).
 */
export interface MonthBudgets {
  /** "YYYY-MM" */
  month: string;
  items: Budget[];
}

/** A category whose total is greater than its budget in effect for a month (BR-19). */
export interface OverBudgetCategory {
  categoryId: number;
  categoryName: string;
  /** Category total of the month (BR-13), integer minor units of VND. */
  spentMinor: number;
  /** Budget in effect for the month (BR-16). */
  budgetMinor: number;
  /** `spentMinor - budgetMinor`, always at least 1. */
  overMinor: number;
}

/** Response of GET /api/v1/budgets/over. */
export interface MonthOverBudget {
  /** "YYYY-MM" */
  month: string;
  /** Largest `overMinor` first; equal amounts in category order (BR-5). */
  items: OverBudgetCategory[];
}
