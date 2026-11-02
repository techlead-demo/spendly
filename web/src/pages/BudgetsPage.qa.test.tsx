import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchBudgets, fetchCategories, saveBudgets } from '../api/client';
import type { Budget, Category, MonthBudgets } from '../api/types';
import { BudgetsPage } from './BudgetsPage';

// QA tests for SPD-4 (specs/SPD-4/test-cases.md), complementing BudgetsPage.test.tsx.

vi.mock('../api/client', async (importActual) => ({
  ...(await importActual<typeof import('../api/client')>()),
  fetchCategories: vi.fn(),
  fetchBudgets: vi.fn(),
  saveBudgets: vi.fn(),
}));

const NAMES = ['Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Other'];
const CATEGORIES: Category[] = NAMES.map((name, index) => ({
  id: index + 1,
  name,
  status: 'active',
  expenseCount: 0,
}));
const FOOD = 1;
const TRANSPORT = 2;
const ENTERTAINMENT = 5;
const HINT = 'A budget applies to this month and every later month until you change it. Leave it empty for no limit.';
const FIELD_MESSAGE = 'Enter a whole amount in đồng, greater than 0.';
const BANNER = 'Please fix the highlighted fields.';

function monthBudgets(month: string, amounts: Record<number, number> = {}): MonthBudgets {
  return { month, items: CATEGORIES.map((c) => ({ categoryId: c.id, amountMinor: amounts[c.id] ?? null })) };
}

function field(name: string): HTMLInputElement {
  return screen.getByRole('textbox', { name: `${name} budget` });
}

function monthPicker(): HTMLInputElement {
  return screen.getByLabelText('Month');
}

async function openPage() {
  render(<BudgetsPage />);
  await screen.findByRole('textbox', { name: 'Food budget' });
}

function type(name: string, value: string) {
  fireEvent.change(field(name), { target: { value } });
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}

