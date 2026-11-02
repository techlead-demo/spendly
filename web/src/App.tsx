import { useEffect, useState } from 'react';
import type { Expense } from './api/types';
import styles from './App.module.css';
import { currentMonth } from './lib/dates';
import { AddExpensePage } from './pages/AddExpensePage';
import { BudgetsPage } from './pages/BudgetsPage';
import { ALL_CATEGORIES, ExpenseListPage, type ExpenseListFilter } from './pages/ExpenseListPage';
import { SummaryPage } from './pages/SummaryPage';

type Screen = 'expenses' | 'summary' | 'budgets';
type View = 'list' | 'add';

// Hash-based navigation: three screens do not justify a router dependency.
const SCREENS: { screen: Screen; hash: string; label: string }[] = [
  { screen: 'expenses', hash: '#/', label: 'Expenses' },
  { screen: 'summary', hash: '#/summary', label: 'Summary' },
  { screen: 'budgets', hash: '#/budgets', label: 'Budgets' },
];

function screenFromHash(hash: string): Screen {
  return SCREENS.find((link) => link.hash === hash)?.screen ?? 'expenses';
}

/**
 * The Expenses screen: the list and the Add expense form. It unmounts while another screen is shown,
 * so coming back opens the list on the current month (BR-6).
 */
function ExpensesScreen() {
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

  return view === 'list' ? (
    <ExpenseListPage filter={filter} onFilterChange={setFilter} onAddExpense={() => setView('add')} />
  ) : (
    <AddExpensePage onSaved={handleSaved} onCancel={() => setView('list')} />
  );
}

function renderScreen(screen: Screen) {
  if (screen === 'summary') return <SummaryPage />;
  if (screen === 'budgets') return <BudgetsPage />;
  return <ExpensesScreen />;
}

export function App() {
  const [screen, setScreen] = useState(() => screenFromHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setScreen(screenFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

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
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>
      <main className={styles.main}>{renderScreen(screen)}</main>
    </div>
  );
}
