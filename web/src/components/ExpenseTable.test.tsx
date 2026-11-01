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
    expect(cells).toEqual(['15/10/2026', 'Transport', 'Grab to office', '45.000 ₫']);
  });

  it('shows an empty state when there are no expenses', () => {
    render(<ExpenseTable expenses={[]} categories={categories} />);

    expect(screen.getByText('No expenses for this month.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
