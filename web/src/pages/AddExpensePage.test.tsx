import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createExpense, fetchCategories } from '../api/client';
import type { Category, Expense } from '../api/types';
import { AddExpensePage } from './AddExpensePage';

vi.mock('../api/client', async (importActual) => ({
  ...(await importActual<typeof import('../api/client')>()),
  fetchCategories: vi.fn(),
  createExpense: vi.fn(),
}));

const CATEGORIES: Category[] = [
  { id: 1, name: 'Food' },
  { id: 2, name: 'Transport' },
  { id: 3, name: 'Housing' },
  { id: 4, name: 'Health' },
  { id: 5, name: 'Entertainment' },
  { id: 6, name: 'Other' },
];

const FIX_FIELDS = 'Please fix the highlighted fields.';
const DATE_ERROR = 'Enter a valid date.';
const AMOUNT_ERROR = 'Enter a whole amount in đồng, greater than 0.';
const CATEGORY_ERROR = 'Choose a category.';

const saved: Expense = { id: 30, date: '2026-11-02', amountMinor: 85_000, categoryId: 1, note: 'Lunch' };

function field(label: string | RegExp) {
  return screen.getByLabelText(label);
}

function setField(label: string | RegExp, value: string) {
  fireEvent.change(field(label), { target: { value } });
}

async function renderPage() {
  const onSaved = vi.fn();
  const onCancel = vi.fn();
  render(<AddExpensePage onSaved={onSaved} onCancel={onCancel} />);
  await screen.findByRole('option', { name: 'Other' });
  return { onSaved, onCancel };
}

async function fillValid(note = 'Lunch') {
  setField('Date', '2026-11-02');
  setField('Amount', '85000');
  setField('Category', '1');
  setField(/Note/, note);
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}

