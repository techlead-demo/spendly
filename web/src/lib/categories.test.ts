import { describe, expect, it } from 'vitest';
import type { Category } from '../api/types';
import { managementOrder, selectableCategories, validateCategoryName } from './categories';

function category(id: number, name: string, status: Category['status'] = 'active'): Category {
  return { id, name, status, expenseCount: 0 };
}

const CATEGORIES: Category[] = [
  category(1, 'Food'),
  category(2, 'Transport'),
  category(3, 'Housing', 'retired'),
  category(4, 'Health'),
  category(5, 'Entertainment'),
  category(6, 'Other'),
  category(7, 'Coffee'),
  category(8, 'Gym', 'retired'),
];

const names = (categories: Category[]) => categories.map((c) => c.name);

describe('managementOrder', () => {
  it('AC-4: lists active categories by creation order, then retired ones by creation order', () => {
    expect(names(managementOrder([...CATEGORIES].reverse()))).toEqual([
      'Food',
      'Transport',
      'Health',
      'Entertainment',
      'Other',
      'Coffee',
      'Housing',
      'Gym',
    ]);
  });
});

describe('selectableCategories', () => {
  it('AC-6, AC-19: offers only the active categories in category order', () => {
    expect(names(selectableCategories(CATEGORIES))).toEqual([
      'Food',
      'Transport',
      'Health',
      'Entertainment',
      'Other',
      'Coffee',
    ]);
  });

  it("AC-37: offers the edited expense's own retired category last, but no other retired one", () => {
    expect(names(selectableCategories(CATEGORIES, 8))).toEqual([
      'Food',
      'Transport',
      'Health',
      'Entertainment',
      'Other',
      'Coffee',
      'Gym',
    ]);
    expect(names(selectableCategories(CATEGORIES, 1))).not.toContain('Gym');
  });
});

describe('validateCategoryName', () => {
  it('AC-8: an empty name or only spaces needs a name', () => {
    expect(validateCategoryName('', CATEGORIES)).toBe('Enter a category name.');
    expect(validateCategoryName('   ', CATEGORIES)).toBe('Enter a category name.');
  });

  it('AC-9: a name used by an active or retired category, ignoring case, already exists (as typed, trimmed)', () => {
    expect(validateCategoryName(' food ', CATEGORIES)).toBe('A category named "food" already exists.');
    expect(validateCategoryName('FOOD', CATEGORIES)).toBe('A category named "FOOD" already exists.');
    expect(validateCategoryName('gym', CATEGORIES)).toBe('A category named "gym" already exists.');
  });

  it('AC-15, AC-16: a rename may change the letter case of its own name but not take another name', () => {
    expect(validateCategoryName('food', CATEGORIES, 1)).toBeNull();
    expect(validateCategoryName('Food', CATEGORIES, 1)).toBeNull();
    expect(validateCategoryName('transport', CATEGORIES, 1)).toBe('A category named "transport" already exists.');
  });

  it('AC-5, AC-7: accepts a new name', () => {
    expect(validateCategoryName('  Pets  ', CATEGORIES)).toBeNull();
  });
});
