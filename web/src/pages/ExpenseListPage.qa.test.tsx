import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCategories, fetchExpenses, fetchOverBudget } from '../api/client';
import type { Category, ExpenseListResponse, MonthOverBudget } from '../api/types';
import { ALL_CATEGORIES, ExpenseListPage, type ExpenseListFilter } from './ExpenseListPage';

// QA tests for SPD-5. Cases already covered by ExpenseListPage.test.tsx are not repeated here.

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

const LIST: ExpenseListResponse = {
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

const OCTOBER_OVER: MonthOverBudget = {
  month: '2026-10',
  items: [{ categoryId: 1, categoryName: 'Food', spentMinor: 900_000, budgetMinor: 700_000, overMinor: 200_000 }],
};

function Harness({ initialMonth = '2026-11' }: { initialMonth?: string }) {
  const [filter, setFilter] = useState<ExpenseListFilter>({ month: initialMonth, categoryId: ALL_CATEGORIES });
  return <ExpenseListPage filter={filter} onFilterChange={setFilter} onAddExpense={() => {}} />;
}

function bannerLines(): string[] {
  return within(screen.getByRole('alert'))
    .getAllByRole('listitem')
    .map((item) => normalize(item.textContent));
}

describe('ExpenseListPage over-budget banner (SPD-5 QA)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 9, 30));
    vi.mocked(fetchCategories).mockResolvedValue(CATEGORIES);
    vi.mocked(fetchExpenses).mockResolvedValue(LIST);
    vi.mocked(fetchOverBudget).mockResolvedValue(NOVEMBER_OVER);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('TC-2 (AC-1): banner sits between the title row and the filters, with the ⚠ mark and bold heading', async () => {
    render(<Harness />);

    const banner = await screen.findByRole('alert');
    const title = screen.getByRole('heading', { name: 'Expenses' });
    expect(title.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(banner.compareDocumentPosition(screen.getByLabelText('Category')) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    expect(banner).toHaveTextContent('⚠');
    expect(within(banner).getByText('2 categories are over budget this month').tagName).toBe('STRONG');
    expect(bannerLines()).toEqual([
      'Food: 785.000 ₫ spent of 700.000 ₫ budget, 85.000 ₫ over',
      'Entertainment: 350.000 ₫ spent of 300.000 ₫ budget, 50.000 ₫ over',
    ]);
  });

  it('TC-7 (AC-6): shows "1 ₫ over" for a total of 700.001 ₫ against 700.000 ₫', async () => {
    vi.mocked(fetchOverBudget).mockResolvedValue({
      month: '2026-11',
      items: [{ categoryId: 1, categoryName: 'Food', spentMinor: 700_001, budgetMinor: 700_000, overMinor: 1 }],
    });

    render(<Harness />);

    expect(await screen.findByRole('alert')).toHaveTextContent('1 category is over budget this month');
    expect(bannerLines()).toEqual(['Food: 700.001 ₫ spent of 700.000 ₫ budget, 1 ₫ over']);
  });

  it('TC-10 (AC-9): an empty month shows the empty list and no banner', async () => {
    vi.mocked(fetchExpenses).mockResolvedValue({ items: [], monthTotalMinor: 0 });
    vi.mocked(fetchOverBudget).mockResolvedValue({ month: '2026-11', items: [] });

    render(<Harness />);

    expect(normalize((await screen.findByTestId('month-total')).textContent)).toBe('0 ₫');
    await vi.waitFor(() => expect(fetchOverBudget).toHaveBeenCalledWith('2026-11'));
    expect(screen.queryByText(/over budget/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('TC-13 (AC-12): the banner request carries no category filter', async () => {
    render(<Harness />);
    await screen.findByRole('alert');
    await screen.findByRole('option', { name: 'Entertainment' });

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '5' } });
    await vi.waitFor(() => expect(fetchExpenses).toHaveBeenLastCalledWith('2026-11', 5));

    for (const call of vi.mocked(fetchOverBudget).mock.calls) expect(call).toEqual(['2026-11']);
    expect(bannerLines()).toHaveLength(2);
  });

  it('TC-14 (AC-13): after clearing the month, picking 2026-10 shows the October banner', async () => {
    render(<Harness />);
    await screen.findByRole('alert');
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '' } });
    expect(screen.getByRole('alert')).toHaveTextContent('2 categories are over budget this month');
    vi.mocked(fetchOverBudget).mockResolvedValue(OCTOBER_OVER);

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-10' } });

    expect(await screen.findByText('1 category is over budget in 10/2026')).toBeInTheDocument();
    expect(bannerLines()).toEqual(['Food: 900.000 ₫ spent of 700.000 ₫ budget, 200.000 ₫ over']);
  });

  it('TC-18 (AC-17): a late answer for the previous month is not shown for the new month', async () => {
    let resolveNovember: (data: MonthOverBudget) => void = () => {};
    vi.mocked(fetchOverBudget).mockReturnValueOnce(new Promise((r) => (resolveNovember = r)));
    vi.mocked(fetchOverBudget).mockResolvedValueOnce({ month: '2026-10', items: [] });
    render(<Harness />);
    await screen.findByRole('cell', { name: 'Monthly rent' });

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-10' } });
    await vi.waitFor(() => expect(fetchOverBudget).toHaveBeenLastCalledWith('2026-10'));
    resolveNovember(NOVEMBER_OVER);
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('TC-23: a future month in the next year says "in 01/2027"', async () => {
    vi.mocked(fetchOverBudget).mockResolvedValue({
      month: '2027-01',
      items: [{ categoryId: 6, categoryName: 'Other', spentMinor: 200_000, budgetMinor: 100_000, overMinor: 100_000 }],
    });

    render(<Harness initialMonth="2027-01" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('1 category is over budget in 01/2027');
    expect(bannerLines()).toEqual(['Other: 200.000 ₫ spent of 100.000 ₫ budget, 100.000 ₫ over']);
  });

  it('TC-22: the banner has no close button and no links', async () => {
    render(<Harness />);

    const banner = await screen.findByRole('alert');

    expect(within(banner).queryByRole('button')).not.toBeInTheDocument();
    expect(within(banner).queryByRole('link')).not.toBeInTheDocument();
  });
});
