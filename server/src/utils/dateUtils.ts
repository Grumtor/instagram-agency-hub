/**
 * Returns a Date representing midnight UTC n calendar days before now.
 * Uses calendar-day subtraction (setDate) to correctly handle DST boundaries.
 */
export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
