import type {
  ApiErrorBody,
  Budget,
  Category,
  Expense,
  ExpenseListResponse,
  ListResponse,
  MonthBudgets,
  MonthlySummary,
  MonthOverBudget,
  NewExpense,
} from './types';

const BASE_PATH = '/api/v1';

/** Code of an `ApiError` whose response was not the standard error body (e.g. a proxy error page). */
export const UNKNOWN_ERROR_CODE = 'UNKNOWN';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_PATH}${path}`, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      body?.error?.code ?? UNKNOWN_ERROR_CODE,
      body?.error?.message ?? res.statusText,
    );
  }
  return (await res.json()) as T;
}

export async function fetchCategories(): Promise<Category[]> {
  const { items } = await request<ListResponse<Category>>('/categories');
  return items;
}

export function fetchExpenses(month: string, categoryId?: number): Promise<ExpenseListResponse> {
  const params = new URLSearchParams({ month });
  if (categoryId !== undefined) {
    params.set('categoryId', String(categoryId));
  }
  return request<ExpenseListResponse>(`/expenses?${params}`);
}

export function createExpense(expense: NewExpense): Promise<Expense> {
  return request<Expense>('/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
}

export function fetchSummary(month: string): Promise<MonthlySummary> {
  return request<MonthlySummary>(`/summary?${new URLSearchParams({ month })}`);
}

export function fetchBudgets(month: string): Promise<MonthBudgets> {
  return request<MonthBudgets>(`/budgets?${new URLSearchParams({ month })}`);
}

export function fetchOverBudget(month: string): Promise<MonthOverBudget> {
  return request<MonthOverBudget>(`/budgets/over?${new URLSearchParams({ month })}`);
}

/** Sets (amount) or removes (null) the given budgets from `month` onward; resolves to the budgets of `month`. */
export function saveBudgets(month: string, items: Budget[]): Promise<MonthBudgets> {
  return request<MonthBudgets>('/budgets', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month, items }),
  });
}
