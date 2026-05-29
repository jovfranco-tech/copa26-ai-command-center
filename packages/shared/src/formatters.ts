/** Pure formatting helpers shared by the UI and the analyst. */

/** "Jun 19" */
export function fmtDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "Fri, Jun 19" */
export function fmtFull(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Signed goal difference, e.g. "+3" / "0" / "-2". */
export function fmtGD(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd);
}

/** Compact integers with thousands separators (used for capacities). */
export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US');
}

/** Score or fallback dash when a match has not been played. */
export function fmtScore(home: number | null, away: number | null): string {
  if (home == null || away == null) return '–';
  return `${home}–${away}`;
}

/** Average to 2 decimals, guarding divide-by-zero. */
export function avg(total: number, count: number): string {
  if (!count) return '0.00';
  return (total / count).toFixed(2);
}