describe('AddExpensePage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 9, 30));
    vi.mocked(fetchCategories).mockResolvedValue(CATEGORIES);
    vi.mocked(createExpense).mockResolvedValue(saved);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('AC-2: opens with today, an empty amount with placeholder, suffix and hint, no category and no note', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { name: 'Add expense' })).toBeInTheDocument();
    expect(field('Date')).toHaveValue('2026-11-02');
    expect(field('Amount')).toHaveValue('');
    expect(field('Amount')).toHaveAttribute('placeholder', '0');
    expect(screen.getByText('₫')).toBeInTheDocument();
    expect(field('Amount')).toHaveAccessibleDescription('Whole đồng, no decimals.');
    expect(field('Category')).toHaveDisplayValue('Choose a category');
    expect(field(/Note/)).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('AC-3: offers "Choose a category" followed by the six categories in order', async () => {
    await renderPage();

    const options = within(field('Category')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Choose a category', 'Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Other']);
  });

  it('AC-4: saves the entered expense and hands the saved expense to the list', async () => {
    const { onSaved } = await renderPage();
    await fillValid();

    clickSave();

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(createExpense).toHaveBeenCalledWith({
      date: '2026-11-02',
      amountMinor: 85_000,
      categoryId: 1,
      note: 'Lunch',
    });
  });

  it('AC-10: disables Save while the request runs and creates only one expense', async () => {
    let resolve: (expense: Expense) => void = () => {};
    vi.mocked(createExpense).mockReturnValue(new Promise((r) => (resolve = r)));
    const { onSaved } = await renderPage();
    await fillValid();

    clickSave();
    clickSave();

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form')!);
    expect(createExpense).toHaveBeenCalledTimes(1);
    resolve(saved);
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('AC-11: Cancel saves nothing', async () => {
    const { onCancel, onSaved } = await renderPage();
    setField('Amount', '50000');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
    expect(createExpense).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it.each(['', '0', '-5000', '12,5', '12.5'])(
    'AC-12: rejects the amount %j with the banner and the amount message',
    async (amount) => {
      await renderPage();
      await fillValid();
      setField('Amount', amount);

      clickSave();

      expect(screen.getByRole('alert')).toHaveTextContent(FIX_FIELDS);
      expect(field('Amount')).toHaveAttribute('aria-invalid', 'true');
      expect(field('Amount')).toHaveAccessibleDescription(`Whole đồng, no decimals. ${AMOUNT_ERROR}`);
      expect(field('Date')).not.toHaveAttribute('aria-invalid');
      expect(createExpense).not.toHaveBeenCalled();
    },
  );

  it('AC-13: rejects a cleared date with the banner and the date message', async () => {
    await renderPage();
    await fillValid();
    setField('Date', '');

    clickSave();

    expect(screen.getByRole('alert')).toHaveTextContent(FIX_FIELDS);
    expect(field('Date')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Date')).toHaveAccessibleDescription(DATE_ERROR);
    expect(createExpense).not.toHaveBeenCalled();
  });

  it('AC-14: rejects a missing category with the banner and the category message', async () => {
    await renderPage();
    await fillValid();
    setField('Category', '');

    clickSave();

    expect(screen.getByRole('alert')).toHaveTextContent(FIX_FIELDS);
    expect(field('Category')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Category')).toHaveAccessibleDescription(CATEGORY_ERROR);
    expect(createExpense).not.toHaveBeenCalled();
  });

  it('AC-15: shows all three messages at once and focuses the date field', async () => {
    await renderPage();
    setField('Date', '');
    setField('Amount', '0');

    clickSave();

    expect(screen.getByText(DATE_ERROR)).toBeInTheDocument();
    expect(screen.getByText(AMOUNT_ERROR)).toBeInTheDocument();
    expect(screen.getByText(CATEGORY_ERROR)).toBeInTheDocument();
    expect(field('Date')).toHaveFocus();
  });

  it('AC-15: focuses the first invalid field in form order', async () => {
    await renderPage();
    setField('Amount', '12.5');

    clickSave();

    expect(field('Amount')).toHaveFocus();
  });

  it('AC-16: limits the note to 200 characters', async () => {
    await renderPage();

    expect(field(/Note/)).toHaveAttribute('maxlength', '200');
  });

  it('AC-17: saves after the errors are corrected and removes the banner and messages', async () => {
    const { onSaved } = await renderPage();
    setField('Date', '');
    clickSave();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await fillValid();
    clickSave();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(DATE_ERROR)).not.toBeInTheDocument();
    expect(screen.queryByText(AMOUNT_ERROR)).not.toBeInTheDocument();
    expect(screen.queryByText(CATEGORY_ERROR)).not.toBeInTheDocument();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
  });

  it('AC-24: keeps the form and shows the API error message in the banner', async () => {
    vi.mocked(createExpense).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'categoryId 1 does not exist'),
    );
    const { onSaved } = await renderPage();
    await fillValid();

    clickSave();

    expect(await screen.findByRole('alert')).toHaveTextContent('categoryId 1 does not exist');
    expect(onSaved).not.toHaveBeenCalled();
    expect(field('Amount')).toHaveValue('85000');
    expect(field(/Note/)).toHaveValue('Lunch');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('AC-25: keeps the form and shows "Could not save the expense. Try again." when the API is unreachable', async () => {
    vi.mocked(createExpense).mockRejectedValue(new TypeError('Failed to fetch'));
    const { onSaved } = await renderPage();
    await fillValid();

    clickSave();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the expense. Try again.');
    expect(onSaved).not.toHaveBeenCalled();
    expect(field('Date')).toHaveValue('2026-11-02');
    expect(field('Category')).toHaveValue('1');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('shows "Could not load categories. Try again." and fails Save with the category message', async () => {
    vi.mocked(fetchCategories).mockRejectedValue(new TypeError('Failed to fetch'));
    render(<AddExpensePage onSaved={vi.fn()} onCancel={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load categories. Try again.');
    setField('Amount', '85000');
    clickSave();

    expect(screen.getByText(CATEGORY_ERROR)).toBeInTheDocument();
    expect(createExpense).not.toHaveBeenCalled();
  });
});
