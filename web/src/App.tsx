import { useCallback, useEffect, useRef, useState } from 'react';
import { restoreExpense } from './api/client';
import type { Expense } from './api/types';
import styles from './App.module.css';
import { UndoToast } from './components/UndoToast';
import { currentMonth } from './lib/dates';
import { EXPENSES_HASH, parseEditExpenseHash } from './lib/navigation';
import { AddExpensePage } from './pages/AddExpensePage';
import { BudgetsPage } from './pages/BudgetsPage';
import { EditExpensePage } from './pages/EditExpensePage';
import { ALL_CATEGORIES, ExpenseListPage, type ExpenseListFilter } from './pages/ExpenseListPage';
import { SummaryPage } from './pages/SummaryPage';

type Screen = 'expenses' | 'summary' | 'budgets';
type View = 'list' | 'add';

/** BR-21: how long the "Expense deleted." toast offers Undo, and how long a restore error stays. */
const UNDO_TOAST_MS = 5000;

// Hash-based navigation: three screens do not justify a router dependency.
const SCREENS: { screen: Screen; hash: string; label: string }[] = [
  { screen: 'expenses', hash: EXPENSES_HASH, label: 'Expenses' },
  { screen: 'summary', hash: '#/summary', label: 'Summary' },
  { screen: 'budgets', hash: '#/budgets', label: 'Budgets' },
];

function screenFromHash(hash: string): Screen {
  // The Edit expense route (#/expenses/<id>/edit) belongs to the Expenses screen, which keeps the list filter.
  return SCREENS.find((link) => link.hash === hash)?.screen ?? 'expenses';
}

/** The undo toast after a delete: offering Undo, restoring, or showing a restore failure. */
interface UndoState {
  expense: Expense;
  status: 'deleted' | 'restoring' | 'failed';
}

interface ExpensesScreenProps {
  /** Id of the expense being edited (from the hash), or null for the list / Add expense form. */
  editId: number | null;
  navigate: (hash: string) => void;
}

function currentMonthFilter(): ExpenseListFilter {
  return { month: currentMonth(), categoryId: ALL_CATEGORIES };
}

/**
 * The Expenses screen: the list, the Add expense form and the Edit expense form. It unmounts while another screen
 * is shown, so coming back opens the list on the current month (BR-6).
 */
function ExpensesScreen({ editId, navigate }: ExpensesScreenProps) {
  const [view, setView] = useState<View>('list');
  // Kept here, not in the list page, so that Cancel and Delete return to the same month and category.
  const [filter, setFilter] = useState<ExpenseListFilter>(currentMonthFilter);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Only one restore request per toast (AC-39).
  const restoringRef = useRef(false);
  const showingList = editId === null && view === 'list';

  // The toast closes when the user leaves the list (AC-38).
  useEffect(() => {
    if (!showingList) setUndo(null);
  }, [showingList]);

  // The toast closes 5 seconds after the delete or a failed restore; it stays open while restoring (AC-36, AC-39).
  useEffect(() => {
    if (!undo || undo.status === 'restoring') return;
    const timer = setTimeout(() => setUndo(null), UNDO_TOAST_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  function backToList() {
    setView('list');
    navigate(EXPENSES_HASH);
  }

  function handleSaved(expense: Expense) {
    setFilter({ month: expense.date.slice(0, 7), categoryId: ALL_CATEGORIES });
    backToList();
  }

  function handleDeleted(expense: Expense) {
    restoringRef.current = false;
    setUndo({ expense, status: 'deleted' });
    backToList();
  }

  function handleBack() {
    setFilter(currentMonthFilter());
    backToList();
  }

  async function handleUndo() {
    if (!undo || undo.status !== 'deleted' || restoringRef.current) return;
    restoringRef.current = true;
    const { expense } = undo;
    const isThisRestore = (current: UndoState | null) =>
      current?.expense.id === expense.id && current.status === 'restoring';
    setUndo({ expense, status: 'restoring' });
    try {
      await restoreExpense(expense.id);
      setUndo((current) => (isThisRestore(current) ? null : current));
      setReloadKey((key) => key + 1);
    } catch {
      setUndo((current) => (isThisRestore(current) ? { expense, status: 'failed' } : current));
    }
  }

  if (editId !== null) {
    return (
      <EditExpensePage
        key={editId}
        expenseId={editId}
        onSaved={handleSaved}
        onCancel={backToList}
        onDeleted={handleDeleted}
        onBack={handleBack}
      />
    );
  }
  if (view === 'add') {
    return <AddExpensePage onSaved={handleSaved} onCancel={() => setView('list')} />;
  }
  return (
    <>
      <ExpenseListPage
        filter={filter}
        onFilterChange={setFilter}
        onAddExpense={() => setView('add')}
        reloadKey={reloadKey}
      />
      {undo && (
        <UndoToast
          message={undo.status === 'failed' ? 'Could not restore the expense.' : 'Expense deleted.'}
          onUndo={undo.status === 'failed' ? undefined : handleUndo}
          undoDisabled={undo.status === 'restoring'}
        />
      )}
    </>
  );
}

function renderScreen(hash: string, navigate: (hash: string) => void) {
  const screen = screenFromHash(hash);
  if (screen === 'summary') return <SummaryPage />;
  if (screen === 'budgets') return <BudgetsPage />;
  return <ExpensesScreen editId={parseEditExpenseHash(hash)} navigate={navigate} />;
}

export function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  const screen = screenFromHash(hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: string) => {
    window.location.hash = next;
    setHash(next);
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
      <main className={styles.main}>{renderScreen(hash, navigate)}</main>
    </div>
  );
}
