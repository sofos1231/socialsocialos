// backend/src/modules/stats/time-windows.ts
// Step 5.5: Week range calculator for Asia/Jerusalem timezone
// Step 5.6: FIXED to ISO week (Monday 00:00:00 Asia/Jerusalem, ends Sunday 23:59:59.999)

import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfWeek, endOfWeek } from 'date-fns';

const JERU_TZ = 'Asia/Jerusalem';

export interface WeekRange {
  start: Date;
  end: Date;
  tz: 'Asia/Jerusalem';
  startISO: string;
  endISO: string;
}

/**
 * Week range DTO (for frontend consumption)
 */
export interface WeekRangeDTO {
  startISO: string;
  endISO: string;
  tz: 'Asia/Jerusalem';
}

/**
 * Get current week range (Monday 00:00 to Sunday 23:59:59.999 in Asia/Jerusalem, ISO 8601)
 */
export function getCurrentWeekRange(): WeekRange {
  const nowUtc = new Date();
  const jeruNow = toZonedTime(nowUtc, JERU_TZ);
  
  // Week starts Monday (weekStartsOn: 1) - ISO 8601 standard
  const weekStart = startOfWeek(jeruNow, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(jeruNow, { weekStartsOn: 1 });
  
  // Convert back to UTC Date objects for Prisma queries
  const startUtc = fromZonedTime(weekStart, JERU_TZ);
  const endUtc = fromZonedTime(weekEnd, JERU_TZ);
  
  return {
    start: startUtc,
    end: endUtc,
    tz: JERU_TZ,
    startISO: startUtc.toISOString(),
    endISO: endUtc.toISOString(),
  };
}

/**
 * Get previous week range
 */
export function getPreviousWeekRange(): WeekRange {
  const currentRange = getCurrentWeekRange();
  // Subtract 7 days to get previous week start
  const prevWeekStartUtc = new Date(currentRange.start.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Calculate previous week end (Sunday 23:59:59.999, ISO 8601)
  const jeruPrevStart = toZonedTime(prevWeekStartUtc, JERU_TZ);
  const prevWeekEnd = endOfWeek(jeruPrevStart, { weekStartsOn: 1 });
  const prevWeekEndUtc = fromZonedTime(prevWeekEnd, JERU_TZ);
  
  return {
    start: prevWeekStartUtc,
    end: prevWeekEndUtc,
    tz: JERU_TZ,
    startISO: prevWeekStartUtc.toISOString(),
    endISO: prevWeekEndUtc.toISOString(),
  };
}

/**
 * Get week range for a specific date
 */
export function getWeekRangeForDate(date: Date): WeekRange {
  const jeruDate = toZonedTime(date, JERU_TZ);
  const weekStart = startOfWeek(jeruDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(jeruDate, { weekStartsOn: 1 });
  
  const startUtc = fromZonedTime(weekStart, JERU_TZ);
  const endUtc = fromZonedTime(weekEnd, JERU_TZ);
  
  return {
    start: startUtc,
    end: endUtc,
    tz: JERU_TZ,
    startISO: startUtc.toISOString(),
    endISO: endUtc.toISOString(),
  };
}

/**
 * Get week ranges for the last N weeks (including current week)
 * Step 5.6: Helper for trending traits heatmap
 */
export function getLastNWeeks(n: number): WeekRange[] {
  const weeks: WeekRange[] = [];
  const currentWeek = getCurrentWeekRange();
  weeks.push(currentWeek);
  
  for (let i = 1; i < n; i++) {
    const prevWeekStart = new Date(currentWeek.start.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    weeks.push(getWeekRangeForDate(prevWeekStart));
  }
  
  // Reverse to get oldest first
  return weeks.reverse();
}

