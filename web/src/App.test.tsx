import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { createExpense, fetchCategories, fetchExpenses } from './api/client';
import type { Category, Expense } from './api/types';

vi.mock('./api/client', async (importActual) => ({
  ...(await importActual<typeof import('./api/client')>()),
  fetchCategories: vi.fn(),
  fetchExpenses: vi.fn(),
  createExpense: vi.fn(),
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

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 9, 30));
    vi.mocked(fetchCategories).mockResolvedValue(CATEGORIES);
    vi.mocked(fetchExpenses).mockResolvedValue({ items: [], monthTotalMinor: 0 });
    vi.mocked(createExpense).mockResolvedValue(saved);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

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
