import { useEffect, useState } from 'react';
import { fetchCategories, fetchExpenses, fetchOverBudget } from '../api/client';
import type { Category, ExpenseListResponse, MonthOverBudget } from '../api/types';
import { ExpenseTable } from '../components/ExpenseTable';
import { OverBudgetBanner } from '../components/OverBudgetBanner';
import { currentMonth } from '../lib/dates';
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
  /** Changing it reloads the list (e.g. after an Undo restored an expense). */
  reloadKey?: number;
}

export function ExpenseListPage({ filter, onFilterChange, onAddExpense, reloadKey = 0 }: ExpenseListPageProps) {
  const { month, categoryId } = filter;
  const [categories, setCategories] = useState<Category[]>([]);
  const [list, setList] = useState<ExpenseListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overBudget, setOverBudget] = useState<MonthOverBudget | null>(null);

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
  }, [month, categoryId, reloadKey]);

  // The banner covers the whole month whatever the category filter (BR-8, SPD-5 AC-12). It is extra
  // information: while it loads or when it fails, the list is shown without it and without an error.
  useEffect(() => {
    if (!month) return;
    let cancelled = false;
    setOverBudget(null);
    fetchOverBudget(month)
      .then((data) => {
        if (!cancelled) setOverBudget(data);
      })
      .catch(() => {
        if (!cancelled) setOverBudget(null);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  return (
    <section>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Expenses</h1>
        <button type="button" className={styles.primaryButton} onClick={onAddExpense}>
          Add expense
        </button>
      </div>

      {overBudget && <OverBudgetBanner overBudget={overBudget} currentMonth={currentMonth()} />}

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
