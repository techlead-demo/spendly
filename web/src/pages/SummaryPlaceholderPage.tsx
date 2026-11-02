import styles from './SummaryPlaceholderPage.module.css';

/** Target of the "Summary" header link until the SPD-2 summary screen is merged; replace it with SPD-2's SummaryPage. */
export function SummaryPlaceholderPage() {
  return (
    <section>
      <h1 className={styles.title}>Summary</h1>
      <p className={styles.text}>The monthly summary is not available yet.</p>
    </section>
  );
}
