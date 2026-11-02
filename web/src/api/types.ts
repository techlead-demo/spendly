/** Shapes of the API under /api/v1 (see project-context/architecture/api.md). */

export interface Category {
  id: number;
  name: string;
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

/** Body of POST /api/v1/expenses. */
export type NewExpense = Omit<Expense, 'id'>;

export interface ListResponse<T> {
  items: T[];
}

export interface ExpenseListResponse extends ListResponse<Expense> {
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

export interface ApiErrorBody {
  error: { code: string; message: string };
}
