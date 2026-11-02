import { useEffect, useState } from 'react';
import { fetchCategories, fetchExpenses } from '../api/client';
import type { Category, ExpenseListResponse } from '../api/types';
import { ExpenseTable } from '../components/ExpenseTable';
import { formatMoney } from '../lib/money';
import styles from './ExpenseListPage.module.css';

export const ALL_CATEGORIES = '';

export interface ExpenseListFilter {
  /** "YYYY-MM" */
  month: string;
  /** Category id as a string, or `ALL_CATEGORIES`. */
  categoryId: string;
}

interface ExpenseListPageProps {
  filter: ExpenseListFilter;
  onFilterChange: (filter: ExpenseListFilter) => void;
  onAddExpense: () => void;
}

export function ExpenseListPage({ filter, onFilterChange, onAddExpense }: ExpenseListPageProps) {
  const { month, categoryId } = filter;
  const [categories, setCategories] = useState<Category[]>([]);
  const [list, setList] = useState<ExpenseListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!month) return;
    let cancelled = false;
    setError(null);
    fetchExpenses(month, categoryId === ALL_CATEGORIES ? undefined : Number(categoryId))
      .then((data) => {
        if (!cancelled) setList(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [month, categoryId]);

  return (
    <section>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Expenses</h1>
        <button type="button" className={styles.primaryButton} onClick={onAddExpense}>
          Add expense
        </button>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span className={styles.label}>Month</span>
          <input
            type="month"
            className={styles.control}
            value={month}
            onChange={(e) => onFilterChange({ ...filter, month: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Category</span>
          <select
            className={styles.control}
            value={categoryId}
            onChange={(e) => onFilterChange({ ...filter, categoryId: e.target.value })}
          >
            <option value={ALL_CATEGORIES}>All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className={styles.error}>
          Could not load expenses: {error}
        </p>
      )}

      {list && (
        <>
          <ExpenseTable expenses={list.items} categories={categories} />
          <div className={styles.total}>
            <span>Month total</span>
            <strong data-testid="month-total">{formatMoney(list.monthTotalMinor)}</strong>
          </div>
        </>
      )}
    </section>
  );
}
