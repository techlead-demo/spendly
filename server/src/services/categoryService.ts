import { notFoundError, validationError } from '../errors.js';
import type { CategoryRepository } from '../repositories/categoryRepository.js';
import type { Category } from '../types.js';

/** BR-23: maximum category name length, counted after trimming. */
export const CATEGORY_NAME_MAX_LENGTH = 40;

export const LAST_ACTIVE_MESSAGE = 'At least one category must stay active.';

export interface CategoryService {
  /** All categories in category order, with status and expense count. */
  listCategories(): Category[];
  /** BR-22, BR-23: adds an active category. Throws a validation error for a name that breaks BR-23. */
  addCategory(name: string): Category;
  /**
   * BR-23, BR-24: renames a category everywhere. Its own name in another letter case is allowed.
   * Throws 404 NOT_FOUND for an unknown id and a validation error for a name that breaks BR-23.
   */
  renameCategory(id: number, name: string): Category;
  /** BR-24, BR-25: idempotent. Throws a validation error when it is the only active category. */
  retireCategory(id: number): Category;
  /** BR-24: idempotent. */
  restoreCategory(id: number): Category;
}

function categoryNotFound(id: number) {
  return notFoundError(`category ${id} does not exist`);
}

/** Case-insensitive comparison key of a name (BR-23). */
function nameKey(name: string): string {
  return name.toLocaleLowerCase('en');
}

export function createCategoryService(categories: CategoryRepository): CategoryService {
  /** BR-23: returns the trimmed name, or throws with the message the web app shows under the name input. */
  function checkName(name: string, ownId?: number): string {
    const trimmed = name.trim();
    if (trimmed === '') {
      throw validationError('Enter a category name.');
    }
    if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) {
      throw validationError(`A category name can have at most ${CATEGORY_NAME_MAX_LENGTH} characters.`);
    }
    const key = nameKey(trimmed);
    if (categories.findAll().some((c) => c.id !== ownId && nameKey(c.name) === key)) {
      throw validationError(`A category named "${trimmed}" already exists.`);
    }
    return trimmed;
  }

  function existing(id: number): Category {
    const category = categories.findById(id);
    if (!category) throw categoryNotFound(id);
    return category;
  }

  function setRetired(id: number, retired: boolean): Category {
    const updated = categories.setRetired(id, retired);
    if (!updated) throw categoryNotFound(id);
    return updated;
  }

  return {
    listCategories: () => categories.findAll(),
    addCategory(name) {
      return categories.create(checkName(name));
    },
    renameCategory(id, name) {
      existing(id);
      const updated = categories.rename(id, checkName(name, id));
      if (!updated) throw categoryNotFound(id);
      return updated;
    },
    retireCategory(id) {
      const category = existing(id);
      if (category.status === 'retired') return category;
      if (categories.countActive() <= 1) {
        throw validationError(LAST_ACTIVE_MESSAGE);
      }
      return setRetired(id, true);
    },
    restoreCategory(id) {
      existing(id);
      return setRetired(id, false);
    },
  };
}
