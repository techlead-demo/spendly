import type { MonthlySummary } from '../api/types';
import { formatMoney } from '../lib/money';
import { formatShare } from '../lib/share';
import styles from './SummaryTable.module.css';

interface SummaryTableProps {
  summary: MonthlySummary;
}

export function SummaryTable({ summary }: SummaryTableProps) {
  if (summary.items.length === 0) {
    return <p className={styles.empty}>No expenses for this month.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Category</th>
          <th scope="col" className={styles.num}>
            Expenses
          </th>
          <th scope="col" className={styles.num}>
            Total
          </th>
          <th scope="col" className={styles.num}>
            Share
          </th>
        </tr>
      </thead>
      <tbody>
        {summary.items.map((item) => (
          <tr key={item.categoryId}>
            <td>{item.categoryName}</td>
            <td className={styles.num}>{item.count}</td>
            <td className={styles.num}>{formatMoney(item.totalMinor)}</td>
            <td className={styles.num}>{formatShare(item.totalMinor, summary.monthTotalMinor)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>Month total</td>
          <td className={styles.num}>{summary.monthCount}</td>
          <td className={styles.num}>{formatMoney(summary.monthTotalMinor)}</td>
          {/* BR-15: the footer always shows 100,0%, even when rounded rows do not add up to it. */}
          <td className={styles.num}>{formatShare(1, 1)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
