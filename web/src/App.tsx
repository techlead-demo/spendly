import { useEffect, useState } from 'react';
import styles from './App.module.css';
import { ExpenseListPage } from './pages/ExpenseListPage';
import { SummaryPage } from './pages/SummaryPage';

type Screen = 'expenses' | 'summary';

// Hash-based navigation: two screens do not justify a router dependency.
const SCREENS: { screen: Screen; hash: string; label: string }[] = [
  { screen: 'expenses', hash: '#/', label: 'Expenses' },
  { screen: 'summary', hash: '#/summary', label: 'Summary' },
];

function screenFromHash(hash: string): Screen {
  return hash === '#/summary' ? 'summary' : 'expenses';
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
      <main className={styles.main}>{screen === 'summary' ? <SummaryPage /> : <ExpenseListPage />}</main>
    </div>
  );
}
