import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import {
  ApiError,
  createExpense,
  deleteExpense,
  fetchBudgets,
  fetchCategories,
  fetchExpense,
  fetchExpenses,
  fetchOverBudget,
  fetchSummary,
  restoreExpense,
  updateExpense,
} from './api/client';
import type { Category, Expense } from './api/types';

vi.mock('./api/client', async (importActual) => ({
  ...(await importActual<typeof import('./api/client')>()),
  fetchCategories: vi.fn(),
  fetchExpenses: vi.fn(),
  createExpense: vi.fn(),
  fetchSummary: vi.fn(),
  fetchBudgets: vi.fn(),
  fetchExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  restoreExpense: vi.fn(),
  fetchOverBudget: vi.fn(),
}));

const CATEGORIES: Category[] = [
  { id: 1, name: 'Food' },
  { id: 4, name: 'Health' },
];

const saved: Expense = { id: 40, date: '2026-09-15', amountMinor: 30_000, categoryId: 1, note: 'Pho' };

async function openList() {
  render(<App />);
  await screen.findByRole('heading', { name: 'Expenses' });
  await screen.findByRole('option', { name: 'Health' });
}

function filterControls() {
  return { month: screen.getByLabelText('Month'), category: screen.getByLabelText('Category') };
}

function navigateTo(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

describe('App', () => {
  beforeEach(() => {
    window.location.hash = '';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 9, 30));
    vi.mocked(fetchCategories).mockResolvedValue(CATEGORIES);
    vi.mocked(fetchExpenses).mockResolvedValue({ items: [], monthTotalMinor: 0 });
    vi.mocked(createExpense).mockResolvedValue(saved);
    vi.mocked(fetchSummary).mockResolvedValue({ month: '2026-11', items: [], monthCount: 0, monthTotalMinor: 0 });
    vi.mocked(fetchOverBudget).mockResolvedValue({ month: '2026-11', items: [] });
    vi.mocked(fetchBudgets).mockResolvedValue({
      month: '2026-11',
      items: CATEGORIES.map((c) => ({ categoryId: c.id, amountMinor: null })),
    });
  });

  afterEach(() => {
    window.location.hash = '';
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('header navigation (SPD-2)', () => {
    // SPD-4 AC-1 adds the "Budgets" link after "Summary".
    it('AC-1: shows the brand followed by the Expenses, Summary and Budgets links, with the current one active', async () => {
      render(<App />);

      const header = screen.getByRole('banner');
      expect(header).toHaveTextContent(/^SpendlyExpensesSummaryBudgets$/);
      expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Expenses', 'Summary', 'Budgets']);
      expect(screen.getByRole('link', { name: 'Expenses' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Summary' })).not.toHaveAttribute('aria-current');
      expect(await screen.findByText('No expenses for this month.')).toBeInTheDocument();
    });

    it('AC-2: switches between the expense list and the summary', async () => {
      render(<App />);
      expect(screen.getByRole('heading', { name: 'Expenses' })).toBeInTheDocument();

      navigateTo(screen.getByRole('link', { name: 'Summary' }).getAttribute('href') ?? '');

      expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Summary' })).toHaveAttribute('aria-current', 'page');
      await screen.findByText('No expenses for this month.');

      navigateTo(screen.getByRole('link', { name: 'Expenses' }).getAttribute('href') ?? '');

      expect(screen.getByRole('heading', { name: 'Expenses' })).toBeInTheDocument();
      await screen.findByText('No expenses for this month.');
    });

    it('AC-2: the expense list opens on the current month again after visiting the summary (BR-6)', async () => {
      await openList();
      fireEvent.change(filterControls().month, { target: { value: '2026-08' } });

      navigateTo('#/summary');
      navigateTo('#/');

      await screen.findByRole('option', { name: 'Health' });
      expect(filterControls().month).toHaveValue('2026-11');
    });
  });

  describe('budgets (SPD-4)', () => {
    it('AC-1: the header shows "Spendly" and the links Expenses, Summary, Budgets with the current one active', async () => {
      await openList();

      const banner = screen.getByRole('banner');
      expect(banner.firstElementChild).toHaveTextContent('Spendly');
      const links = screen.getAllByRole('link');
      expect(links.map((link) => link.textContent)).toEqual(['Expenses', 'Summary', 'Budgets']);
      expect(screen.getByRole('link', { name: 'Expenses' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Budgets' })).not.toHaveAttribute('aria-current');
    });

    it('AC-1, AC-2: "Budgets" opens the Budgets screen on the current month and marks its link active', async () => {
      await openList();
      fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));

      navigateTo(screen.getByRole('link', { name: 'Budgets' }).getAttribute('href') ?? '');

      expect(await screen.findByRole('heading', { name: 'Budgets' })).toBeInTheDocument();
      expect(screen.getByLabelText('Month')).toHaveValue('2026-11');
      expect(screen.getByRole('link', { name: 'Budgets' })).toHaveAttribute('aria-current', 'page');
      await screen.findByRole('textbox', { name: 'Food budget' });
      expect(fetchBudgets).toHaveBeenCalledWith('2026-11');

      navigateTo(screen.getByRole('link', { name: 'Expenses' }).getAttribute('href') ?? '');

      expect(await screen.findByRole('heading', { name: 'Expenses' })).toBeInTheDocument();
    });
  });

  describe('add expense (SPD-1)', () => {
    it('AC-1: shows a primary "Add expense" button in the title row next to the heading', async () => {
      await openList();

      const button = screen.getByRole('button', { name: 'Add expense' });
      expect(button.parentElement).toBe(screen.getByRole('heading', { name: 'Expenses' }).parentElement);
      expect(button.previousElementSibling).toBe(screen.getByRole('heading', { name: 'Expenses' }));
    });

    it('AC-2: "Add expense" opens the Add expense form', async () => {
      await openList();

      fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));

      expect(screen.getByRole('heading', { name: 'Add expense' })).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toHaveValue('2026-11-02');
    });

    it('AC-5, AC-7: after Save shows the month of the expense with "All categories"', async () => {
      await openList();
      fireEvent.change(filterControls().category, { target: { value: '4' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
      await screen.findByRole('option', { name: 'Food' });
      fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-15' } });
      fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '30000' } });
      fireEvent.change(screen.getByLabelText('Category'), { target: { value: '1' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await screen.findByRole('heading', { name: 'Expenses' });
      await waitFor(() => expect(filterControls().month).toHaveValue('2026-09'));
      expect(filterControls().category).toHaveDisplayValue('All categories');
      expect(fetchExpenses).toHaveBeenLastCalledWith('2026-09', undefined);
    });

    it('AC-11: Cancel returns to the list with the month and category it had before', async () => {
      await openList();
      fireEvent.change(filterControls().month, { target: { value: '2026-08' } });
      fireEvent.change(filterControls().category, { target: { value: '4' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
      fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50000' } });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await screen.findByRole('option', { name: 'Health' });
      expect(filterControls().month).toHaveValue('2026-08');
      expect(filterControls().category).toHaveValue('4');
      expect(createExpense).not.toHaveBeenCalled();
      expect(fetchExpenses).toHaveBeenLastCalledWith('2026-08', 4);
    });
  });

  describe('edit and delete (SPD-3)', () => {
    const E: Expense = { id: 7, date: '2026-11-02', amountMinor: 280_000, categoryId: 1, note: 'Groceries at Co.opmart' };
    const F: Expense = { id: 9, date: '2026-11-02', amountMinor: 20_000, categoryId: 1, note: 'Coffee' };

    function toast() {
      return screen.queryByRole('status');
    }

    function rowNotes() {
      return screen.queryAllByRole('row').slice(1).map((row) => row.children[2]?.textContent);
    }

    function monthTotal() {
      return screen.getByTestId('month-total').textContent?.replace(/\s/g, ' ');
    }

    async function setFilter(month: string, categoryId: string) {
      fireEvent.change(filterControls().month, { target: { value: month } });
      fireEvent.change(filterControls().category, { target: { value: categoryId } });
      await waitFor(() => expect(fetchExpenses).toHaveBeenLastCalledWith(month, categoryId ? Number(categoryId) : undefined));
    }

    async function openEdit(id = 7) {
      navigateTo(`#/expenses/${id}/edit`);
      await screen.findByRole('button', { name: 'Save' });
    }

    /** Deletes E through the Edit expense form while the list shows November 2026 filtered to Food. */
    async function deleteE() {
      await openList();
      await setFilter('2026-11', '1');
      await openEdit();
      vi.mocked(fetchExpenses).mockResolvedValue({ items: [F], monthTotalMinor: 20_000 });
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
      await screen.findByRole('heading', { name: 'Expenses' });
      await screen.findByText('Coffee');
    }

    beforeEach(() => {
      vi.mocked(fetchExpenses).mockResolvedValue({ items: [F, E], monthTotalMinor: 300_000 });
      vi.mocked(fetchExpense).mockImplementation(async (id) => {
        if (id === E.id) return E;
        throw new ApiError(404, 'NOT_FOUND', `expense ${id} does not exist`);
      });
      vi.mocked(updateExpense).mockImplementation(async (id, expense) => ({ id, ...expense }));
      vi.mocked(deleteExpense).mockResolvedValue(undefined);
      vi.mocked(restoreExpense).mockResolvedValue(E);
    });

    it('AC-1: each row has an "Edit" link that opens the Edit expense form of that expense', async () => {
      await openList();

      const links = screen.getAllByRole('link', { name: 'Edit' });
      expect(links.map((link) => link.getAttribute('href'))).toEqual(['#/expenses/9/edit', '#/expenses/7/edit']);
      navigateTo(links[1]!.getAttribute('href') ?? '');

      expect(await screen.findByRole('heading', { name: 'Edit expense' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Expenses' })).toHaveAttribute('aria-current', 'page');
      await waitFor(() => expect(screen.getByLabelText('Amount')).toHaveValue('280000'));
    });

    it('AC-2: the Edit expense route works on a reload', async () => {
      window.location.hash = '#/expenses/7/edit';
      render(<App />);

      expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toHaveValue('2026-11-02');
    });

    it('AC-4, AC-9: after Save shows the month of the expense with "All categories" and the saved values', async () => {
      await openList();
      await setFilter('2026-11', '1');
      await openEdit();
      fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '250000' } });
      fireEvent.change(screen.getByLabelText(/Note/), { target: { value: 'Groceries' } });
      vi.mocked(fetchExpenses).mockResolvedValue({
        items: [F, { ...E, amountMinor: 250_000, note: 'Groceries' }],
        monthTotalMinor: 270_000,
      });

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await screen.findByText('Groceries');
      expect(filterControls().month).toHaveValue('2026-11');
      expect(filterControls().category).toHaveDisplayValue('All categories');
      expect(fetchExpenses).toHaveBeenLastCalledWith('2026-11', undefined);
      expect(monthTotal()).toBe('270.000 ₫');
      expect(window.location.hash).toBe('#/');
    });

    it('AC-6: after a date change the list shows the new month with "All categories"', async () => {
      await openList();
      await openEdit();
      fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-28' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await screen.findByRole('heading', { name: 'Expenses' });
      await waitFor(() => expect(filterControls().month).toHaveValue('2026-10'));
      expect(filterControls().category).toHaveDisplayValue('All categories');
      expect(fetchExpenses).toHaveBeenLastCalledWith('2026-10', undefined);
    });

    it('AC-11: Cancel stores nothing and returns to the month and category the list had', async () => {
      await openList();
      await setFilter('2026-10', '1');
      await openEdit();
      fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1000' } });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await screen.findByRole('heading', { name: 'Expenses' });
      expect(filterControls().month).toHaveValue('2026-10');
      expect(filterControls().category).toHaveValue('1');
      expect(updateExpense).not.toHaveBeenCalled();
      expect(fetchExpenses).toHaveBeenLastCalledWith('2026-10', 1);
    });

    it('AC-24: "Back to expenses" opens the list on the current month with "All categories"', async () => {
      await openList();
      await setFilter('2026-10', '1');
      navigateTo('#/expenses/9999/edit');
      expect(await screen.findByRole('alert')).toHaveTextContent('This expense no longer exists.');

      fireEvent.click(screen.getByRole('link', { name: 'Back to expenses' }));

      await screen.findByRole('heading', { name: 'Expenses' });
      expect(filterControls().month).toHaveValue('2026-11');
      expect(filterControls().category).toHaveDisplayValue('All categories');
    });

    it('AC-20, AC-41: after a delete returns to the same month and category with the "Expense deleted." toast', async () => {
      await deleteE();

      expect(deleteExpense).toHaveBeenCalledWith(7);
      expect(filterControls().month).toHaveValue('2026-11');
      expect(filterControls().category).toHaveValue('1');
      expect(fetchExpenses).toHaveBeenLastCalledWith('2026-11', 1);
      expect(rowNotes()).toEqual(['Coffee']);
      expect(monthTotal()).toBe('20.000 ₫');
      const status = toast();
      expect(status).toHaveTextContent('Expense deleted.');
      expect(status).toHaveAttribute('aria-live', 'polite');
      const undo = within(status!).getByRole('button', { name: 'Undo' });
      // Reachable with Tab: a native, enabled button that is not taken out of the tab order.
      expect(undo.tagName).toBe('BUTTON');
      expect(undo).toBeEnabled();
      expect(undo.tabIndex).toBe(0);
      expect(undo).not.toHaveAttribute('tabindex');
      const tabbable = Array.from(document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea'))
        .filter((el) => !(el as HTMLButtonElement).disabled && el.tabIndex >= 0);
      expect(tabbable).toContain(undo);
    });

    it('AC-21: deleting the only expense shows the empty month with a total of 0 ₫ and the toast', async () => {
      await openList();
      await openEdit();
      vi.mocked(fetchExpenses).mockResolvedValue({ items: [], monthTotalMinor: 0 });

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));

      expect(await screen.findByText('No expenses for this month.')).toBeInTheDocument();
      expect(monthTotal()).toBe('0 ₫');
      expect(toast()).toHaveTextContent('Expense deleted.Undo');
    });

    it('AC-35, AC-37: "Undo" restores the expense, closes the toast and reloads the same month and category', async () => {
      await deleteE();
      vi.mocked(fetchExpenses).mockResolvedValue({ items: [F, E], monthTotalMinor: 300_000 });

      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

      await waitFor(() => expect(toast()).not.toBeInTheDocument());
      expect(restoreExpense).toHaveBeenCalledWith(7);
      await waitFor(() => expect(rowNotes()).toEqual(['Coffee', 'Groceries at Co.opmart']));
      expect(monthTotal()).toBe('300.000 ₫');
      expect(fetchExpenses).toHaveBeenLastCalledWith('2026-11', 1);
    });

    describe('toast timing', () => {
      beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
        vi.setSystemTime(new Date(2026, 10, 2, 9, 30));
      });

      it('AC-36: the toast closes after 5 seconds and the deletion stays', async () => {
        await deleteE();
        const callsBefore = vi.mocked(fetchExpenses).mock.calls.length;

        act(() => vi.advanceTimersByTime(4900));
        expect(toast()).toBeInTheDocument();
        act(() => vi.advanceTimersByTime(200));

        expect(toast()).not.toBeInTheDocument();
        expect(restoreExpense).not.toHaveBeenCalled();
        expect(vi.mocked(fetchExpenses).mock.calls.length).toBe(callsBefore);
      });

      it('AC-39: while restoring, "Undo" is disabled, one request is sent and the toast stays past 5 seconds', async () => {
        let resolve: (expense: Expense) => void = () => {};
        vi.mocked(restoreExpense).mockReturnValue(new Promise((r) => (resolve = r)));
        await deleteE();
        const undo = screen.getByRole('button', { name: 'Undo' });

        fireEvent.click(undo);
        fireEvent.click(undo);
        act(() => vi.advanceTimersByTime(8000));

        expect(toast()).toBeInTheDocument();
        expect(undo).toBeDisabled();
        expect(restoreExpense).toHaveBeenCalledTimes(1);
        await act(async () => resolve(E));
        expect(toast()).not.toBeInTheDocument();
      });

      it('AC-40: a failed restore shows "Could not restore the expense." without Undo, closing 5 seconds later', async () => {
        vi.mocked(restoreExpense).mockRejectedValue(new TypeError('Failed to fetch'));
        await deleteE();

        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

        await waitFor(() => expect(toast()).toHaveTextContent('Could not restore the expense.'));
        expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
        expect(rowNotes()).toEqual(['Coffee']);
        act(() => vi.advanceTimersByTime(5000));
        expect(toast()).not.toBeInTheDocument();
      });
    });

    it('AC-38: the toast closes when the user opens "Add expense" and does not come back', async () => {
      await deleteE();

      fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await screen.findByText('Coffee');
      expect(toast()).not.toBeInTheDocument();
      expect(restoreExpense).not.toHaveBeenCalled();
    });

    it('AC-38: the toast closes when the user opens "Edit" on another row', async () => {
      vi.mocked(fetchExpense).mockResolvedValue(F);
      await deleteE();

      navigateTo('#/expenses/9/edit');
      await screen.findByRole('heading', { name: 'Edit expense' });
      fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

      await screen.findByText('Coffee');
      expect(toast()).not.toBeInTheDocument();
    });

    it('AC-38: the toast closes when the user opens Summary', async () => {
      await deleteE();

      navigateTo('#/summary');
      navigateTo('#/');

      await screen.findByRole('heading', { name: 'Expenses' });
      expect(toast()).not.toBeInTheDocument();
      expect(restoreExpense).not.toHaveBeenCalled();
    });
  });
});
