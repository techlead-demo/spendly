import styles from './App.module.css';
import { ExpenseListPage } from './pages/ExpenseListPage';

export function App() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>Spendly</span>
      </header>
      <main className={styles.main}>
        <ExpenseListPage />
      </main>
    </div>
  );
}
