import { useEffect, useState } from 'react';
import { fetchSummary } from '../api/client';
import type { MonthlySummary } from '../api/types';
import { SummaryTable } from '../components/SummaryTable';
import { currentMonth } from '../lib/dates';
import styles from './SummaryPage.module.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; summary: MonthlySummary }
  | { status: 'error' };

export function SummaryPage() {
  const [month, setMonth] = useState(currentMonth);
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    // A cleared month picker keeps the last summary on screen (A-7).
    if (!month) return;
    let cancelled = false;
    setState({ status: 'loading' });
    fetchSummary(month)
      .then((summary) => {
        if (!cancelled) setState({ status: 'ready', summary });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  return (
    <section>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Summary</h1>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span className={styles.label}>Month</span>
          <input
            type="month"
            className={styles.control}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
      </div>

      {state.status === 'loading' && <p className={styles.loading}>Loading…</p>}
      {state.status === 'error' && (
        <p role="alert" className={styles.error}>
          Could not load the summary. Try again.
        </p>
      )}
      {state.status === 'ready' && <SummaryTable summary={state.summary} />}
    </section>
  );
}
