const shareFormatter = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * BR-15: `partMinor` as a percentage of `totalMinor`, rounded half up to one decimal, e.g. "95,5%".
 * Rounds on integers (BigInt) so half-up cases such as 1/2000 = 0,05% are exact.
 */
export function formatShare(partMinor: number, totalMinor: number): string {
  if (totalMinor <= 0) {
    return shareFormatter.format(0) + '%';
  }
  const part = BigInt(partMinor);
  const total = BigInt(totalMinor);
  // Tenths of a percent: part * 1000 / total, rounded half up.
  const tenths = (part * 2000n + total) / (2n * total);
  return shareFormatter.format(Number(tenths) / 10) + '%';
}
