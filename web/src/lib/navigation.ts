/** Hash of the expense list (Expenses screen). */
export const EXPENSES_HASH = '#/';

const EDIT_EXPENSE_PATTERN = /^#\/expenses\/(\d+)\/edit$/;

/** Hash of the Edit expense screen; the id is in the URL so a reload or a stale link can show "not found". */
export function editExpenseHash(id: number): string {
  return `#/expenses/${id}/edit`;
}

/** The expense id of an Edit expense hash, or null for any other hash. */
export function parseEditExpenseHash(hash: string): number | null {
  const match = EDIT_EXPENSE_PATTERN.exec(hash);
  return match ? Number(match[1]) : null;
}
