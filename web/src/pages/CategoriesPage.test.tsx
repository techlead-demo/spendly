import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, addCategory, fetchCategories, renameCategory, restoreCategory, retireCategory } from '../api/client';
import type { Category } from '../api/types';
import { CategoriesPage } from './CategoriesPage';

vi.mock('../api/client', async (importActual) => ({
  ...(await importActual<typeof import('../api/client')>()),
  fetchCategories: vi.fn(),
  addCategory: vi.fn(),
  renameCategory: vi.fn(),
  retireCategory: vi.fn(),
  restoreCategory: vi.fn(),
}));

const NAMES = ['Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Other'];
const COUNTS = [48, 31, 12, 7, 15, 0];
const DEFAULTS: Category[] = NAMES.map((name, index) => ({
  id: index + 1,
  name,
  status: 'active',
  expenseCount: COUNTS[index] ?? 0,
}));
const SAVE_FAILED = 'Could not save the category. Try again.';

/** The categories "on the server"; the API mocks read and change it like the real API would. */
let stored: Category[];

function newCategoryField(): HTMLInputElement {
  return screen.getByLabelText('New category');
}

function bodyRows() {
  return screen.getAllByRole('row').slice(1);
}

function rowTexts() {
  return bodyRows().map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent));
}

function row(name: string): HTMLElement {
  const found = bodyRows().find((r) => within(r).getAllByRole('cell')[0]?.textContent === name);
  if (!found) throw new Error(`no row ${name}`);
  return found;
}

/** The row whose name cell holds the rename input. */
function renamingRow(): HTMLElement {
  return screen.getByRole('textbox', { name: 'Category name' }).closest('tr')!;
}

async function openPage() {
  render(<CategoriesPage />);
  await screen.findByRole('table');
}

