import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./api/client', () => ({
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchExpenses: vi.fn().mockResolvedValue({ items: [], monthTotalMinor: 0 }),
  fetchSummary: vi.fn().mockResolvedValue({ month: '2026-11', items: [], monthCount: 0, monthTotalMinor: 0 }),
}));

function navigateTo(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

describe('App', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('AC-1: shows the brand followed by the Expenses and Summary links, with the current one active', async () => {
    render(<App />);

    const header = screen.getByRole('banner');
    expect(header).toHaveTextContent(/^SpendlyExpensesSummary$/);
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Expenses', 'Summary']);
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
});
