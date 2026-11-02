import { useEffect, useState } from 'react';
import type { Expense } from './api/types';
import styles from './App.module.css';
import { currentMonth } from './lib/dates';
import { AddExpensePage } from './pages/AddExpensePage';
import { BudgetsPage } from './pages/BudgetsPage';
import { ALL_CATEGORIES, ExpenseListPage, type ExpenseListFilter } from './pages/ExpenseListPage';
import { SummaryPlaceholderPage } from './pages/SummaryPlaceholderPage';

type Screen = 'expenses' | 'summary' | 'budgets';
type ExpensesView = 'list' | 'add';

// Hash-based navigation (as on the SPD-2 branch): three screens do not justify a router dependency.
const SCREENS: { screen: Screen; hash: string; label: string }[] = [
  { screen: 'expenses', hash: '#/', label: 'Expenses' },
  { screen: 'summary', hash: '#/summary', label: 'Summary' },
  { screen: 'budgets', hash: '#/budgets', label: 'Budgets' },
];

function screenFromHash(hash: string): Screen {
  return SCREENS.find((link) => link.hash === hash)?.screen ?? 'expenses';
}

export function App() {
  const [screen, setScreen] = useState(() => screenFromHash(window.location.hash));
  const [view, setView] = useState<ExpensesView>('list');
  // Kept here, not in the list page, so that Cancel returns to the same month and category.
  const [filter, setFilter] = useState<ExpenseListFilter>(() => ({
    month: currentMonth(),
    categoryId: ALL_CATEGORIES,
  }));

  useEffect(() => {
    const onHashChange = () => setScreen(screenFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function handleSaved(expense: Expense) {
    setFilter({ month: expense.date.slice(0, 7), categoryId: ALL_CATEGORIES });
    setView('list');
  }

  function renderScreen() {
    if (screen === 'summary') return <SummaryPlaceholderPage />;
    if (screen === 'budgets') return <BudgetsPage />;
    return view === 'list' ? (
      <ExpenseListPage filter={filter} onFilterChange={setFilter} onAddExpense={() => setView('add')} />
    ) : (
      <AddExpensePage onSaved={handleSaved} onCancel={() => setView('list')} />
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>Spendly</span>
        <nav className={styles.nav}>
          {SCREENS.map((link) => (
            <a
              key={link.screen}
              href={link.hash}
              className={link.screen === screen ? `${styles.navLink} ${styles.active}` : styles.navLink}
              aria-current={link.screen === screen ? 'page' : undefined}
              // "Expenses" also leaves the Add expense form when the hash does not change.
              onClick={() => setView('list')}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>
      <main className={styles.main}>{renderScreen()}</main>
    </div>
  );
}
