import type { Category, Expense } from '../api/types';
import { formatDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { editExpenseHash } from '../lib/navigation';
import styles from './ExpenseTable.module.css';

interface ExpenseTableProps {
  expenses: Expense[];
  categories: Category[];
}

export function ExpenseTable({ expenses, categories }: ExpenseTableProps) {
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  if (expenses.length === 0) {
    return <p className={styles.empty}>No expenses for this month.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Category</th>
          <th scope="col">Note</th>
          <th scope="col" className={styles.amount}>
            Amount
          </th>
          <th scope="col" className={styles.action} />
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <tr key={expense.id}>
            <td>{formatDate(expense.date)}</td>
            <td>{categoryNames.get(expense.categoryId) ?? '—'}</td>
            <td className={styles.note}>{expense.note ?? ''}</td>
            <td className={styles.amount}>{formatMoney(expense.amountMinor)}</td>
            <td className={styles.action}>
              <a className={styles.link} href={editExpenseHash(expense.id)}>
                Edit
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
