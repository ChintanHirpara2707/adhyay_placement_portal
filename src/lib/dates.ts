/** Local-calendar helpers shared by the date pickers. Values are plain "YYYY-MM-DD" / "HH:MM" strings. */

const pad = (n: number) => String(n).padStart(2, '0');

export const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Parses "YYYY-MM-DD" as a local date (midday, so DST never shifts the day). Null when invalid. */
export function fromYMD(value: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d, 12, 0, 0);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

export const todayYMD = () => toYMD(new Date());

/** "21 Dec 2026" */
export function formatLongDate(value: string | null | undefined): string {
  const d = fromYMD(value);
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

export const toHM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function fromHM(value: string | null | undefined): Date | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value ?? '');
  if (!m) return null;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

/** "10:30 AM" */
export function formatTime(value: string | null | undefined): string {
  const d = fromHM(value);
  return d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
}
