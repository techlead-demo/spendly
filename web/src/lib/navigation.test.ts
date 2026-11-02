import { describe, expect, it } from 'vitest';
import { editExpenseHash, parseEditExpenseHash } from './navigation';

describe('editExpenseHash / parseEditExpenseHash', () => {
  it('builds and parses the Edit expense route', () => {
    expect(editExpenseHash(7)).toBe('#/expenses/7/edit');
    expect(parseEditExpenseHash('#/expenses/7/edit')).toBe(7);
    expect(parseEditExpenseHash('#/expenses/9999/edit')).toBe(9999);
  });

  it.each(['', '#/', '#/summary', '#/expenses/abc/edit', '#/expenses/7', '#/expenses/-1/edit'])(
    'returns null for %j',
    (hash) => {
      expect(parseEditExpenseHash(hash)).toBeNull();
    },
  );
});
