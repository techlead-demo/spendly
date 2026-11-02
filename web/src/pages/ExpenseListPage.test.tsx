import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchCategories, fetchExpenses, fetchOverBudget } from '../api/client';
import type { Category, ExpenseListResponse, MonthOverBudget } from '../api/types';
import { ALL_CATEGORIES, ExpenseListPage, type ExpenseListFilter } from './ExpenseListPage';

vi.mock('../api/client', async (importActual) => ({
  ...(await importActual<typeof import('../api/client')>()),
  fetchCategories: vi.fn(),
  fetchExpenses: vi.fn(),
  fetchOverBudget: vi.fn(),
}));

// Intl uses a non-breaking space between the number and the currency sign.
const normalize = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

const CATEGORIES: Category[] = [
  { id: 1, name: 'Food', status: 'active', expenseCount: 0 },
  { id: 2, name: 'Transport', status: 'active', expenseCount: 0 },
  { id: 3, name: 'Housing', status: 'active', expenseCount: 0 },
  { id: 4, name: 'Health', status: 'active', expenseCount: 0 },
  { id: 5, name: 'Entertainment', status: 'active', expenseCount: 0 },
  { id: 6, name: 'Other', status: 'active', expenseCount: 0 },
];

const NOVEMBER_LIST: ExpenseListResponse = {
  items: [{ id: 1, date: '2026-11-01', amountMinor: 6_500_000, categoryId: 3, note: 'Monthly rent' }],
  monthTotalMinor: 6_500_000,
};

const NOVEMBER_OVER: MonthOverBudget = {
  month: '2026-11',
  items: [
    { categoryId: 1, categoryName: 'Food', spentMinor: 785_000, budgetMinor: 700_000, overMinor: 85_000 },
    { categoryId: 5, categoryName: 'Entertainment', spentMinor: 350_000, budgetMinor: 300_000, overMinor: 50_000 },
  ],
};

const BANNER_LINES = [
  'Food: 785.000 ₫ spent of 700.000 ₫ budget, 85.000 ₫ over',
  'Entertainment: 350.000 ₫ spent of 300.000 ₫ budget, 50.000 ₫ over',
];

/** The page with its filter kept in state, as App does. */
function Harness({ initialMonth = '2026-11' }: { initialMonth?: string }) {
  const [filter, setFilter] = useState<ExpenseListFilter>({ month: initialMonth, categoryId: ALL_CATEGORIES });
  return <ExpenseListPage filter={filter} onFilterChange={setFilter} onAddExpense={() => {}} />;
}

function bannerLines(): string[] {
  return within(screen.getByRole('alert'))
    .getAllByRole('listitem')
    .map((item) => normalize(item.textContent));
}

