import type { OverBudgetCategory } from '../api/types';
import { formatMoney } from './money';

/**
 * Heading of the over-budget banner: "this month" for the current month, "in MM/YYYY" for any other (SPD-5 A-2).
 * `month` and `current` are "YYYY-MM".
 */
export function overBudgetHeading(count: number, month: string, current: string): string {
  const subject = count === 1 ? '1 category is' : `${count} categories are`;
  const [year, monthNumber] = month.split('-');
  const when = month === current ? 'this month' : `in ${monthNumber}/${year}`;
  return `${subject} over budget ${when}`;
}

/** "Food: 785.000 ₫ spent of 700.000 ₫ budget, 85.000 ₫ over" */
export function overBudgetLine(item: OverBudgetCategory): string {
  return (
    `${item.categoryName}: ${formatMoney(item.spentMinor)} spent of ${formatMoney(item.budgetMinor)} budget, ` +
    `${formatMoney(item.overMinor)} over`
  );
}
