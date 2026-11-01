/** Dates are local calendar dates, "YYYY-MM-DD"; months are "YYYY-MM". */

export function currentMonth(today: Date = new Date()): string {
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${today.getFullYear()}-${month}`;
}

/** "2026-11-02" → "02/11/2026" (vi-VN day/month/year order). */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
