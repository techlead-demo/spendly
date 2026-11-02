/** Shapes of the API under /api/v1 (see project-context/architecture/api.md). */

/** BR-24: only active categories can be chosen for new expenses and get budgets. */
export type CategoryStatus = 'active' | 'retired';

export interface Category {
  id: number;
  name: string;
  status: CategoryStatus;
  /** Number of expenses over all months; deleted expenses are not counted. */
  expenseCount: number;
}

export interface Expense {
  id: number;
  /** Local date, "YYYY-MM-DD". */
  date: string;
  /** Integer amount in VND minor units (1 = 1 đồng). */
  amountMinor: number;
  categoryId: number;
  note: string | null;
}

/** Body of POST /api/v1/expenses and PUT /api/v1/expenses/:id. */
export type NewExpense = Omit<Expense, 'id'>;

export interface ListResponse<T> {
  items: T[];
}

export interface ExpenseListResponse extends ListResponse<Expense> {
  monthTotalMinor: number;
}

export interface CategorySummary {
  categoryId: number;
  categoryName: string;
  count: number;
  /** Integer total in VND minor units. */
  totalMinor: number;
}

export interface MonthlySummary {
  /** "YYYY-MM" */
  month: string;
  items: CategorySummary[];
  monthCount: number;
  monthTotalMinor: number;
}

/** The budget of one category in effect for a month; `amountMinor` is null when there is no budget (no limit). */
export interface Budget {
  categoryId: number;
  amountMinor: number | null;
}

/** Response of GET and PUT /api/v1/budgets; also the body of PUT (only the changed categories). */
export interface MonthBudgets {
  /** "YYYY-MM" */
  month: string;
  items: Budget[];
}

/** A category whose total is greater than its budget in effect for the month (BR-19). */
export interface OverBudgetCategory {
  categoryId: number;
  categoryName: string;
  spentMinor: number;
  budgetMinor: number;
  overMinor: number;
}

/** Response of GET /api/v1/budgets/over: largest `overMinor` first, ties in category order. */
export interface MonthOverBudget {
  /** "YYYY-MM" */
  month: string;
  items: OverBudgetCategory[];
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
