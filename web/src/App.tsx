import { useState } from 'react';
import type { Expense } from './api/types';
import styles from './App.module.css';
import { currentMonth } from './lib/dates';
import { AddExpensePage } from './pages/AddExpensePage';
import { ALL_CATEGORIES, ExpenseListPage, type ExpenseListFilter } from './pages/ExpenseListPage';

type View = 'list' | 'add';

export function App() {
  const [view, setView] = useState<View>('list');
  // Kept here, not in the list page, so that Cancel returns to the same month and category.
  const [filter, setFilter] = useState<ExpenseListFilter>(() => ({
    month: currentMonth(),
    categoryId: ALL_CATEGORIES,
  }));

  function handleSaved(expense: Expense) {
    setFilter({ month: expense.date.slice(0, 7), categoryId: ALL_CATEGORIES });
    setView('list');
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>Spendly</span>
      </header>
      <main className={styles.main}>
        {view === 'list' ? (
          <ExpenseListPage filter={filter} onFilterChange={setFilter} onAddExpense={() => setView('add')} />
        ) : (
          <AddExpensePage onSaved={handleSaved} onCancel={() => setView('list')} />
        )}
      </main>
    </div>
  );
}
