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
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export async function fetchCategories(): Promise<Category[]> {
  const { items } = await request<ListResponse<Category>>('/categories');
  return items;
}

/** Adds an active category (BR-22); a name that breaks BR-23 rejects with a 400 `ApiError`. */
export function addCategory(name: string): Promise<Category> {
  return request<Category>('/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export function renameCategory(id: number, name: string): Promise<Category> {
  return request<Category>(`/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

/** Retiring the only active category rejects with a 400 `ApiError` (BR-25). */
export function retireCategory(id: number): Promise<Category> {
  return request<Category>(`/categories/${id}/retire`, { method: 'POST' });
}

export function restoreCategory(id: number): Promise<Category> {
  return request<Category>(`/categories/${id}/restore`, { method: 'POST' });
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

/** Rejects with an `ApiError` of status 404 when the expense does not exist or was deleted. */
export function fetchExpense(id: number): Promise<Expense> {
  return request<Expense>(`/expenses/${id}`);
}

export function updateExpense(id: number, expense: NewExpense): Promise<Expense> {
  return request<Expense>(`/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
}

export function deleteExpense(id: number): Promise<void> {
  return request<void>(`/expenses/${id}`, { method: 'DELETE' });
}

/** Undoes a delete (BR-21); resolves to the restored expense. */
export function restoreExpense(id: number): Promise<Expense> {
  return request<Expense>(`/expenses/${id}/restore`, { method: 'POST' });
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
