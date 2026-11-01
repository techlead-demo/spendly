/** Dates are local calendar dates, "YYYY-MM-DD"; months are "YYYY-MM". */

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

export function toLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function toMonth(date: Date): string {
  return toLocalDate(date).slice(0, 7);
}

/** First day of the month that is `offset` months away from `date` (0 = same month). */
export function startOfMonth(date: Date, offset = 0): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

/** First day of `month` and first day of the following month, for a half-open date range. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, monthIndex] = month.split('-').map(Number) as [number, number];
  const next = toMonth(new Date(year, monthIndex, 1));
  return { from: `${month}-01`, to: `${next}-01` };
}
