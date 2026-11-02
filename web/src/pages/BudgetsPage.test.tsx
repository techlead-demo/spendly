import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchBudgets, fetchCategories, saveBudgets } from '../api/client';
import type { Budget, Category, MonthBudgets } from '../api/types';
import { BudgetsPage } from './BudgetsPage';

vi.mock('../api/client', async (importActual) => ({
  ...(await importActual<typeof import('../api/client')>()),
  fetchCategories: vi.fn(),
  fetchBudgets: vi.fn(),
  saveBudgets: vi.fn(),
}));

const NAMES = ['Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Other'];
const CATEGORIES: Category[] = NAMES.map((name, index) => ({ id: index + 1, name }));
const FOOD = 1;
const TRANSPORT = 2;
const ENTERTAINMENT = 5;
const HINT = 'A budget applies to this month and every later month until you change it. Leave it empty for no limit.';
const FIELD_MESSAGE = 'Enter a whole amount in đồng, greater than 0.';

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

describe('BudgetsPage', () => {
  // Budgets "on the server" per month, as the API would return them.
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

  it('AC-2: opens on the current month with the heading "Budgets"', async () => {
    await openPage();

    expect(screen.getByRole('heading', { name: 'Budgets' })).toBeInTheDocument();
    expect(monthPicker()).toHaveValue('2026-11');
    expect(monthPicker()).toHaveAttribute('min', '2026-11');
    expect(fetchBudgets).toHaveBeenCalledWith('2026-11');
  });

  it('AC-3: lists the six categories in order with empty fields, "No limit", "₫" and the hint', async () => {
    await openPage();

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual(NAMES);
    for (const name of NAMES) {
      expect(field(name)).toHaveValue('');
      expect(field(name)).toHaveAttribute('placeholder', 'No limit');
      expect(field(name).parentElement).toHaveTextContent('₫');
    }
    expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Monthly budget' })).toBeInTheDocument();
    expect(screen.getByText(HINT)).toBeInTheDocument();
  });

  it('AC-4: saves the entered budgets and shows "Budgets saved."', async () => {
    await openPage();
    type('Food', '700000');
    type('Entertainment', '300000');

    clickSave();

    expect(await screen.findByRole('status')).toHaveTextContent('Budgets saved.');
    expect(saveBudgets).toHaveBeenCalledWith('2026-11', [
      { categoryId: FOOD, amountMinor: 700_000 },
      { categoryId: ENTERTAINMENT, amountMinor: 300_000 },
    ]);
    expect(field('Food')).toHaveValue('700000');
    expect(field('Entertainment')).toHaveValue('300000');
    expect(field('Transport')).toHaveValue('');
  });

  it('AC-4: shows the stored budgets after reloading the screen', async () => {
    byMonth['2026-11'] = { [FOOD]: 700_000, [ENTERTAINMENT]: 300_000 };

    await openPage();

    expect(field('Food')).toHaveValue('700000');
    expect(field('Entertainment')).toHaveValue('300000');
    expect(field('Other')).toHaveValue('');
  });

  it('AC-5, AC-6: selecting a later month shows its budgets in effect and saves from that month', async () => {
    byMonth['2027-01'] = { [FOOD]: 700_000, [ENTERTAINMENT]: 300_000 };
    await openPage();

    fireEvent.change(monthPicker(), { target: { value: '2027-01' } });
    await waitFor(() => expect(field('Food')).toHaveValue('700000'));
    type('Food', '800000');
    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(saveBudgets).toHaveBeenCalledWith('2027-01', [{ categoryId: FOOD, amountMinor: 800_000 }]);
  });

  it('AC-8: a cleared field removes the budget from the selected month', async () => {
    byMonth['2027-03'] = { [FOOD]: 800_000 };
    await openPage();
    fireEvent.change(monthPicker(), { target: { value: '2027-03' } });
    await waitFor(() => expect(field('Food')).toHaveValue('800000'));

    type('Food', '');
    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(saveBudgets).toHaveBeenCalledWith('2027-03', [{ categoryId: FOOD, amountMinor: null }]);
    expect(field('Food')).toHaveValue('');
  });

  it('AC-9: a budget entered in an empty field is saved from the selected month', async () => {
    await openPage();
    fireEvent.change(monthPicker(), { target: { value: '2027-05' } });
    await waitFor(() => expect(fetchBudgets).toHaveBeenLastCalledWith('2027-05'));
    await screen.findByRole('textbox', { name: 'Food budget' });

    type('Food', '600000');
    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(saveBudgets).toHaveBeenCalledWith('2027-05', [{ categoryId: FOOD, amountMinor: 600_000 }]);
  });

  it('AC-10: Save without changes shows "Budgets saved." and stores nothing', async () => {
    byMonth['2026-11'] = { [FOOD]: 700_000 };
    await openPage();

    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(saveBudgets).not.toHaveBeenCalled();
    expect(field('Food')).toHaveValue('700000');
  });

  it('AC-11: only the changed categories are sent', async () => {
    byMonth['2026-11'] = { [FOOD]: 700_000, [ENTERTAINMENT]: 300_000 };
    await openPage();

    type('Entertainment', '250000');
    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(saveBudgets).toHaveBeenCalledWith('2026-11', [{ categoryId: ENTERTAINMENT, amountMinor: 250_000 }]);
    expect(field('Food')).toHaveValue('700000');
  });

  it.each(['0', '-5000', '12,5', '12.5', '700.000', 'abc'])(
    'AC-12: %j saves nothing and marks Food invalid with the banner and message',
    async (value) => {
      await openPage();
      type('Food', value);
      type('Entertainment', '300000');

      clickSave();

      expect(screen.getByRole('alert')).toHaveTextContent('Please fix the highlighted fields.');
      expect(field('Food')).toHaveAttribute('aria-invalid', 'true');
      expect(field('Food')).toHaveAccessibleDescription(FIELD_MESSAGE);
      expect(field('Entertainment')).not.toHaveAttribute('aria-invalid');
      expect(saveBudgets).not.toHaveBeenCalled();
      expect(screen.queryByText('Budgets saved.')).not.toBeInTheDocument();
    },
  );

  it('AC-12: the banner is shown above the table', async () => {
    await openPage();
    type('Food', 'abc');

    clickSave();

    const alert = screen.getByRole('alert');
    expect(alert.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('AC-13: marks every invalid field and focuses the first one in table order', async () => {
    await openPage();
    type('Transport', 'abc');
    type('Food', '0');

    clickSave();

    expect(screen.getAllByText(FIELD_MESSAGE)).toHaveLength(2);
    expect(field('Food')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Transport')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Food')).toHaveFocus();
    expect(saveBudgets).not.toHaveBeenCalled();
  });

  it('AC-14: after correcting the fields, Save stores the budgets and clears the errors', async () => {
    await openPage();
    type('Food', 'abc');
    clickSave();

    type('Food', '700000');
    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(FIELD_MESSAGE)).not.toBeInTheDocument();
    expect(field('Food')).not.toHaveAttribute('aria-invalid');
  });

  it('AC-15: saves 1 đồng and shows 1', async () => {
    await openPage();
    type('Food', '1');

    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(saveBudgets).toHaveBeenCalledWith('2026-11', [{ categoryId: FOOD, amountMinor: 1 }]);
    expect(field('Food')).toHaveValue('1');
  });

  it('AC-16: ignores surrounding spaces and treats a field of spaces as empty', async () => {
    byMonth['2026-11'] = { [TRANSPORT]: 50_000 };
    await openPage();
    type('Food', '  700000  ');
    type('Transport', '   ');

    clickSave();

    expect(await screen.findByText('Budgets saved.')).toBeInTheDocument();
    expect(saveBudgets).toHaveBeenCalledWith('2026-11', [
      { categoryId: FOOD, amountMinor: 700_000 },
      { categoryId: TRANSPORT, amountMinor: null },
    ]);
    expect(field('Food')).toHaveValue('700000');
    expect(field('Transport')).toHaveValue('');
  });

  it('AC-17: a past month is read-only without Save and with "Past months cannot be changed."', async () => {
    byMonth['2026-10'] = { [FOOD]: 700_000 };
    await openPage();

    fireEvent.change(monthPicker(), { target: { value: '2026-10' } });

    await waitFor(() => expect(field('Food')).toHaveValue('700000'));
    for (const name of NAMES) {
      expect(field(name)).toBeDisabled();
    }
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getByText('Past months cannot be changed.')).toBeInTheDocument();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it('AC-18: on 2026-12-01 the screen opens on 2026-12, and 2026-11 is read-only', async () => {
    vi.setSystemTime(new Date(2026, 11, 1, 8, 0));
    byMonth['2026-11'] = { [FOOD]: 700_000 };
    byMonth['2026-12'] = { [FOOD]: 700_000 };
    await openPage();

    expect(monthPicker()).toHaveValue('2026-12');
    expect(field('Food')).toHaveValue('700000');
    expect(field('Food')).toBeEnabled();

    fireEvent.change(monthPicker(), { target: { value: '2026-11' } });

    await waitFor(() => expect(fetchBudgets).toHaveBeenLastCalledWith('2026-11'));
    await waitFor(() => expect(field('Food')).toBeDisabled());
    expect(field('Food')).toHaveValue('700000');
    expect(screen.getByText('Past months cannot be changed.')).toBeInTheDocument();
  });

  it('AC-19: changing the month discards unsaved edits', async () => {
    byMonth['2026-12'] = { [FOOD]: 700_000 };
    await openPage();
    type('Food', '123');
    type('Health', '456');

    fireEvent.change(monthPicker(), { target: { value: '2026-12' } });

    await waitFor(() => expect(field('Food')).toHaveValue('700000'));
    expect(field('Health')).toHaveValue('');
    expect(saveBudgets).not.toHaveBeenCalled();
  });

  it('AC-20: clearing the Month picker keeps the budgets on screen and sends no request', async () => {
    byMonth['2026-11'] = { [FOOD]: 700_000 };
    await openPage();

    fireEvent.change(monthPicker(), { target: { value: '' } });

    expect(field('Food')).toHaveValue('700000');
    expect(fetchBudgets).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('AC-21: shows "Loading…" instead of the table while loading', async () => {
    vi.mocked(fetchBudgets).mockReturnValue(new Promise(() => {}));

    render(<BudgetsPage />);

    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('AC-22: shows the load error and no table when loading fails', async () => {
    vi.mocked(fetchBudgets).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error'));

    render(<BudgetsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the budgets. Try again.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('AC-22: shows the load error when the API cannot be reached', async () => {
    vi.mocked(fetchBudgets).mockRejectedValue(new TypeError('Failed to fetch'));

    render(<BudgetsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the budgets. Try again.');
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('AC-23: shows the save error above the table and keeps the edits', async () => {
    vi.mocked(saveBudgets).mockRejectedValue(new TypeError('Failed to fetch'));
    await openPage();
    type('Food', '700000');

    clickSave();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the budgets. Try again.');
    expect(field('Food')).toHaveValue('700000');
    expect(screen.queryByText('Budgets saved.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('AC-23: shows the generic save error for a 500 response', async () => {
    vi.mocked(saveBudgets).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error'));
    await openPage();
    type('Food', '700000');

    clickSave();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the budgets. Try again.');
  });

  it("AC-23: shows the API's message for a 400 response", async () => {
    vi.mocked(saveBudgets).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'month must be the current month (2026-12) or later'),
    );
    await openPage();
    type('Food', '700000');

    clickSave();

    expect(await screen.findByRole('alert')).toHaveTextContent('month must be the current month (2026-12) or later');
    expect(field('Food')).toHaveValue('700000');
  });

  it('"Budgets saved." disappears when a field changes', async () => {
    await openPage();
    type('Food', '700000');
    clickSave();
    await screen.findByText('Budgets saved.');

    type('Food', '710000');

    expect(screen.queryByText('Budgets saved.')).not.toBeInTheDocument();
  });
});
