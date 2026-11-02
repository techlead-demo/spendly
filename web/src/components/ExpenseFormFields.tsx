import type { RefObject } from 'react';
import type { Category } from '../api/types';
import {
  NOTE_MAX_LENGTH,
  type ExpenseFormErrors,
  type ExpenseFormValues,
  type ValidatedField,
} from '../lib/expenseForm';
import styles from './ExpenseFormFields.module.css';

export interface ExpenseFieldRefs {
  date: RefObject<HTMLInputElement>;
  amount: RefObject<HTMLInputElement>;
  categoryId: RefObject<HTMLSelectElement>;
}

interface ExpenseFormFieldsProps {
  values: ExpenseFormValues;
  errors: ExpenseFormErrors;
  categories: Category[];
  /** Refs of the validated fields, so the page can focus the first invalid one. */
  fieldRefs: ExpenseFieldRefs;
  onChange: (field: keyof ExpenseFormValues, value: string) => void;
}

/** Date, Amount, Category and Note of the Add and Edit expense forms (SPD-1, SPD-3). */
export function ExpenseFormFields({ values, errors, categories, fieldRefs, onChange }: ExpenseFormFieldsProps) {
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
    <>
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
          onChange={(e) => onChange('date', e.target.value)}
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
            onChange={(e) => onChange('amount', e.target.value)}
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
          onChange={(e) => onChange('categoryId', e.target.value)}
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
          onChange={(e) => onChange('note', e.target.value)}
        />
      </div>
    </>
  );
}
