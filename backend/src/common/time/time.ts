import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { addDays, addHours, differenceInCalendarDays, startOfWeek } from 'date-fns';

const JERU_TZ = 'Asia/Jerusalem';

export function nowJeru(): Date {
  const nowUtc = new Date();
  return toZonedTime(nowUtc, JERU_TZ);
}

export function toJeruISO(input: Date | string | number): string {
  const d = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  return formatInTimeZone(d, JERU_TZ, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
}

export function jeruYMD(input: Date | string | number): { y: number; m: number; d: number } {
  const d = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  const jeru = toZonedTime(d, JERU_TZ);
  return { y: jeru.getFullYear(), m: jeru.getMonth() + 1, d: jeru.getDate() };
}

// App uses Monday as week start by default; adjust to Sunday by passing weekStartsOn: 0
export function weekStartJeru(input: Date | string | number, weekStartsOn: 0 | 1 = 1): Date {
  const d = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  const jeru = toZonedTime(d, JERU_TZ);
  const start = startOfWeek(jeru, { weekStartsOn });
  // Return a UTC instant corresponding to Jeru week start at 00:00
  return fromZonedTime(start, JERU_TZ);
}

export function isSameJeruDay(a: Date, b: Date): boolean {
  const da = jeruYMD(a);
  const db = jeruYMD(b);
  return da.y === db.y && da.m === db.m && da.d === db.d;
}

export function isRollover(prevLastActive: Date | null, now: Date): boolean {
  if (!prevLastActive) return true;
  const days = differenceInCalendarDays(
    toZonedTime(now, JERU_TZ),
    toZonedTime(prevLastActive, JERU_TZ)
  );
  return days >= 1;
}

export function isNextJeruDay(prev: Date, now: Date): boolean {
  const da = jeruYMD(prev);
  const next = addDays(new Date(Date.UTC(da.y, da.m - 1, da.d)), 1);
  const dn = jeruYMD(now);
  const dnext = jeruYMD(next);
  return dn.y === dnext.y && dn.m === dnext.m && dn.d === dnext.d;
}

export const Time = {
  nowJeru,
  toJeruISO,
  jeruYMD,
  weekStartJeru,
  isSameJeruDay,
  isRollover,
  isNextJeruDay,
  addJeruDays: (d: Date, days: number) => addDays(d, days),
  addJeruHours: (d: Date, hours: number) => addHours(d, hours),
  TZ: JERU_TZ,
};


