import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, UNKNOWN_ERROR_CODE, createExpense, fetchCategories } from '../api/client';
import type { Category, Expense } from '../api/types';
import { ExpenseFormFields, type ExpenseFieldRefs } from '../components/ExpenseFormFields';
import { selectableCategories } from '../lib/categories';
import { today } from '../lib/dates';
import {
  FIX_FIELDS_MESSAGE,
  VALIDATED_FIELDS,
  validateExpenseForm,
  type ExpenseFormErrors,
  type ExpenseFormValues,
} from '../lib/expenseForm';
import styles from './AddExpensePage.module.css';

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
  const fieldRefs: ExpenseFieldRefs = {
    date: useRef<HTMLInputElement>(null),
    amount: useRef<HTMLInputElement>(null),
    categoryId: useRef<HTMLSelectElement>(null),
  };

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((items) => {
        // BR-24: retired categories are not offered for a new expense.
        if (!cancelled) setCategories(selectableCategories(items));
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
          <ExpenseFormFields
            values={values}
            errors={errors}
            categories={categories}
            fieldRefs={fieldRefs}
            onChange={setValue}
          />

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
