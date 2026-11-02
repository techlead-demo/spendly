import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ApiError,
  UNKNOWN_ERROR_CODE,
  deleteExpense,
  fetchCategories,
  fetchExpense,
  updateExpense,
} from '../api/client';
import type { Category, Expense } from '../api/types';
import { DeleteExpenseDialog } from '../components/DeleteExpenseDialog';
import { ExpenseFormFields, type ExpenseFieldRefs } from '../components/ExpenseFormFields';
import { formatDate } from '../lib/dates';
import {
  FIX_FIELDS_MESSAGE,
  VALIDATED_FIELDS,
  expenseToFormValues,
  validateExpenseForm,
  type ExpenseFormErrors,
  type ExpenseFormValues,
} from '../lib/expenseForm';
import { formatMoney } from '../lib/money';
import { EXPENSES_HASH } from '../lib/navigation';
import styles from './EditExpensePage.module.css';

const SAVE_FAILED_MESSAGE = 'Could not save the expense. Try again.';
const DELETE_FAILED_MESSAGE = 'Could not delete the expense. Try again.';
const NOT_FOUND_MESSAGE = 'This expense no longer exists.';
const LOAD_FAILED_MESSAGE = 'Could not load the expense. Try again.';

type LoadState = 'loading' | 'ready' | 'notFound' | 'loadError';

interface EditExpensePageProps {
  expenseId: number;
  onSaved: (expense: Expense) => void;
  onCancel: () => void;
  /** Called with the expense as stored before any unsaved edits (AC-22). */
  onDeleted: (expense: Expense) => void;
  /** "Back to expenses" in the not-found and load-error states. */
  onBack: () => void;
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function EditExpensePage({ expenseId, onSaved, onCancel, onDeleted, onBack }: EditExpensePageProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [stored, setStored] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [values, setValues] = useState<ExpenseFormValues>({ date: '', amount: '', categoryId: '', note: '' });
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Guard against a second request before React re-renders the disabled buttons (AC-10, AC-23).
  const busyRef = useRef(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const fieldRefs: ExpenseFieldRefs = {
    date: useRef<HTMLInputElement>(null),
    amount: useRef<HTMLInputElement>(null),
    categoryId: useRef<HTMLSelectElement>(null),
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchExpense(expenseId), fetchCategories()])
      .then(([expense, items]) => {
        if (cancelled) return;
        setStored(expense);
        setCategories(items);
        setValues(expenseToFormValues(expense));
        setLoadState('ready');
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadState(isNotFound(e) ? 'notFound' : 'loadError');
      });
    return () => {
      cancelled = true;
    };
  }, [expenseId]);

  function setValue(field: keyof ExpenseFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;

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
    busyRef.current = true;
    setSaving(true);
    try {
      onSaved(await updateExpense(expenseId, result.expense));
    } catch (e) {
      if (isNotFound(e)) {
        setLoadState('notFound');
      } else {
        setBanner(e instanceof ApiError && e.code !== UNKNOWN_ERROR_CODE ? e.message : SAVE_FAILED_MESSAGE);
      }
      busyRef.current = false;
      setSaving(false);
    }
  }

  function closeDialog() {
    setDialogOpen(false);
    deleteButtonRef.current?.focus();
  }

  async function handleConfirmDelete() {
    if (busyRef.current || !stored) return;
    busyRef.current = true;
    setDeleting(true);
    try {
      await deleteExpense(expenseId);
      onDeleted(stored);
    } catch (e) {
      setDialogOpen(false);
      if (isNotFound(e)) {
        setLoadState('notFound');
      } else {
        setBanner(DELETE_FAILED_MESSAGE);
      }
      busyRef.current = false;
      setDeleting(false);
    }
  }

  function renderBody() {
    if (loadState === 'loading') {
      return <p className={styles.muted}>Loading…</p>;
    }
    if (loadState === 'notFound' || loadState === 'loadError') {
      return (
        <>
          <div role="alert" className={styles.banner}>
            {loadState === 'notFound' ? NOT_FOUND_MESSAGE : LOAD_FAILED_MESSAGE}
          </div>
          <a
            className={styles.link}
            href={EXPENSES_HASH}
            onClick={(event) => {
              event.preventDefault();
              onBack();
            }}
          >
            Back to expenses
          </a>
        </>
      );
    }
    return (
      <>
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
            <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={saving || deleting}>
              Save
            </button>
            <button type="button" className={styles.button} onClick={onCancel}>
              Cancel
            </button>
            <span className={styles.spacer} />
            <button
              ref={deleteButtonRef}
              type="button"
              className={`${styles.button} ${styles.danger}`}
              disabled={saving || deleting}
              onClick={() => setDialogOpen(true)}
            >
              Delete
            </button>
          </div>
        </form>
      </>
    );
  }

  const categoryName = categories.find((c) => c.id === stored?.categoryId)?.name ?? '—';

  return (
    <section>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Edit expense</h1>
      </div>
      <div className={styles.card}>{renderBody()}</div>
      {dialogOpen && loadState === 'ready' && stored && (
        <DeleteExpenseDialog
          expenseLabel={`${formatDate(stored.date)} · ${categoryName} · ${formatMoney(stored.amountMinor)}`}
          deleting={deleting}
          onConfirm={handleConfirmDelete}
          onKeep={closeDialog}
        />
      )}
    </section>
  );
}