function isBefore(a: Element, b: Element): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe('SPD-4 QA: BudgetsPage', () => {
  let byMonth: Record<string, Record<number, number>>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 9, 30));
    byMonth = {};
    vi.mocked(fetchCategories).mockResolvedValue(CATEGORIES);
    vi.mocked(fetchBudgets).mockImplementation(async (month) => monthBudgets(month, byMonth[month]));
    vi.mocked(saveBudgets).mockImplementation(async (month, items: Budget[]) => {
      const amounts = { ...byMonth[month] };
      for (const item of items) {
        if (item.amountMinor === null) delete amounts[item.categoryId];
        else amounts[item.categoryId] = item.amountMinor;
      }
      byMonth[month] = amounts;
      return monthBudgets(month, amounts);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('TC-3 (AC-3): six rows in the fixed order, empty "No limit" fields with "₫", the hint above the table', async () => {
    await openPage();

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(6);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual(NAMES);
    for (const name of NAMES) {
      expect(field(name)).toHaveValue('');
      expect(field(name)).toHaveAttribute('placeholder', 'No limit');
      expect(field(name)).toBeEnabled();
    }
    expect(screen.getAllByText('₫')).toHaveLength(6);
    expect(isBefore(screen.getByText(HINT), screen.getByRole('table'))).toBe(true);
    expect(screen.queryByText('Budgets saved.')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('TC-11 (AC-10): Save without changes shows "Budgets saved." and sends nothing', async () => {
    byMonth['2026-11'] = { [FOOD]: 700_000, [ENTERTAINMENT]: 300_000 };
    await openPage();

    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(saveBudgets).not.toHaveBeenCalled();
    expect(field('Food')).toHaveValue('700000');
    expect(field('Entertainment')).toHaveValue('300000');
  });

  it('TC-11 (AC-10): retyping the same value (also with spaces) is not a change', async () => {
    byMonth['2026-11'] = { [FOOD]: 700_000 };
    await openPage();
    type('Food', ' 700000 ');
    type('Transport', '  ');

    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(saveBudgets).not.toHaveBeenCalled();
  });

  it('TC-12 (AC-11): changing only Entertainment sends only Entertainment', async () => {
    byMonth['2026-11'] = { [FOOD]: 700_000, [ENTERTAINMENT]: 300_000 };
    await openPage();

    type('Entertainment', '350000');
    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(saveBudgets).toHaveBeenCalledTimes(1);
    expect(saveBudgets).toHaveBeenCalledWith('2026-11', [{ categoryId: ENTERTAINMENT, amountMinor: 350_000 }]);
  });

  it.each(['0', '-5000', '12,5', '12.5', '700.000', 'abc', '00', '1e5', '+5000'])(
    'TC-13 (AC-12): Food %j blocks the save of every category and shows the banner above the table',
    async (value) => {
      await openPage();
      type('Food', value);
      type('Entertainment', '300000');

      clickSave();

      const banner = screen.getByRole('alert');
      expect(banner).toHaveTextContent(BANNER);
      expect(isBefore(banner, screen.getByRole('table'))).toBe(true);
      expect(field('Food')).toHaveAttribute('aria-invalid', 'true');
      const foodRow = field('Food').closest('tr') as HTMLElement;
      expect(within(foodRow).getByText(FIELD_MESSAGE)).toBeInTheDocument();
      expect(screen.getAllByText(FIELD_MESSAGE)).toHaveLength(1);
      expect(saveBudgets).not.toHaveBeenCalled();
      expect(screen.queryByText('Budgets saved.')).not.toBeInTheDocument();
    },
  );

  it('TC-14 (AC-13): Food and Transport invalid: both messages, nothing saved, focus on Food', async () => {
    await openPage();
    type('Food', 'abc');
    type('Transport', '0');
    field('Transport').focus();

    clickSave();

    expect(screen.getAllByText(FIELD_MESSAGE)).toHaveLength(2);
    expect(field('Food')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Transport')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Food')).toHaveFocus();
    expect(saveBudgets).not.toHaveBeenCalled();
  });

  it('TC-14 (AC-13): only Transport invalid moves focus to Transport', async () => {
    await openPage();
    type('Transport', '-1');

    clickSave();

    expect(field('Transport')).toHaveFocus();
    expect(field('Food')).not.toHaveAttribute('aria-invalid');
  });

  it('TC-15 (AC-14): correcting both fields saves, shows "Budgets saved." and removes banner and messages', async () => {
    await openPage();
    type('Food', 'abc');
    type('Transport', '0');
    clickSave();
    expect(screen.getAllByText(FIELD_MESSAGE)).toHaveLength(2);

    type('Food', '700000');
    type('Transport', '50000');
    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
    expect(screen.queryByText(FIELD_MESSAGE)).not.toBeInTheDocument();
    expect(saveBudgets).toHaveBeenCalledWith('2026-11', [
      { categoryId: FOOD, amountMinor: 700_000 },
      { categoryId: TRANSPORT, amountMinor: 50_000 },
    ]);
  });

  it('TC-17 (AC-16): "  700000  " is saved as 700000; a field of only spaces is no budget', async () => {
    await openPage();
    type('Food', '  700000  ');
    type('Health', '     ');

    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(saveBudgets).toHaveBeenCalledWith('2026-11', [{ categoryId: FOOD, amountMinor: 700_000 }]);
    expect(field('Food')).toHaveValue('700000');
    expect(field('Health')).toHaveValue('');
  });

  it('TC-18 (AC-17): typing 2026-10 shows its budgets read-only, no Save, the past-month text replaces the hint', async () => {
    byMonth['2026-10'] = { [FOOD]: 700_000 };
    await openPage();

    fireEvent.change(monthPicker(), { target: { value: '2026-10' } });

    await waitFor(() => expect(field('Food')).toHaveValue('700000'));
    for (const name of NAMES) expect(field(name)).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getByText('Past months cannot be changed.')).toBeInTheDocument();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
    expect(saveBudgets).not.toHaveBeenCalled();

    fireEvent.change(monthPicker(), { target: { value: '2026-11' } });
    await waitFor(() => expect(field('Food')).toBeEnabled());
    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('TC-19 (AC-18): on 2026-12-01 the screen opens on 2026-12 with min 2026-12', async () => {
    vi.setSystemTime(new Date(2026, 11, 1, 0, 0, 5));
    byMonth['2026-12'] = { [FOOD]: 700_000 };

    await openPage();

    expect(monthPicker()).toHaveValue('2026-12');
    expect(monthPicker()).toHaveAttribute('min', '2026-12');
    expect(fetchBudgets).toHaveBeenCalledWith('2026-12');
    expect(field('Food')).toHaveValue('700000');
  });

  it('TC-20 (AC-19): edits and validation errors are discarded when the month changes', async () => {
    byMonth['2026-12'] = { [FOOD]: 700_000 };
    await openPage();
    type('Food', 'abc');
    type('Other', '5000');
    clickSave();
    expect(screen.getByRole('alert')).toHaveTextContent(BANNER);

    fireEvent.change(monthPicker(), { target: { value: '2026-12' } });

    await waitFor(() => expect(field('Food')).toHaveValue('700000'));
    expect(field('Other')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(FIELD_MESSAGE)).not.toBeInTheDocument();

    fireEvent.change(monthPicker(), { target: { value: '2026-11' } });
    await waitFor(() => expect(fetchBudgets).toHaveBeenLastCalledWith('2026-11'));
    await waitFor(() => expect(field('Other')).toHaveValue(''));
    expect(field('Food')).toHaveValue('');
  });

  it('TC-21 (AC-20): clearing the Month picker keeps edits and budgets and sends no request', async () => {
    byMonth['2026-11'] = { [FOOD]: 700_000 };
    await openPage();
    type('Health', '90000');

    fireEvent.change(monthPicker(), { target: { value: '' } });

    expect(field('Food')).toHaveValue('700000');
    expect(fetchBudgets).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('TC-22 (AC-21): "Loading…" replaces the table while a newly selected month loads', async () => {
    await openPage();
    let finish: (data: MonthBudgets) => void = () => {};
    vi.mocked(fetchBudgets).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );

    fireEvent.change(monthPicker(), { target: { value: '2027-02' } });

    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    finish(monthBudgets('2027-02', { [FOOD]: 1 }));
    await waitFor(() => expect(field('Food')).toHaveValue('1'));
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('TC-23 (AC-22): a load error of a later month shows the alert and no table', async () => {
    await openPage();
    vi.mocked(fetchBudgets).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error'));

    fireEvent.change(monthPicker(), { target: { value: '2027-02' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the budgets. Try again.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('TC-25 (AC-23): a 400 response shows its message above the table and keeps every edit', async () => {
    vi.mocked(saveBudgets).mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'categoryId 5 does not exist'));
    await openPage();
    type('Food', '700000');
    type('Entertainment', '300000');

    clickSave();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('categoryId 5 does not exist');
    expect(alert).not.toHaveTextContent('Could not save the budgets. Try again.');
    expect(isBefore(alert, screen.getByRole('table'))).toBe(true);
    expect(field('Food')).toHaveValue('700000');
    expect(field('Entertainment')).toHaveValue('300000');
    expect(screen.queryByText('Budgets saved.')).not.toBeInTheDocument();
  });

  it('TC-24 (AC-23): after a failed save, a second Save that succeeds hides the error and shows "Budgets saved."', async () => {
    vi.mocked(saveBudgets).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await openPage();
    type('Food', '700000');
    clickSave();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the budgets. Try again.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());

    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(saveBudgets).toHaveBeenCalledTimes(2);
  });

  it('TC-35: "Budgets saved." disappears when the month changes', async () => {
    await openPage();
    type('Food', '700000');
    clickSave();
    await screen.findByText('Budgets saved.');

    fireEvent.change(monthPicker(), { target: { value: '2026-12' } });

    await screen.findByRole('textbox', { name: 'Food budget' });
    expect(screen.queryByText('Budgets saved.')).not.toBeInTheDocument();
  });

  it('TC-35: Save is disabled while a save is running, so a double click sends one request', async () => {
    let finish: (data: MonthBudgets) => void = () => {};
    vi.mocked(saveBudgets).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await openPage();
    type('Food', '700000');

    clickSave();
    clickSave();

    expect(saveBudgets).toHaveBeenCalledTimes(1);
    finish(monthBudgets('2026-11', { [FOOD]: 700_000 }));
    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
  });
});
