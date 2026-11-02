import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchSummary } from '../api/client';
import type { MonthlySummary } from '../api/types';
import { SummaryPage } from './SummaryPage';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return { ...actual, fetchSummary: vi.fn() };
});

const fetchSummaryMock = vi.mocked(fetchSummary);

const november: MonthlySummary = {
  month: '2026-11',
  items: [{ categoryId: 3, categoryName: 'Housing', count: 1, totalMinor: 6_500_000 }],
  monthCount: 1,
  monthTotalMinor: 6_500_000,
};

const october: MonthlySummary = {
  month: '2026-10',
  items: [{ categoryId: 6, categoryName: 'Other', count: 1, totalMinor: 999_000 }],
  monthCount: 1,
  monthTotalMinor: 999_000,
};

describe('SummaryPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 9, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
    fetchSummaryMock.mockReset();
  });

  it('AC-2: opens with the heading "Summary" and the current month', async () => {
    fetchSummaryMock.mockResolvedValue(november);

    render(<SummaryPage />);

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByLabelText('Month')).toHaveValue('2026-11');
    expect(fetchSummaryMock).toHaveBeenCalledWith('2026-11');
    expect(await screen.findByRole('cell', { name: 'Housing' })).toBeInTheDocument();
  });

  it('AC-7: loads and shows the summary of the month picked', async () => {
    fetchSummaryMock.mockResolvedValueOnce(november).mockResolvedValueOnce(october);
    render(<SummaryPage />);
    await screen.findByRole('cell', { name: 'Housing' });

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-10' } });

    expect(fetchSummaryMock).toHaveBeenLastCalledWith('2026-10');
    expect(await screen.findByRole('cell', { name: 'Other' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Housing' })).not.toBeInTheDocument();
  });

  it('AC-10: shows "No expenses for this month." for an empty month', async () => {
    fetchSummaryMock.mockResolvedValue({ month: '2026-11', items: [], monthCount: 0, monthTotalMinor: 0 });

    render(<SummaryPage />);

    expect(await screen.findByText('No expenses for this month.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('AC-11: shows "Loading…" in place of the table until the data arrives', async () => {
    let resolve: (summary: MonthlySummary) => void = () => {};
    fetchSummaryMock.mockReturnValue(new Promise((r) => (resolve = r)));

    render(<SummaryPage />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    resolve(november);
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('AC-12: shows an alert and no table when the API returns an error', async () => {
    fetchSummaryMock.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'Unexpected error'));

    render(<SummaryPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the summary. Try again.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('AC-12: shows an alert when the API cannot be reached', async () => {
    fetchSummaryMock.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<SummaryPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the summary. Try again.');
  });

  it('AC-13: keeps the summary on screen and sends no request when the month is cleared', async () => {
    fetchSummaryMock.mockResolvedValue(november);
    render(<SummaryPage />);
    await screen.findByRole('cell', { name: 'Housing' });

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '' } });

    expect(fetchSummaryMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('cell', { name: 'Housing' })).toBeInTheDocument();
  });
});
