const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonth(value: unknown): value is string {
  return typeof value === 'string' && MONTH_RE.test(value);
}

/** Inclusive first day and exclusive first day of the next month, as UTC dates (calendar dates, no time zone). */
export function monthRange(month: string): { start: Date; end: Date } {
  const m = MONTH_RE.exec(month);
  if (!m) throw new Error(`invalid month ${month}`);
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  return { start: new Date(Date.UTC(year, monthIndex, 1)), end: new Date(Date.UTC(year, monthIndex + 1, 1)) };
}

export function currentUtcMonth(): string {
  return new Date().toISOString().slice(0, 7);
}