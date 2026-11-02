import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, deleteExpense, fetchCategories, fetchExpense, updateExpense } from '../api/client';
import type { Category, Expense } from '../api/types';
import { EditExpensePage } from './EditExpensePage';

vi.mock('../api/client', async (importActual) => ({
  ...(await importActual<typeof import('../api/client')>()),
  fetchCategories: vi.fn(),
  fetchExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}));

const CATEGORIES: Category[] = [
  { id: 1, name: 'Food', status: 'active', expenseCount: 0 },
  { id: 2, name: 'Transport', status: 'active', expenseCount: 0 },
  { id: 3, name: 'Housing', status: 'active', expenseCount: 0 },
  { id: 4, name: 'Health', status: 'active', expenseCount: 0 },
  { id: 5, name: 'Entertainment', status: 'active', expenseCount: 0 },
  { id: 6, name: 'Other', status: 'active', expenseCount: 0 },
];

const E: Expense = { id: 7, date: '2026-11-02', amountMinor: 280_000, categoryId: 1, note: 'Groceries at Co.opmart' };

const FIX_FIELDS = 'Please fix the highlighted fields.';
const DATE_ERROR = 'Enter a valid date.';
const AMOUNT_ERROR = 'Enter a whole amount in đồng, greater than 0.';
const CATEGORY_ERROR = 'Choose a category.';
const NOT_FOUND = 'This expense no longer exists.';

function field(label: string | RegExp) {
  return screen.getByLabelText(label);
}

function setField(label: string | RegExp, value: string) {
  fireEvent.change(field(label), { target: { value } });
}

function button(name: string) {
  return screen.getByRole('button', { name });
}

