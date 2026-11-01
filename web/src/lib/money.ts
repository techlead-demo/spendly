const vndFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

/** Formats an integer amount of VND minor units for display, e.g. 6500000 → "6.500.000 ₫". */
export function formatMoney(amountMinor: number): string {
  return vndFormatter.format(amountMinor);
}
