import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ApiError, addCategory, fetchCategories, renameCategory, retireCategory, restoreCategory } from '../api/client';
import type { Category } from '../api/types';
import { CATEGORY_NAME_MAX_LENGTH, managementOrder, validateCategoryName } from '../lib/categories';
import styles from './CategoriesPage.module.css';

const LOAD_FAILED_MESSAGE = 'Could not load the categories. Try again.';
const SAVE_FAILED_MESSAGE = 'Could not save the category. Try again.';

/** The row whose name is being edited (one at a time, AC-12). */
interface RenameState {
  id: number;
  value: string;
  error: string | null;
}

/** A 400 from the API carries a message for the user (BR-23, BR-25); anything else is a save failure. */
function apiMessage(error: unknown): string | null {
  return error instanceof ApiError && error.status === 400 ? error.message : null;
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [rename, setRename] = useState<RenameState | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Guards against a second request before React re-renders the disabled buttons.
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((items) => {
        if (!cancelled) setCategories(items);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function replace(updated: Category) {
    setCategories((current) => current && current.map((c) => (c.id === updated.id ? updated : c)));
  }

  /** Runs one save request; returns the saved category, or null after showing why it failed. */
  async function save(
    send: () => Promise<Category>,
    showApiMessage: (message: string) => void,
  ): Promise<Category | null> {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    setBanner(null);
    try {
      return await send();
    } catch (e) {
      const message = apiMessage(e);
      if (message) showApiMessage(message);
      else setBanner(SAVE_FAILED_MESSAGE);
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categories) return;
    const error = validateCategoryName(newName, categories);
    if (error) {
      setAddError(error);
      return;
    }
    const created = await save(() => addCategory(newName), setAddError);
    if (!created) return;
    setCategories((current) => (current ? [...current, created] : [created]));
    setNewName('');
    setAddError(null);
  }

  function startRename(category: Category) {
    setRename({ id: category.id, value: category.name, error: null });
  }

  async function handleRenameSave() {
    if (!rename || !categories) return;
    const error = validateCategoryName(rename.value, categories, rename.id);
    if (error) {
      setRename({ ...rename, error });
      return;
    }
    const { id, value } = rename;
    const updated = await save(
      () => renameCategory(id, value),
      (message) => setRename((current) => current && { ...current, error: message }),
    );
    if (!updated) return;
    replace(updated);
    setRename((current) => (current?.id === id ? null : current));
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleRenameSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setRename(null);
    }
  }

  async function handleStatusChange(category: Category) {
    const send = category.status === 'active' ? retireCategory : restoreCategory;
    const updated = await save(() => send(category.id), setBanner);
    if (updated) replace(updated);
  }

  function renderName(category: Category) {
    if (rename?.id !== category.id) return category.name;
    const errorId = `category-${category.id}-error`;
    return (
      <>
        <div className={styles.rename}>
          <input
            type="text"
            aria-label="Category name"
            className={rename.error ? `${styles.control} ${styles.invalid}` : styles.control}
            maxLength={CATEGORY_NAME_MAX_LENGTH}
            value={rename.value}
            autoFocus
            aria-invalid={rename.error ? true : undefined}
            aria-describedby={rename.error ? errorId : undefined}
            onChange={(e) => setRename({ ...rename, value: e.target.value, error: null })}
            onKeyDown={handleRenameKeyDown}
          />
          <button type="button" className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={handleRenameSave}>
            Save
          </button>
          <button type="button" className={styles.button} onClick={() => setRename(null)}>
            Cancel
          </button>
        </div>
        {rename.error && (
          <div className={styles.fieldError} id={errorId}>
            {rename.error}
          </div>
        )}
      </>
    );
  }

  function renderTable() {
    if (loadFailed) {
      return (
        <p role="alert" className={styles.error}>
          {LOAD_FAILED_MESSAGE}
        </p>
      );
    }
    if (!categories) {
      return <p className={styles.loading}>Loading…</p>;
    }
    return (
      <>
        {banner && (
          <div role="alert" className={styles.banner}>
            {banner}
          </div>
        )}
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col" className={styles.num}>
                Expenses
              </th>
              <th scope="col">Status</th>
              <th scope="col" className={styles.num} />
            </tr>
          </thead>
          <tbody>
            {managementOrder(categories).map((category) => {
              const isActive = category.status === 'active';
              return (
                <tr key={category.id}>
                  <td>{renderName(category)}</td>
                  <td className={styles.num}>{category.expenseCount}</td>
                  <td>
                    <span className={`${styles.badge} ${isActive ? styles.active : styles.retired}`}>
                      {isActive ? 'Active' : 'Retired'}
                    </span>
                  </td>
                  <td className={styles.num}>
                    <button
                      type="button"
                      className={styles.link}
                      disabled={busy}
                      onClick={() => startRename(category)}
                    >
                      Rename
                    </button>
                    {' · '}
                    <button
                      type="button"
                      className={styles.link}
                      disabled={busy}
                      onClick={() => handleStatusChange(category)}
                    >
                      {isActive ? 'Retire' : 'Restore'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </>
    );
  }

  return (
    <section>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Categories</h1>
      </div>
      <form className={styles.toolbar} noValidate onSubmit={handleAdd}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="new-category">
            New category
          </label>
          <input
            id="new-category"
            type="text"
            className={addError ? `${styles.control} ${styles.invalid}` : styles.control}
            placeholder="e.g. Pets"
            maxLength={CATEGORY_NAME_MAX_LENGTH}
            value={newName}
            aria-invalid={addError ? true : undefined}
            aria-describedby={addError ? 'new-category-error' : undefined}
            onChange={(e) => {
              setNewName(e.target.value);
              setAddError(null);
            }}
          />
          {addError && (
            <span className={styles.fieldError} id="new-category-error">
              {addError}
            </span>
          )}
        </div>
        <button
          type="submit"
          className={`${styles.button} ${styles.primary} ${styles.addButton}`}
          disabled={busy || !categories}
        >
          Add category
        </button>
      </form>
      {renderTable()}
    </section>
  );
}
