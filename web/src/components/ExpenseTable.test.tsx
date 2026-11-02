import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Category, Expense } from '../api/types';
import { ExpenseTable } from './ExpenseTable';

const categories: Category[] = [
  { id: 1, name: 'Food' },
  { id: 2, name: 'Transport' },
];

const expenses: Expense[] = [
  { id: 2, date: '2026-10-15', amountMinor: 45_000, categoryId: 2, note: 'Grab to office' },
  { id: 1, date: '2026-10-01', amountMinor: 1_250_000, categoryId: 1, note: null },
];

describe('ExpenseTable', () => {
  it('renders one row per expense with date, category name, note and formatted amount', () => {
    render(<ExpenseTable expenses={expenses} categories={categories} />);

    const rows = within(screen.getAllByRole('rowgroup')[1]!).getAllByRole('row');
    expect(rows).toHaveLength(2);
    const cells = within(rows[0]!).getAllByRole('cell').map((cell) => cell.textContent?.replace(/\s/g, ' '));
    expect(cells).toEqual(['15/10/2026', 'Transport', 'Grab to office', '45.000 ₫', 'Edit']);
  });

  it('AC-1: shows an "Edit" link to the Edit expense screen in the last column of every row, without a header', () => {
    render(<ExpenseTable expenses={expenses} categories={categories} />);

    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual(['Date', 'Category', 'Note', 'Amount', '']);
    const rows = within(screen.getAllByRole('rowgroup')[1]!).getAllByRole('row');
    expect(rows.map((row) => within(row).getByRole('link', { name: 'Edit' }).getAttribute('href'))).toEqual([
      '#/expenses/2/edit',
      '#/expenses/1/edit',
    ]);
  });

  it('AC-1: shows an empty state without Edit links when there are no expenses', () => {
    render(<ExpenseTable expenses={[]} categories={categories} />);

    expect(screen.getByText('No expenses for this month.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
  });
});