function add(name: string) {
  fireEvent.change(newCategoryField(), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
}

function startRename(name: string) {
  fireEvent.click(within(row(name)).getByRole('button', { name: 'Rename' }));
  return screen.getByRole('textbox', { name: 'Category name' });
}

function update(id: number, change: Partial<Category>): Category {
  stored = stored.map((c) => (c.id === id ? { ...c, ...change } : c));
  return stored.find((c) => c.id === id)!;
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    stored = DEFAULTS.map((c) => ({ ...c }));
    vi.mocked(fetchCategories).mockImplementation(async () => stored.map((c) => ({ ...c })));
    vi.mocked(addCategory).mockImplementation(async (name) => {
      const created: Category = { id: stored.length + 1, name: name.trim(), status: 'active', expenseCount: 0 };
      stored = [...stored, created];
      return created;
    });
    vi.mocked(renameCategory).mockImplementation(async (id, name) => update(id, { name: name.trim() }));
    vi.mocked(retireCategory).mockImplementation(async (id) => update(id, { status: 'retired' }));
    vi.mocked(restoreCategory).mockImplementation(async (id) => update(id, { status: 'active' }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('AC-2: shows the heading, the empty "New category" field, "Add category" and the table columns', async () => {
    await openPage();

    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
    expect(newCategoryField()).toHaveValue('');
    expect(newCategoryField()).toHaveAttribute('placeholder', 'e.g. Pets');
    expect(screen.getByRole('button', { name: 'Add category' })).toHaveClass(/primary/);
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Name', 'Expenses', 'Status', '']);
  });

  it('AC-3: lists the default categories in order, active, with counts and "Rename · Retire"', async () => {
    await openPage();

    expect(rowTexts()).toEqual(
      NAMES.map((name, index) => [name, String(COUNTS[index]), 'Active', 'Rename · Retire']),
    );
  });

  it('AC-4: lists active categories by creation order, then retired ones with "Rename · Restore"', async () => {
    stored = [
      ...DEFAULTS,
      { id: 7, name: 'Coffee', status: 'active', expenseCount: 0 },
      { id: 8, name: 'Gym', status: 'retired', expenseCount: 6 },
    ];
    stored[2] = { ...stored[2]!, status: 'retired' };
    await openPage();

    expect(rowTexts().map((cells) => cells[0])).toEqual([
      'Food',
      'Transport',
      'Health',
      'Entertainment',
      'Other',
      'Coffee',
      'Housing',
      'Gym',
    ]);
    expect(rowTexts()[6]).toEqual(['Housing', '12', 'Retired', 'Rename · Restore']);
    expect(rowTexts()[7]).toEqual(['Gym', '6', 'Retired', 'Rename · Restore']);
  });

  describe('add', () => {
    it('AC-5: adds Coffee as the last active row and clears the field', async () => {
      await openPage();

      add('Coffee');

      await waitFor(() => expect(rowTexts().at(-1)).toEqual(['Coffee', '0', 'Active', 'Rename · Retire']));
      expect(addCategory).toHaveBeenCalledWith('Coffee');
      expect(newCategoryField()).toHaveValue('');
    });

    it('AC-5: Enter in the field adds the category, before any retired row', async () => {
      stored[0] = { ...stored[0]!, status: 'retired' };
      await openPage();
      fireEvent.change(newCategoryField(), { target: { value: 'Coffee' } });

      fireEvent.submit(newCategoryField().closest('form')!);

      await waitFor(() => expect(rowTexts().map((cells) => cells[0]).slice(-2)).toEqual(['Coffee', 'Food']));
    });

    it('AC-7: a name with spaces is sent as typed and shown trimmed', async () => {
      await openPage();

      add('  Coffee  ');

      await waitFor(() => expect(rowTexts().at(-1)?.[0]).toBe('Coffee'));
    });

    it.each(['', '   '])('AC-8: an empty name (%j) adds nothing and shows "Enter a category name."', async (name) => {
      await openPage();

      add(name);

      expect(addCategory).not.toHaveBeenCalled();
      expect(newCategoryField()).toHaveAttribute('aria-invalid', 'true');
      expect(newCategoryField()).toHaveAccessibleDescription('Enter a category name.');
    });

    it.each(['food', 'FOOD'])('AC-9: an existing name (%s) adds nothing and names it as typed', async (name) => {
      stored[0] = { ...stored[0]!, status: 'retired' };
      await openPage();

      add(` ${name} `);

      expect(addCategory).not.toHaveBeenCalled();
      expect(newCategoryField()).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText(`A category named "${name}" already exists.`)).toBeInTheDocument();
      expect(bodyRows()).toHaveLength(6);
    });

    it('AC-10: the field accepts at most 40 characters and a 40-character name is added', async () => {
      await openPage();
      const name = 'A'.repeat(40);

      expect(newCategoryField()).toHaveAttribute('maxlength', '40');
      add(name);

      await waitFor(() => expect(rowTexts().at(-1)?.[0]).toBe(name));
    });

    it('AC-11: changing the field removes the message and the invalid mark', async () => {
      await openPage();
      add('');

      fireEvent.change(newCategoryField(), { target: { value: 'C' } });

      expect(newCategoryField()).not.toHaveAttribute('aria-invalid');
      expect(screen.queryByText('Enter a category name.')).not.toBeInTheDocument();
    });
  });

  describe('rename', () => {
    it('AC-12: Rename turns the name cell into a focused input with Save and Cancel', async () => {
      await openPage();

      const input = startRename('Food');

      expect(input).toHaveValue('Food');
      expect(input).toHaveFocus();
      expect(input).toHaveAttribute('maxlength', '40');
      expect(within(renamingRow()).getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(within(renamingRow()).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('AC-12: Rename on another row cancels the first rename', async () => {
      await openPage();
      fireEvent.change(startRename('Food'), { target: { value: 'Groceries' } });

      startRename('Transport');

      expect(screen.getAllByRole('textbox', { name: 'Category name' })).toHaveLength(1);
      expect(screen.getByRole('textbox', { name: 'Category name' })).toHaveValue('Transport');
      expect(row('Food')).toBeInTheDocument();
    });

    it('AC-13: Save stores the new name in the same position with the same count and status', async () => {
      await openPage();
      fireEvent.change(startRename('Food'), { target: { value: 'Groceries' } });

      fireEvent.click(within(renamingRow()).getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(rowTexts()[0]).toEqual(['Groceries', '48', 'Active', 'Rename · Retire']));
      expect(renameCategory).toHaveBeenCalledWith(1, 'Groceries');
      expect(screen.queryByRole('textbox', { name: 'Category name' })).not.toBeInTheDocument();
    });

    it('AC-13: while a rename is saved, Rename and Retire on the other rows are disabled', async () => {
      let finish: (category: Category) => void = () => {};
      vi.mocked(renameCategory).mockReturnValue(new Promise((resolve) => (finish = resolve)));
      await openPage();
      fireEvent.change(startRename('Food'), { target: { value: 'Groceries' } });

      fireEvent.click(within(renamingRow()).getByRole('button', { name: 'Save' }));

      expect(within(row('Transport')).getByRole('button', { name: 'Rename' })).toBeDisabled();
      expect(within(row('Transport')).getByRole('button', { name: 'Retire' })).toBeDisabled();
      finish(update(1, { name: 'Groceries' }));
      await waitFor(() => expect(within(row('Transport')).getByRole('button', { name: 'Rename' })).toBeEnabled());
      expect(screen.queryByRole('textbox', { name: 'Category name' })).not.toBeInTheDocument();
    });

    it('AC-13: Enter saves the new name', async () => {
      await openPage();
      const input = startRename('Food');
      fireEvent.change(input, { target: { value: 'Groceries' } });

      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => expect(rowTexts()[0]?.[0]).toBe('Groceries'));
    });

    it.each([
      ['Cancel', (input: HTMLElement) => fireEvent.click(within(input.closest('tr')!).getByRole('button', { name: 'Cancel' }))],
      ['Escape', (input: HTMLElement) => fireEvent.keyDown(input, { key: 'Escape' })],
    ])('AC-14: %s shows the old name again and stores nothing', async (_label, cancel) => {
      await openPage();
      const input = startRename('Food');
      fireEvent.change(input, { target: { value: 'Groceries' } });

      cancel(input);

      expect(rowTexts()[0]?.[0]).toBe('Food');
      expect(renameCategory).not.toHaveBeenCalled();
    });

    it.each(['Transport', 'transport'])('AC-15: saving another name (%s) keeps the input open and invalid', async (name) => {
      await openPage();
      const input = startRename('Food');
      fireEvent.change(input, { target: { value: name } });

      fireEvent.click(within(renamingRow()).getByRole('button', { name: 'Save' }));

      expect(renameCategory).not.toHaveBeenCalled();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription(`A category named "${name}" already exists.`);
    });

    it('AC-15: saving an empty name shows "Enter a category name."', async () => {
      await openPage();
      const input = startRename('Food');
      fireEvent.change(input, { target: { value: '  ' } });

      fireEvent.keyDown(input, { key: 'Enter' });

      expect(renameCategory).not.toHaveBeenCalled();
      expect(input).toHaveAccessibleDescription('Enter a category name.');
    });

    it.each(['Food', 'food'])('AC-16: saving its own name in any letter case (%s) is accepted', async (name) => {
      await openPage();
      fireEvent.change(startRename('Food'), { target: { value: name } });

      fireEvent.click(within(renamingRow()).getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Category name' })).not.toBeInTheDocument());
      expect(rowTexts()[0]?.[0]).toBe(name);
    });

    it('AC-17: a renamed retired category stays retired', async () => {
      stored = [...stored, { id: 7, name: 'Gym', status: 'retired', expenseCount: 6 }];
      await openPage();
      fireEvent.change(startRename('Gym'), { target: { value: 'Fitness' } });

      fireEvent.click(within(renamingRow()).getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(rowTexts().at(-1)).toEqual(['Fitness', '6', 'Retired', 'Rename · Restore']));
    });
  });

  describe('retire and restore', () => {
    it('AC-18: Retire moves the row to the retired part without a confirmation, keeping the count', async () => {
      stored = [...stored, { id: 7, name: 'Gym', status: 'active', expenseCount: 6 }];
      await openPage();

      fireEvent.click(within(row('Gym')).getByRole('button', { name: 'Retire' }));

      await waitFor(() => expect(rowTexts().at(-1)).toEqual(['Gym', '6', 'Retired', 'Rename · Restore']));
      expect(retireCategory).toHaveBeenCalledWith(7);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('AC-22: Restore moves the row back to its creation-order position', async () => {
      stored = [...stored, { id: 7, name: 'Gym', status: 'retired', expenseCount: 6 }, { id: 8, name: 'Pets', status: 'active', expenseCount: 0 }];
      await openPage();

      fireEvent.click(within(row('Gym')).getByRole('button', { name: 'Restore' }));

      await waitFor(() => expect(rowTexts()[6]).toEqual(['Gym', '6', 'Active', 'Rename · Retire']));
      expect(rowTexts()[7]?.[0]).toBe('Pets');
    });

    it('AC-23: retiring the only active category shows the alert and keeps it active', async () => {
      stored = stored.map((c) => (c.id === 1 ? c : { ...c, status: 'retired' }));
      vi.mocked(retireCategory).mockRejectedValue(
        new ApiError(400, 'VALIDATION_ERROR', 'At least one category must stay active.'),
      );
      await openPage();

      fireEvent.click(within(row('Food')).getByRole('button', { name: 'Retire' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('At least one category must stay active.');
      expect(rowTexts()[0]).toEqual(['Food', '48', 'Active', 'Rename · Retire']);
      // The alert is shown above the table.
      expect(screen.getByRole('alert').compareDocumentPosition(screen.getByRole('table'))).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
  });

  describe('loading and errors', () => {
    it('AC-27: shows "Loading…" instead of the table until the categories arrive', () => {
      vi.mocked(fetchCategories).mockReturnValue(new Promise(() => {}));
      render(<CategoriesPage />);

      expect(screen.getByText('Loading…')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it.each([
      ['unreachable', new TypeError('Failed to fetch')],
      ['returns an error', new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error')],
    ])('AC-28: shows the load error and no table when the API is %s', async (_label, error) => {
      vi.mocked(fetchCategories).mockRejectedValue(error);
      render(<CategoriesPage />);

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the categories. Try again.');
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('AC-29: an unreachable API on add shows the save alert, keeps the list and the typed name', async () => {
      vi.mocked(addCategory).mockRejectedValue(new TypeError('Failed to fetch'));
      await openPage();

      add('Coffee');

      expect(await screen.findByRole('alert')).toHaveTextContent(SAVE_FAILED);
      expect(bodyRows()).toHaveLength(6);
      expect(newCategoryField()).toHaveValue('Coffee');
    });

    it('AC-29: an unreachable API on rename keeps the input with the typed name', async () => {
      vi.mocked(renameCategory).mockRejectedValue(new TypeError('Failed to fetch'));
      await openPage();
      fireEvent.change(startRename('Food'), { target: { value: 'Groceries' } });

      fireEvent.click(within(renamingRow()).getByRole('button', { name: 'Save' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(SAVE_FAILED);
      expect(screen.getByRole('textbox', { name: 'Category name' })).toHaveValue('Groceries');
    });

    it.each([
      ['Retire', retireCategory, 'active'],
      ['Restore', restoreCategory, 'retired'],
    ] as const)('AC-29: an unreachable API on %s shows the save alert and changes nothing', async (action, fn, status) => {
      stored[1] = { ...stored[1]!, status };
      vi.mocked(fn).mockRejectedValue(new TypeError('Failed to fetch'));
      await openPage();
      const before = rowTexts();

      fireEvent.click(within(row('Transport')).getByRole('button', { name: action }));

      expect(await screen.findByRole('alert')).toHaveTextContent(SAVE_FAILED);
      expect(rowTexts()).toEqual(before);
    });

    it('AC-29: a 400 from the API on add or rename is shown under the name input', async () => {
      vi.mocked(addCategory).mockRejectedValue(
        new ApiError(400, 'VALIDATION_ERROR', 'A category name can have at most 40 characters.'),
      );
      vi.mocked(renameCategory).mockRejectedValue(
        new ApiError(400, 'VALIDATION_ERROR', 'A category named "Pets" already exists.'),
      );
      await openPage();

      add('Coffee');
      await waitFor(() =>
        expect(newCategoryField()).toHaveAccessibleDescription('A category name can have at most 40 characters.'),
      );
      const input = startRename('Food');
      fireEvent.change(input, { target: { value: 'Pets' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => expect(input).toHaveAccessibleDescription('A category named "Pets" already exists.'));
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
