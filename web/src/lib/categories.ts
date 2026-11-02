import type { Category } from '../api/types';

/** BR-23: maximum category name length (after trimming). */
export const CATEGORY_NAME_MAX_LENGTH = 40;

export const EMPTY_NAME_MESSAGE = 'Enter a category name.';

export function duplicateNameMessage(name: string): string {
  return `A category named "${name}" already exists.`;
}

function byId(a: Category, b: Category): number {
  return a.id - b.id;
}

/** The Categories screen order: active categories in category order (BR-22), then retired ones in category order. */
export function managementOrder(categories: Category[]): Category[] {
  const sorted = [...categories].sort(byId);
  return [...sorted.filter((c) => c.status === 'active'), ...sorted.filter((c) => c.status === 'retired')];
}

/**
 * The categories an expense form offers (BR-24): the active ones in category order and, when editing an expense
 * whose category is retired, that category last.
 */
export function selectableCategories(categories: Category[], currentCategoryId?: number): Category[] {
  const sorted = [...categories].sort(byId);
  const own = sorted.find((c) => c.id === currentCategoryId && c.status === 'retired');
  const active = sorted.filter((c) => c.status === 'active');
  return own ? [...active, own] : active;
}

/**
 * BR-23: the error message for a typed category name, or null when it can be saved. `ownId` is the category being
 * renamed: its own name in another letter case is allowed.
 */
export function validateCategoryName(name: string, categories: Category[], ownId?: number): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return EMPTY_NAME_MESSAGE;
  const key = trimmed.toLocaleLowerCase('en');
  if (categories.some((c) => c.id !== ownId && c.name.toLocaleLowerCase('en') === key)) {
    return duplicateNameMessage(trimmed);
  }
  return null;
}
