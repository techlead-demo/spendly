import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MonthlySummary } from '../api/types';
import { SummaryTable } from './SummaryTable';

// Intl uses a non-breaking space between the number and the currency sign.
const normalize = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

const exampleMonth: MonthlySummary = {
  month: '2026-11',
  items: [
    { categoryId: 3, categoryName: 'Housing', count: 1, totalMinor: 6_500_000 },
    { categoryId: 1, categoryName: 'Food', count: 2, totalMinor: 205_000 },
    { categoryId: 2, categoryName: 'Transport', count: 1, totalMinor: 50_000 },
    { categoryId: 4, categoryName: 'Health', count: 1, totalMinor: 50_000 },
  ],
  monthCount: 5,
  monthTotalMinor: 6_805_000,
};

function bodyRows(): string[][] {
  const rows = within(screen.getAllByRole('rowgroup')[1]!).getAllByRole('row');
  return rows.map((row) => within(row).getAllByRole('cell').map((cell) => normalize(cell.textContent)));
}

function footerCells(): string[] {
  const footer = screen.getAllByRole('rowgroup')[2]!;
  return within(footer).getAllByRole('cell').map((cell) => normalize(cell.textContent));
}

describe('SummaryTable', () => {
  it('AC-3, AC-5: shows one row per category in the given order with count and formatted total', () => {
    render(<SummaryTable summary={exampleMonth} />);

    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Category',
      'Expenses',
      'Total',
      'Share',
    ]);
    expect(bodyRows().map((cells) => cells.slice(0, 3))).toEqual([
      ['Housing', '1', '6.500.000 ₫'],
      ['Food', '2', '205.000 ₫'],
      ['Transport', '1', '50.000 ₫'],
      ['Health', '1', '50.000 ₫'],
    ]);
    expect(screen.queryByText('Entertainment')).not.toBeInTheDocument();
    expect(screen.queryByText('Other')).not.toBeInTheDocument();
  });

  it('AC-4: shows the month count and total in the footer', () => {
    render(<SummaryTable summary={exampleMonth} />);

    expect(footerCells().slice(0, 3)).toEqual(['Month total', '5', '6.805.000 ₫']);
  });

  it('AC-17: shows each share in a fourth column and 100,0% in the footer', () => {
    render(<SummaryTable summary={exampleMonth} />);

    expect(bodyRows().map((cells) => [cells[0], cells[3]])).toEqual([
      ['Housing', '95,5%'],
      ['Food', '3,0%'],
      ['Transport', '0,7%'],
      ['Health', '0,7%'],
    ]);
    expect(footerCells()[3]).toBe('100,0%');
  });

  it('AC-18: rounds shares half up without adjusting them to add up to 100,0%', () => {
    render(
      <SummaryTable
        summary={{
          month: '2026-09',
          items: [
            { categoryId: 1, categoryName: 'Food', count: 1, totalMinor: 1_999 },
            { categoryId: 6, categoryName: 'Other', count: 1, totalMinor: 1 },
          ],
          monthCount: 2,
          monthTotalMinor: 2_000,
        }}
      />,
    );

    expect(bodyRows().map((cells) => [cells[0], cells[3]])).toEqual([
      ['Food', '100,0%'],
      ['Other', '0,1%'],
    ]);
    expect(footerCells()[3]).toBe('100,0%');
  });

  it('AC-19: lists a category with a share below 0,05% as 0,0%', () => {
    render(
      <SummaryTable
        summary={{
          month: '2026-08',
          items: [
            { categoryId: 3, categoryName: 'Housing', count: 1, totalMinor: 6_805_000 },
            { categoryId: 6, categoryName: 'Other', count: 1, totalMinor: 1 },
          ],
          monthCount: 2,
          monthTotalMinor: 6_805_001,
        }}
      />,
    );

    expect(bodyRows()[1]).toEqual(['Other', '1', '1 ₫', '0,0%']);
  });

  it('AC-9, AC-20: shows a single 1 ₫ expense as one row and the footer, both at 100,0%', () => {
    render(
      <SummaryTable
        summary={{
          month: '2025-06',
          items: [{ categoryId: 6, categoryName: 'Other', count: 1, totalMinor: 1 }],
          monthCount: 1,
          monthTotalMinor: 1,
        }}
      />,
    );

    expect(bodyRows()).toEqual([['Other', '1', '1 ₫', '100,0%']]);
    expect(footerCells()).toEqual(['Month total', '1', '1 ₫', '100,0%']);
  });

  it('AC-10: shows the empty text instead of a table for a month without expenses', () => {
    render(<SummaryTable summary={{ month: '2020-01', items: [], monthCount: 0, monthTotalMinor: 0 }} />);

    expect(screen.getByText('No expenses for this month.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
