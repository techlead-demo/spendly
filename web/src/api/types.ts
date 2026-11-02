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

export interface ApiErrorBody {
  error: { code: string; message: string };
}
