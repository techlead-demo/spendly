/** Dates are local calendar dates, "YYYY-MM-DD"; months are "YYYY-MM". */

export function currentMonth(today: Date = new Date()): string {
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${today.getFullYear()}-${month}`;
}

/** Today's local date, "YYYY-MM-DD". */
export function today(now: Date = new Date()): string {
  const day = String(now.getDate()).padStart(2, '0');
  return `${currentMonth(now)}-${day}`;
}

/** True for an existing calendar date in "YYYY-MM-DD" form. */
export function isDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** "2026-11-02" →"02/11/2026" (vi-VN day/month/year order). */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
