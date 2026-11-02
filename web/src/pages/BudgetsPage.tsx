import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, fetchBudgets, fetchCategories, saveBudgets } from '../api/client';
import type { Category, MonthBudgets } from '../api/types';
import { BUDGET_MESSAGE, toBudgetFormValues, validateBudgetForm, type BudgetFormValues } from '../lib/budgetForm';
import { currentMonth } from '../lib/dates';
import styles from './BudgetsPage.module.css';

const HINT = 'A budget applies to this month and every later month until you change it. Leave it empty for no limit.';
const PAST_MONTH_TEXT = 'Past months cannot be changed.';
const FIX_FIELDS_MESSAGE = 'Please fix the highlighted fields.';
const LOAD_FAILED_MESSAGE = 'Could not load the budgets. Try again.';
const SAVE_FAILED_MESSAGE = 'Could not save the budgets. Try again.';

export function BudgetsPage() {
  const [thisMonth] = useState(() => currentMonth());
  const [month, setMonth] = useState(thisMonth);
  const [categories, setCategories] = useState<Category[] | null>(null);
  // Budgets in effect for the month on screen; null while loading.
  const [budgets, setBudgets] = useState<MonthBudgets | null>(null);
  const [values, setValues] = useState<BudgetFormValues>({});
  const [invalid, setInvalid] = useState<number[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // Kept apart from loadFailed: categories are loaded once, so a month change must not hide their error (AC-22).
  const [categoriesFailed, setCategoriesFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  // Incremented on every month load, so a save that finishes after a month change is ignored.
  const loadId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((items) => {
        if (!cancelled) setCategories(items);
      })
      .catch(() => {
        if (!cancelled) setCategoriesFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // A cleared Month picker keeps the budgets on screen (AC-20).
    if (!month) return;
    let cancelled = false;
    loadId.current += 1;
    // Changing the month discards unsaved edits (AC-19).
    setBudgets(null);
    setLoadFailed(false);
    setBanner(null);
    setInvalid([]);
    setSaved(false);
    fetchBudgets(month)
      .then((data) => {
        if (cancelled) return;
        setBudgets(data);
        setValues(toBudgetFormValues(data.items));
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const isPast = (budgets?.month ?? month) < thisMonth;

  function setValue(categoryId: number, value: string) {
    setValues((current) => ({ ...current, [categoryId]: value }));
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!budgets || saving) return;

    const result = validateBudgetForm(values, budgets.items);
    if (!result.ok) {
      setInvalid(result.invalidCategoryIds);
      setBanner(FIX_FIELDS_MESSAGE);
      setSaved(false);
      const first = result.invalidCategoryIds[0];
      if (first !== undefined) inputRefs.current[first]?.focus();
      return;
    }

    setInvalid([]);
    setBanner(null);
    if (result.changes.length === 0) {
      setSaved(true);
      return;
    }
    setSaving(true);
    const saveLoadId = loadId.current;
    try {
      const data = await saveBudgets(budgets.month, result.changes);
      if (loadId.current !== saveLoadId) return;
      setBudgets(data);
      setValues(toBudgetFormValues(data.items));
      setSaved(true);
    } catch (e) {
      if (loadId.current !== saveLoadId) return;
      // The edits stay in the fields (AC-23).
      setBanner(e instanceof ApiError && e.status === 400 ? e.message : SAVE_FAILED_MESSAGE);
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }

  function categoryName(categoryId: number): string {
    return categories?.find((c) => c.id === categoryId)?.name ?? `Category ${categoryId}`;
  }

  function renderContent() {
    if (loadFailed || categoriesFailed) {
      return (
        <p role="alert" className={styles.error}>
          {LOAD_FAILED_MESSAGE}
        </p>
      );
    }
    if (!budgets || !categories) {
      return <p className={styles.loading}>Loading…</p>;
    }
    return (
      <>
        {banner && (
          <div role="alert" className={styles.banner}>
            {banner}
          </div>
        )}
        <form noValidate onSubmit={handleSubmit}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Monthly budget</th>
              </tr>
            </thead>
            <tbody>
              {budgets.items.map(({ categoryId }) => {
                const name = categoryName(categoryId);
                const isInvalid = invalid.includes(categoryId);
                const errorId = `budget-${categoryId}-error`;
                return (
                  <tr key={categoryId}>
                    <td>{name}</td>
                    <td>
                      <span className={styles.amount}>
                        <input
                          ref={(element) => {
                            inputRefs.current[categoryId] = element;
                          }}
                          type="text"
                          inputMode="numeric"
                          placeholder="No limit"
                          aria-label={`${name} budget`}
                          className={isInvalid ? `${styles.control} ${styles.invalid}` : styles.control}
                          value={values[categoryId] ?? ''}
                          disabled={isPast}
                          aria-invalid={isInvalid ? true : undefined}
                          aria-describedby={isInvalid ? errorId : undefined}
                          onChange={(e) => setValue(categoryId, e.target.value)}
                        />
                        <span className={styles.suffix} aria-hidden="true">
                          ₫
                        </span>
                      </span>
                      {isInvalid && (
                        <div className={styles.fieldError} id={errorId}>
                          {BUDGET_MESSAGE}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isPast && (
            <div className={styles.actions}>
              <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={saving}>
                Save
              </button>
              {saved && (
                <span role="status" className={styles.status}>
                  Budgets saved.
                </span>
              )}
            </div>
          )}
        </form>
      </>
    );
  }

  return (
    <section>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Budgets</h1>
      </div>
      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span className={styles.label}>Month</span>
          <input
            type="month"
            className={styles.control}
            value={month}
            min={thisMonth}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
      </div>
      <p className={styles.hint}>{isPast ? PAST_MONTH_TEXT : HINT}</p>
      {renderContent()}
    </section>
  );
}
