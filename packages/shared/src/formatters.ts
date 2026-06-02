/** Pure formatting helpers shared by the UI and the analyst. */

const DATE_LOCALE = 'es-MX';

function isoDate(iso: string): Date | null {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "19 jun" */
export function fmtDay(iso: string): string {
  const d = isoDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString(DATE_LOCALE, { month: 'short', day: 'numeric' }).replace(/\./g, '');
}

/** "vie, 19 jun" */
export function fmtFull(iso: string): string {
  const d = isoDate(iso);
  if (!d) return iso;
  return d
    .toLocaleDateString(DATE_LOCALE, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    .replace(/\./g, '');
}

/** "viernes, 19 de junio" */
export function fmtLongDate(iso: string): string {
  const d = isoDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString(DATE_LOCALE, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).replace(/\./g, '');
}

/** Locale-aware time, e.g. "09:15". */
export function fmtTime(date: Date | string | number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(DATE_LOCALE, { hour: '2-digit', minute: '2-digit' });
}

/** Locale-aware date/time for operational logs. */
export function fmtDateTime(date: Date | string | number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(DATE_LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(/\./g, '');
}

/** Signed goal difference, e.g. "+3" / "0" / "-2". */
export function fmtGD(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd);
}

/** Compact integers with thousands separators (used for capacities). */
export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString(DATE_LOCALE);
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
