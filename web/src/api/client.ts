import type { ApiErrorBody, Category, ExpenseListResponse, ListResponse, MonthlySummary } from './types';

const BASE_PATH = '/api/v1';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_PATH}${path}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(res.status, body?.error.code ?? 'UNKNOWN', body?.error.message ?? res.statusText);
  }
  return (await res.json()) as T;
}

export async function fetchCategories(): Promise<Category[]> {
  const { items } = await getJson<ListResponse<Category>>('/categories');
  return items;
}

export function fetchExpenses(month: string, categoryId?: number): Promise<ExpenseListResponse> {
  const params = new URLSearchParams({ month });
  if (categoryId !== undefined) {
    params.set('categoryId', String(categoryId));
  }
  return getJson<ExpenseListResponse>(`/expenses?${params}`);
}

export function fetchSummary(month: string): Promise<MonthlySummary> {
  return getJson<MonthlySummary>(`/summary?${new URLSearchParams({ month })}`);
}