function normalise(text: string | null | undefined) {
  return text?.replace(/\s/g, ' ');
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderPage(expenseId = 7) {
  const props = {
    expenseId,
    onSaved: vi.fn(),
    onCancel: vi.fn(),
    onDeleted: vi.fn(),
    onBack: vi.fn(),
  };
  render(<EditExpensePage {...props} />);
  return props;
}

async function renderLoaded(expense: Expense = E) {
  vi.mocked(fetchExpense).mockResolvedValue(expense);
  const props = renderPage(expense.id);
  await screen.findByRole('button', { name: 'Save' });
  return props;
}

async function openDialog() {
  fireEvent.click(button('Delete'));
  return screen.findByRole('alertdialog');
}

describe('EditExpensePage', () => {
  beforeEach(() => {
    vi.mocked(fetchCategories).mockResolvedValue(CATEGORIES);
    vi.mocked(updateExpense).mockImplementation(async (id, expense) => ({ id, ...expense }));
    vi.mocked(deleteExpense).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('shows "Loading…" until the expense is loaded', async () => {
    vi.mocked(fetchExpense).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('heading', { name: 'Edit expense' })).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('AC-2: shows the form pre-filled with the expense, amount as plain digits, and Save, Cancel, Delete', async () => {
    await renderLoaded();

    expect(fetchExpense).toHaveBeenCalledWith(7);
    expect(screen.getByRole('heading', { name: 'Edit expense' })).toBeInTheDocument();
    expect(field('Date')).toHaveValue('2026-11-02');
    expect(field('Amount')).toHaveValue('280000');
    expect(screen.getByText('₫')).toBeInTheDocument();
    expect(field('Amount')).toHaveAccessibleDescription('Whole đồng, no decimals.');
    expect(field('Category')).toHaveDisplayValue('Food');
    expect(field(/Note/)).toHaveValue('Groceries at Co.opmart');
    const options = within(field('Category')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Choose a category', 'Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Other']);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Save', 'Cancel', 'Delete']);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('AC-3: shows an empty Note for an expense without a note', async () => {
    await renderLoaded({ ...E, note: null });

    expect(field(/Note/)).toHaveValue('');
  });

  it('AC-4: saves the changed amount and note and hands the saved expense on', async () => {
    const { onSaved } = await renderLoaded();
    setField('Amount', '250000');
    setField(/Note/, 'Groceries');

    fireEvent.click(button('Save'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ ...E, amountMinor: 250_000, note: 'Groceries' }));
    expect(updateExpense).toHaveBeenCalledWith(7, {
      date: '2026-11-02',
      amountMinor: 250_000,
      categoryId: 1,
      note: 'Groceries',
    });
  });

  it('AC-8: sends the note trimmed', async () => {
    await renderLoaded();
    setField(/Note/, '  Market  ');

    fireEvent.click(button('Save'));

    await waitFor(() => expect(updateExpense).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateExpense).mock.calls[0]![1].note).toBe('Market');
  });

  it('AC-8: sends a note of only spaces as null', async () => {
    await renderLoaded();
    setField(/Note/, '   ');

    fireEvent.click(button('Save'));

    await waitFor(() => expect(updateExpense).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateExpense).mock.calls[0]![1].note).toBeNull();
  });

  it('AC-9: saving without changes sends the stored values', async () => {
    const { onSaved } = await renderLoaded();

    fireEvent.click(button('Save'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(E));
    expect(updateExpense).toHaveBeenCalledWith(7, { date: E.date, amountMinor: 280_000, categoryId: 1, note: E.note });
  });

  it('AC-10: sends only one update and disables Save, Cancel and Delete while it runs', async () => {
    const pending = deferred<Expense>();
    vi.mocked(updateExpense).mockReturnValue(pending.promise);
    const { onSaved } = await renderLoaded();

    fireEvent.click(button('Save'));
    fireEvent.click(button('Save'));
    fireEvent.submit(button('Save').closest('form')!);

    expect(button('Save')).toBeDisabled();
    expect(button('Cancel')).toBeDisabled();
    expect(button('Delete')).toBeDisabled();
    expect(updateExpense).toHaveBeenCalledTimes(1);
    pending.resolve(E);
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('AC-11: Cancel stores nothing and asks no confirmation', async () => {
    const { onCancel } = await renderLoaded();
    setField('Amount', '1000');

    fireEvent.click(button('Cancel'));

    expect(onCancel).toHaveBeenCalled();
    expect(updateExpense).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('AC-11: Cancel cannot be clicked during a Save, and a Save finishing after the page closed does not navigate', async () => {
    const pending = deferred<Expense>();
    vi.mocked(updateExpense).mockReturnValue(pending.promise);
    vi.mocked(fetchExpense).mockResolvedValue(E);
    const onSaved = vi.fn();
    const onCancel = vi.fn();
    const { unmount } = render(
      <EditExpensePage expenseId={7} onSaved={onSaved} onCancel={onCancel} onDeleted={vi.fn()} onBack={vi.fn()} />,
    );
    await screen.findByRole('button', { name: 'Save' });

    fireEvent.click(button('Save'));
    fireEvent.click(button('Cancel'));
    expect(onCancel).not.toHaveBeenCalled();

    unmount();
    pending.resolve(E);
    await pending.promise;
    await Promise.resolve();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it.each(['', '0', '-5000', '12,5', '12.5', '280.000'])(
    'AC-12: rejects the amount %j with the banner and the amount message',
    async (amount) => {
      await renderLoaded();
      setField('Amount', amount);

      fireEvent.click(button('Save'));

      expect(screen.getByRole('alert')).toHaveTextContent(FIX_FIELDS);
      expect(field('Amount')).toHaveAttribute('aria-invalid', 'true');
      expect(field('Amount')).toHaveAccessibleDescription(`Whole đồng, no decimals. ${AMOUNT_ERROR}`);
      expect(updateExpense).not.toHaveBeenCalled();
    },
  );

  it('AC-13: rejects a cleared date with the banner and the date message', async () => {
    await renderLoaded();
    setField('Date', '');

    fireEvent.click(button('Save'));

    expect(screen.getByRole('alert')).toHaveTextContent(FIX_FIELDS);
    expect(field('Date')).toHaveAccessibleDescription(DATE_ERROR);
    expect(updateExpense).not.toHaveBeenCalled();
  });

  it('AC-14: rejects "Choose a category" with the banner and the category message', async () => {
    await renderLoaded();
    setField('Category', '');

    fireEvent.click(button('Save'));

    expect(screen.getByRole('alert')).toHaveTextContent(FIX_FIELDS);
    expect(field('Category')).toHaveAccessibleDescription(CATEGORY_ERROR);
    expect(updateExpense).not.toHaveBeenCalled();
  });

  it('AC-15: shows all three messages at once and focuses Date', async () => {
    await renderLoaded();
    setField('Date', '');
    setField('Amount', '0');
    setField('Category', '');

    fireEvent.click(button('Save'));

    expect(screen.getByText(DATE_ERROR)).toBeInTheDocument();
    expect(screen.getByText(AMOUNT_ERROR)).toBeInTheDocument();
    expect(screen.getByText(CATEGORY_ERROR)).toBeInTheDocument();
    expect(field('Date')).toHaveFocus();
  });

  it('AC-16: limits the note to 200 characters', async () => {
    await renderLoaded();

    expect(field(/Note/)).toHaveAttribute('maxlength', '200');
  });

  it('AC-17: saves an amount of 1', async () => {
    await renderLoaded();
    setField('Amount', '1');

    fireEvent.click(button('Save'));

    await waitFor(() => expect(updateExpense).toHaveBeenCalledWith(7, expect.objectContaining({ amountMinor: 1 })));
  });

  describe('delete dialog', () => {
    it('AC-18: opens a modal dialog with the stored values, focus on "Keep", and deletes nothing yet', async () => {
      await renderLoaded();

      const dialog = await openDialog();

      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(within(dialog).getByRole('heading', { name: 'Delete this expense?' })).toBeInTheDocument();
      expect(normalise(within(dialog).getByText(/will be removed/).textContent)).toBe(
        '02/11/2026 · Food · 280.000 ₫ will be removed. You can undo this for 5 seconds.',
      );
      expect(within(dialog).getAllByRole('button').map((b) => b.textContent)).toEqual(['Delete expense', 'Keep']);
      expect(within(dialog).getByRole('button', { name: 'Keep' })).toHaveFocus();
      expect(deleteExpense).not.toHaveBeenCalled();
    });

    it('AC-18: Tab and Shift+Tab cycle between the two dialog buttons', async () => {
      await renderLoaded();
      const dialog = await openDialog();
      const keep = within(dialog).getByRole('button', { name: 'Keep' });
      const confirm = within(dialog).getByRole('button', { name: 'Delete expense' });

      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
      expect(confirm).toHaveFocus();
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
      expect(keep).toHaveFocus();
      fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true });
      expect(confirm).toHaveFocus();
    });

    it.each([
      ['"Keep"', () => fireEvent.click(screen.getByRole('button', { name: 'Keep' }))],
      ['Escape', () => fireEvent.keyDown(document.activeElement!, { key: 'Escape' })],
      ['a click outside', () => fireEvent.click(screen.getByTestId('dialog-backdrop'))],
    ])('AC-19: %s closes the dialog, keeps the values and returns focus to "Delete"', async (_label, close) => {
      await renderLoaded();
      setField('Amount', '99000');
      await openDialog();

      close();

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(deleteExpense).not.toHaveBeenCalled();
      expect(field('Amount')).toHaveValue('99000');
      expect(button('Delete')).toHaveFocus();
    });

    it('AC-20, AC-22: "Delete expense" deletes and hands on the expense as stored, without the unsaved edits', async () => {
      const { onDeleted } = await renderLoaded();
      setField('Amount', '99000');
      setField(/Note/, 'Changed');
      const dialog = await openDialog();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete expense' }));

      await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(E));
      expect(deleteExpense).toHaveBeenCalledWith(7);
      expect(updateExpense).not.toHaveBeenCalled();
    });

    it('AC-23: sends one delete; buttons disabled and Escape and outside clicks ignored while it runs', async () => {
      const pending = deferred<void>();
      vi.mocked(deleteExpense).mockReturnValue(pending.promise);
      const { onDeleted } = await renderLoaded();
      const dialog = await openDialog();
      const confirm = within(dialog).getByRole('button', { name: 'Delete expense' });

      fireEvent.click(confirm);
      fireEvent.click(confirm);
      fireEvent.keyDown(document.body, { key: 'Escape' });
      fireEvent.click(screen.getByTestId('dialog-backdrop'));

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(confirm).toBeDisabled();
      expect(within(dialog).getByRole('button', { name: 'Keep' })).toBeDisabled();
      expect(deleteExpense).toHaveBeenCalledTimes(1);
      pending.resolve();
      await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    });
  });

  describe('not found and errors', () => {
    it('AC-24: shows "This expense no longer exists." and "Back to expenses" for an unknown expense', async () => {
      vi.mocked(fetchExpense).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'expense 9999 does not exist'));
      const { onBack } = renderPage(9999);

      expect(await screen.findByRole('alert')).toHaveTextContent(NOT_FOUND);
      expect(screen.getByRole('heading', { name: 'Edit expense' })).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('link', { name: 'Back to expenses' }));
      expect(onBack).toHaveBeenCalled();
    });

    it.each([0, Number.MAX_SAFE_INTEGER + 2])(
      'AC-24: shows "This expense no longer exists." without a request for the impossible id %s',
      async (id) => {
        renderPage(id);

        expect(await screen.findByRole('alert')).toHaveTextContent(NOT_FOUND);
        expect(fetchExpense).not.toHaveBeenCalled();
        expect(screen.getByRole('link', { name: 'Back to expenses' })).toBeInTheDocument();
      },
    );

    it('AC-25: a 404 on Save shows the not-found state', async () => {
      vi.mocked(updateExpense).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'expense 7 does not exist'));
      const { onSaved } = await renderLoaded();

      fireEvent.click(button('Save'));

      expect(await screen.findByRole('alert')).toHaveTextContent(NOT_FOUND);
      expect(screen.getByRole('link', { name: 'Back to expenses' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
      expect(onSaved).not.toHaveBeenCalled();
    });

    it('AC-25: a 404 on Delete closes the dialog and shows the not-found state', async () => {
      vi.mocked(deleteExpense).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'expense 7 does not exist'));
      const { onDeleted } = await renderLoaded();
      const dialog = await openDialog();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete expense' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(NOT_FOUND);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(onDeleted).not.toHaveBeenCalled();
    });

    it('AC-26: keeps the form and shows the API error message of a 400', async () => {
      vi.mocked(updateExpense).mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'categoryId 1 does not exist'));
      const { onSaved } = await renderLoaded();
      setField('Amount', '250000');

      fireEvent.click(button('Save'));

      expect(await screen.findByRole('alert')).toHaveTextContent('categoryId 1 does not exist');
      expect(field('Amount')).toHaveValue('250000');
      expect(button('Save')).toBeEnabled();
      expect(onSaved).not.toHaveBeenCalled();
    });

    it('AC-27: keeps the form with "Could not save the expense. Try again." when the API is unreachable', async () => {
      vi.mocked(updateExpense).mockRejectedValue(new TypeError('Failed to fetch'));
      await renderLoaded();
      setField(/Note/, 'Changed');

      fireEvent.click(button('Save'));

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the expense. Try again.');
      expect(field(/Note/)).toHaveValue('Changed');
      expect(button('Save')).toBeEnabled();
    });

    it('AC-27: keeps the expense, closes the dialog and shows "Could not delete the expense. Try again."', async () => {
      vi.mocked(deleteExpense).mockRejectedValue(new TypeError('Failed to fetch'));
      const { onDeleted } = await renderLoaded();
      setField(/Note/, 'Changed');
      const dialog = await openDialog();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete expense' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete the expense. Try again.');
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(field(/Note/)).toHaveValue('Changed');
      expect(button('Delete')).toBeEnabled();
      expect(onDeleted).not.toHaveBeenCalled();
    });

    it('AC-28: shows "Could not load the expense. Try again." and "Back to expenses" when the API is unreachable', async () => {
      vi.mocked(fetchExpense).mockRejectedValue(new TypeError('Failed to fetch'));
      renderPage();

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the expense. Try again.');
      expect(screen.getByRole('link', { name: 'Back to expenses' })).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('retired categories (SPD-6)', () => {
    const G: Expense = { id: 30, date: '2026-10-15', amountMinor: 120_000, categoryId: 8, note: null };
    const WITH_RETIRED: Category[] = [
      ...CATEGORIES,
      { id: 7, name: 'Coffee', status: 'retired', expenseCount: 0 },
      { id: 8, name: 'Gym', status: 'retired', expenseCount: 6 },
    ];

    function optionNames() {
      return within(field('Category')).getAllByRole('option').map((option) => option.textContent);
    }

    beforeEach(() => {
      vi.mocked(fetchCategories).mockResolvedValue(WITH_RETIRED);
    });

    it("AC-37: shows the expense's retired category selected and last, and keeps it on Save", async () => {
      const { onSaved } = await renderLoaded(G);

      expect(field('Category')).toHaveDisplayValue('Gym');
      expect(optionNames()).toEqual([
        'Choose a category',
        'Food',
        'Transport',
        'Housing',
        'Health',
        'Entertainment',
        'Other',
        'Gym',
      ]);
      setField('Amount', '150000');
      fireEvent.click(button('Save'));

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(updateExpense).toHaveBeenCalledWith(30, { date: '2026-10-15', amountMinor: 150_000, categoryId: 8, note: null });
    });

    it('AC-37: an expense in an active category is not offered any retired category', async () => {
      await renderLoaded({ ...G, categoryId: 1 });

      expect(optionNames()).not.toContain('Gym');
      expect(optionNames()).not.toContain('Coffee');
    });
  });
});
