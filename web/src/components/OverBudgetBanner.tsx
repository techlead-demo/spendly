import type { MonthOverBudget } from '../api/types';
import { overBudgetHeading, overBudgetLine } from '../lib/overBudget';
import styles from './OverBudgetBanner.module.css';

interface OverBudgetBannerProps {
  overBudget: MonthOverBudget;
  /** The current month, "YYYY-MM", to word the heading. */
  currentMonth: string;
}

/** Warning listing the categories over budget (BR-19); renders nothing when there are none. */
export function OverBudgetBanner({ overBudget, currentMonth }: OverBudgetBannerProps) {
  const { month, items } = overBudget;
  if (items.length === 0) return null;

  return (
    <div role="alert" className={styles.banner}>
      <strong aria-hidden="true">⚠</strong>
      <div>
        <strong>{overBudgetHeading(items.length, month, currentMonth)}</strong>
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.categoryId}>{overBudgetLine(item)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
