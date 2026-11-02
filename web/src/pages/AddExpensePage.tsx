import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, UNKNOWN_ERROR_CODE, createExpense, fetchCategories } from '../api/client';
import type { Category, Expense } from '../api/types';
import { today } from '../lib/dates';
import {
  NOTE_MAX_LENGTH,
  VALIDATED_FIELDS,
  validateExpenseForm,
  type ExpenseFormErrors,
  type ExpenseFormValues,
  type ValidatedField,
} from '../lib/expenseForm';
import styles from './AddExpensePage.module.css';

const FIX_FIELDS_MESSAGE = 'Please fix the highlighted fields.';
const SAVE_FAILED_MESSAGE = 'Could not save the expense. Try again.';
const CATEGORIES_FAILED_MESSAGE = 'Could not load categories. Try again.';

interface AddExpensePageProps {
  onSaved: (expense: Expense) => void;
  onCancel: () => void;
}

export function AddExpensePage({ onSaved, onCancel }: AddExpensePageProps) {
  const [values, setValues] = useState<ExpenseFormValues>(() => ({
    date: today(),
    amount: '',
    categoryId: '',
    note: '',
  }));
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  // Guards against a second submit before React re-renders the disabled button (AC-10).
  const savingRef = useRef(false);
  const fieldRefs = {
    date: useRef<HTMLInputElement>(null),
    amount: useRef<HTMLInputElement>(null),
    categoryId: useRef<HTMLSelectElement>(null),
  } satisfies Record<ValidatedField, unknown>;

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((items) => {
        if (!cancelled) setCategories(items);
      })
      .catch(() => {
        if (!cancelled) setBanner(CATEGORIES_FAILED_MESSAGE);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setValue(field: keyof ExpenseFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;

    const result = validateExpenseForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      setBanner(FIX_FIELDS_MESSAGE);
      const firstInvalid = VALIDATED_FIELDS.find((field) => result.errors[field]);
      if (firstInvalid) fieldRefs[firstInvalid].current?.focus();
      return;
    }

    setErrors({});
    setBanner(null);
    savingRef.current = true;
    setSaving(true);
    try {
      onSaved(await createExpense(result.expense));
    } catch (e) {
      setBanner(e instanceof ApiError && e.code !== UNKNOWN_ERROR_CODE ? e.message : SAVE_FAILED_MESSAGE);
      savingRef.current = false;
      setSaving(false);
    }
  }

  function controlClass(field: ValidatedField): string | undefined {
    return errors[field] ? `${styles.control} ${styles.invalid}` : styles.control;
  }

  function fieldError(field: ValidatedField) {
    return (
      errors[field] && (
        <span className={styles.fieldError} id={`expense-${field}-error`}>
          {errors[field]}
        </span>
      )
    );
  }

  function describedBy(field: ValidatedField, hintId?: string): string | undefined {
    const ids = [hintId, errors[field] ? `expense-${field}-error` : undefined];
    return ids.filter((id) => id !== undefined).join(' ') || undefined;
  }

  return (
    <section>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Add expense</h1>
      </div>
      <div className={styles.card}>
        {banner && (
          <div role="alert" className={styles.banner}>
            {banner}
          </div>
        )}
        <form className={styles.form} noValidate onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="expense-date">
              Date
            </label>
            <input
              id="expense-date"
              ref={fieldRefs.date}
              type="date"
              className={controlClass('date')}
              value={values.date}
              aria-invalid={errors.date ? true : undefined}
              aria-describedby={describedBy('date')}
              onChange={(e) => setValue('date', e.target.value)}
            />
            {fieldError('date')}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="expense-amount">
              Amount
            </label>
            <span className={styles.amount}>
              <input
                id="expense-amount"
                ref={fieldRefs.amount}
                type="text"
                inputMode="numeric"
                placeholder="0"
                className={controlClass('amount')}
                value={values.amount}
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby={describedBy('amount', 'expense-amount-hint')}
                onChange={(e) => setValue('amount', e.target.value)}
              />
              <span className={styles.suffix} aria-hidden="true">
                ₫
              </span>
            </span>
            <span className={styles.hint} id="expense-amount-hint">
              Whole đồng, no decimals.
            </span>
            {fieldError('amount')}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="expense-category">
              Category
            </label>
            <select
              id="expense-category"
              ref={fieldRefs.categoryId}
              className={controlClass('categoryId')}
              value={values.categoryId}
              aria-invalid={errors.categoryId ? true : undefined}
              aria-describedby={describedBy('categoryId')}
              onChange={(e) => setValue('categoryId', e.target.value)}
            >
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {fieldError('categoryId')}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="expense-note">
              Note <span className={styles.muted}>(optional)</span>
            </label>
            <textarea
              id="expense-note"
              className={`${styles.control} ${styles.textarea}`}
              rows={2}
              maxLength={NOTE_MAX_LENGTH}
              value={values.note}
              onChange={(e) => setValue('note', e.target.value)}
            />
          </div>

          <div className={styles.actions}>
            <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={saving}>
              Save
            </button>
            <button type="button" className={styles.button} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
