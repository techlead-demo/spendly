/** API resource shapes (camelCase, as sent over JSON). */

export interface Category {
  id: number;
  name: string;
}

export interface Expense {
  id: number;
  /** Local date, "YYYY-MM-DD". */
  date: string;
  /** Integer amount in minor units of VND (1 = 1 đồng). */
  amountMinor: number;
  categoryId: number;
  note: string | null;
}