describe('ExpenseListPage over-budget banner (SPD-5)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 9, 30));
    vi.mocked(fetchCategories).mockResolvedValue(CATEGORIES);
    vi.mocked(fetchExpenses).mockResolvedValue(NOVEMBER_LIST);
    vi.mocked(fetchOverBudget).mockResolvedValue(NOVEMBER_OVER);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('AC-1: shows the heading and one line per category above the Month and Category filters', async () => {
    render(<Harness />);

    const banner = await screen.findByRole('alert');
    expect(within(banner).getByText('2 categories are over budget this month').tagName).toBe('STRONG');
    expect(bannerLines()).toEqual(BANNER_LINES);
    expect(fetchOverBudget).toHaveBeenCalledWith('2026-11');
    const monthPicker = screen.getByLabelText('Month');
    expect(banner.compareDocumentPosition(monthPicker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(banner).queryByRole('button')).not.toBeInTheDocument();
    expect(within(banner).queryByRole('link')).not.toBeInTheDocument();
  });

  it('AC-3: uses the singular heading for one category', async () => {
    vi.mocked(fetchOverBudget).mockResolvedValue({ month: '2026-11', items: [NOVEMBER_OVER.items[0]!] });

    render(<Harness />);

    expect(await screen.findByRole('alert')).toHaveTextContent('1 category is over budget this month');
    expect(bannerLines()).toEqual([BANNER_LINES[0]]);
  });

  it('AC-7, AC-8: shows no banner when no category is over budget', async () => {
    vi.mocked(fetchOverBudget).mockResolvedValue({ month: '2026-11', items: [] });

    render(<Harness />);

    expect(await screen.findByRole('cell', { name: 'Monthly rent' })).toBeInTheDocument();
    await vi.waitFor(() => expect(fetchOverBudget).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('AC-9: shows no banner and the usual empty list for a month without expenses', async () => {
    vi.mocked(fetchExpenses).mockResolvedValue({ items: [], monthTotalMinor: 0 });
    vi.mocked(fetchOverBudget).mockResolvedValue({ month: '2026-11', items: [] });

    render(<Harness />);

    expect(normalize((await screen.findByTestId('month-total')).textContent)).toBe('0 ₫');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('AC-10: says "in MM/YYYY" for a month other than the current month', async () => {
    vi.mocked(fetchOverBudget).mockResolvedValue({
      month: '2026-10',
      items: [{ categoryId: 1, categoryName: 'Food', spentMinor: 900_000, budgetMinor: 700_000, overMinor: 200_000 }],
    });

    render(<Harness initialMonth="2026-10" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('1 category is over budget in 10/2026');
    expect(bannerLines()).toEqual(['Food: 900.000 ₫ spent of 700.000 ₫ budget, 200.000 ₫ over']);
    expect(fetchOverBudget).toHaveBeenCalledWith('2026-10');
  });

  it('AC-11, AC-17: loads the banner of the newly selected month and hides the old one meanwhile', async () => {
    render(<Harness />);
    await screen.findByRole('alert');
    let resolve: (data: MonthOverBudget) => void = () => {};
    vi.mocked(fetchOverBudget).mockReturnValue(new Promise((r) => (resolve = r)));

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-12' } });

    expect(fetchOverBudget).toHaveBeenLastCalledWith('2026-12');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    resolve({ month: '2026-12', items: [] });
    await vi.waitFor(() => expect(fetchExpenses).toHaveBeenLastCalledWith('2026-12', undefined));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('AC-12: keeps the same banner for all categories when the category filter changes', async () => {
    render(<Harness />);
    await screen.findByRole('alert');
    await screen.findByRole('option', { name: 'Transport' });

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '2' } });

    await vi.waitFor(() => expect(fetchExpenses).toHaveBeenLastCalledWith('2026-11', 2));
    expect(fetchOverBudget).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('2 categories are over budget this month');
    expect(bannerLines()).toEqual(BANNER_LINES);
  });

  it('AC-13: keeps the banner on screen and sends no request when the month is cleared', async () => {
    render(<Harness />);
    await screen.findByRole('alert');

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '' } });

    expect(fetchOverBudget).toHaveBeenCalledTimes(1);
    expect(bannerLines()).toEqual(BANNER_LINES);
    expect(screen.getByRole('cell', { name: 'Monthly rent' })).toBeInTheDocument();
  });

  it('AC-17: shows no banner, not even an empty one, until its data arrives', async () => {
    let resolve: (data: MonthOverBudget) => void = () => {};
    vi.mocked(fetchOverBudget).mockReturnValue(new Promise((r) => (resolve = r)));

    render(<Harness />);

    expect(await screen.findByRole('cell', { name: 'Monthly rent' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/over budget/)).not.toBeInTheDocument();
    resolve(NOVEMBER_OVER);
    expect(await screen.findByRole('alert')).toHaveTextContent('2 categories are over budget this month');
  });

  it.each([
    ['the API returns an error', new ApiError(500, 'INTERNAL_ERROR', 'Unexpected error')],
    ['the API cannot be reached', new TypeError('Failed to fetch')],
  ])('AC-18: shows the list and month total without banner or error when %s', async (_, failure) => {
    vi.mocked(fetchOverBudget).mockRejectedValue(failure);

    render(<Harness />);

    expect(await screen.findByRole('cell', { name: 'Monthly rent' })).toBeInTheDocument();
    expect(normalize(screen.getByTestId('month-total').textContent)).toBe('6.500.000 ₫');
    await vi.waitFor(() => expect(fetchOverBudget).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/Could not/)).not.toBeInTheDocument();
  });
});
