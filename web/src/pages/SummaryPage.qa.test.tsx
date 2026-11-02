import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSummary } from '../api/client';
import type { CategorySummary, MonthlySummary } from '../api/types';
import { SummaryPage } from './SummaryPage';

// QA cases for SPD-2 (specs/SPD-2/test-cases.md), checked through the whole Summary page.

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return { ...actual, fetchSummary: vi.fn() };
});

const fetchSummaryMock = vi.mocked(fetchSummary);

// Intl puts a non-breaking space before "₫".
const normalize = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

const NAMES: Record<number, string> = {
  1: 'Food',
  2: 'Transport',
  3: 'Housing',
  4: 'Health',
  5: 'Entertainment',
  6: 'Other',
};

function item(categoryId: number, count: number, totalMinor: number): CategorySummary {
  return { categoryId, categoryName: NAMES[categoryId]!, count, totalMinor };
}

function summaryOf(month: string, items: CategorySummary[]): MonthlySummary {
  return {
    month,
    items,
    monthCount: items.reduce((sum, i) => sum + i.count, 0),
    monthTotalMinor: items.reduce((sum, i) => sum + i.totalMinor, 0),
  };
}

async function renderWith(summary: MonthlySummary) {
  fetchSummaryMock.mockResolvedValue(summary);
  render(<SummaryPage />);
  return screen.findByRole('table');
}

function rowsOf(table: HTMLElement, section: 'tbody' | 'tfoot'): string[][] {
  return Array.from(table.querySelectorAll(`${section} tr`)).map((row) =>
    within(row as HTMLElement)
      .getAllByRole('cell')
      .map((cell) => normalize(cell.textContent)),
  );
}

describe('SummaryPage (QA)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 9, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
    fetchSummaryMock.mockReset();
  });

  it('TC-4, TC-6, TC-7, TC-20 (AC-3, AC-4, AC-5, AC-17): shows the example month with shares and footer', async () => {
    const table = await renderWith(
      summaryOf('2026-11', [item(3, 1, 6_500_000), item(1, 2, 205_000), item(2, 1, 50_000), item(4, 1, 50_000)]),
    );

    expect(fetchSummaryMock).toHaveBeenCalledWith('2026-11');
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Category',
      'Expenses',
      'Total',
      'Share',
    ]);
    expect(rowsOf(table, 'tbody')).toEqual([
      ['Housing', '1', '6.500.000 ₫', '95,5%'],
      ['Food', '2', '205.000 ₫', '3,0%'],
      ['Transport', '1', '50.000 ₫', '0,7%'],
      ['Health', '1', '50.000 ₫', '0,7%'],
    ]);
    expect(rowsOf(table, 'tfoot')).toEqual([['Month total', '5', '6.805.000 ₫', '100,0%']]);
    expect(within(table).queryByText('Entertainment')).not.toBeInTheDocument();
    expect(within(table).queryByText('Other')).not.toBeInTheDocument();
  });

  it('TC-12, TC-23 (AC-9, AC-20): shows a single 1 ₫ expense as one row and the footer at 100,0%', async () => {
    const table = await renderWith(summaryOf('2026-11', [item(6, 1, 1)]));

    expect(rowsOf(table, 'tbody')).toEqual([['Other', '1', '1 ₫', '100,0%']]);
    expect(rowsOf(table, 'tfoot')).toEqual([['Month total', '1', '1 ₫', '100,0%']]);
  });

  it('TC-21 (AC-18): rounds 99,95% and 0,05% half up and does not adjust the rows', async () => {
    const table = await renderWith(summaryOf('2026-11', [item(1, 1, 1_999), item(6, 1, 1)]));

    expect(rowsOf(table, 'tbody').map((cells) => [cells[0], cells[3]])).toEqual([
      ['Food', '100,0%'],
      ['Other', '0,1%'],
    ]);
    expect(rowsOf(table, 'tfoot')[0]![3]).toBe('100,0%');
  });

  it('TC-22 (AC-19): lists Other with 0,0% next to Housing 6.805.000 ₫', async () => {
    const table = await renderWith(summaryOf('2026-11', [item(3, 1, 6_805_000), item(6, 1, 1)]));

    expect(rowsOf(table, 'tbody')).toEqual([
      ['Housing', '1', '6.805.000 ₫', '100,0%'],
      ['Other', '1', '1 ₫', '0,0%'],
    ]);
  });

  it('TC-25: shows exact shares and totals for very large month totals', async () => {
    const table = await renderWith(summaryOf('2026-11', [item(3, 3, 27_000_000_000), item(1, 1, 1)]));

    expect(rowsOf(table, 'tbody')).toEqual([
      ['Housing', '3', '27.000.000.000 ₫', '100,0%'],
      ['Food', '1', '1 ₫', '0,0%'],
    ]);
    expect(rowsOf(table, 'tfoot')).toEqual([['Month total', '4', '27.000.000.001 ₫', '100,0%']]);
  });

  it.each([
    [1, 3, '25,0%', '75,0%'],
    [1, 7, '12,5%', '87,5%'],
    [3, 1_997, '0,2%', '99,9%'],
    [9, 1_991, '0,5%', '99,6%'],
    [201, 1_799, '10,1%', '90,0%'],
    [1, 2, '33,3%', '66,7%'],
  ])('TC-26: rounds Food %i ₫ and Other %i ₫ half up exactly', async (food, other, foodShare, otherShare) => {
    const items = food >= other ? [item(1, 1, food), item(6, 1, other)] : [item(6, 1, other), item(1, 1, food)];
    const table = await renderWith(summaryOf('2026-11', items));

    const shares = Object.fromEntries(rowsOf(table, 'tbody').map((cells) => [cells[0], cells[3]]));
    expect(shares).toEqual({ Food: foodShare, Other: otherShare });
  });
});
