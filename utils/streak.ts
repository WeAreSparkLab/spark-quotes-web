// utils/streak.ts
//
// Tracks consecutive days the app has been opened.
//
// Local-only on purpose: it works logged out, needs no round trip, and a
// streak is a personal nudge rather than something worth a database write.
// Dates are compared in the user's own timezone — using UTC would roll the
// day over mid-evening for anyone west of Greenwich.

import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_SEEN_KEY = "streakLastSeen";
const COUNT_KEY = "streakCount";
const BEST_KEY = "streakBest";

export interface Streak {
  /** Consecutive days including today. */
  current: number;
  /** Longest run ever recorded. */
  best: number;
  /** True the first time today's visit is counted, for a one-off celebration. */
  isNewDay: boolean;
}

/** Local calendar day as YYYY-MM-DD (not UTC — see note above). */
function localDay(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(fromDay: string, toDay: string): number {
  const [fy, fm, fd] = fromDay.split("-").map(Number);
  const [ty, tm, td] = toDay.split("-").map(Number);
  // Compare at UTC midnight so DST changes can't produce 23- or 25-hour days
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86400000);
}

/**
 * Record a visit for today and return the resulting streak.
 * Safe to call on every app open — it only changes state once per day.
 */
export async function recordVisit(): Promise<Streak> {
  const today = localDay();

  try {
    const [lastSeen, storedCount, storedBest] = await Promise.all([
      AsyncStorage.getItem(LAST_SEEN_KEY),
      AsyncStorage.getItem(COUNT_KEY),
      AsyncStorage.getItem(BEST_KEY),
    ]);

    const previousCount = Number(storedCount) || 0;
    let best = Number(storedBest) || 0;

    // Already counted today — report without changing anything
    if (lastSeen === today) {
      return { current: previousCount || 1, best: Math.max(best, previousCount, 1), isNewDay: false };
    }

    let current: number;
    if (!lastSeen) {
      current = 1; // first ever visit
    } else {
      const gap = daysBetween(lastSeen, today);
      // gap of 1 continues the run; anything larger (or a clock moved
      // backwards) starts again
      current = gap === 1 ? previousCount + 1 : 1;
    }

    best = Math.max(best, current);

    await Promise.all([
      AsyncStorage.setItem(LAST_SEEN_KEY, today),
      AsyncStorage.setItem(COUNT_KEY, String(current)),
      AsyncStorage.setItem(BEST_KEY, String(best)),
    ]);

    return { current, best, isNewDay: true };
  } catch {
    // Storage unavailable (private mode) — never break the screen over this
    return { current: 1, best: 1, isNewDay: false };
  }
}

/** Read the streak without recording a visit. */
export async function readStreak(): Promise<Streak> {
  try {
    const [lastSeen, storedCount, storedBest] = await Promise.all([
      AsyncStorage.getItem(LAST_SEEN_KEY),
      AsyncStorage.getItem(COUNT_KEY),
      AsyncStorage.getItem(BEST_KEY),
    ]);

    const count = Number(storedCount) || 0;
    const best = Number(storedBest) || 0;
    if (!lastSeen) return { current: 0, best, isNewDay: false };

    // A streak that was not continued yesterday or today is already broken
    const gap = daysBetween(lastSeen, localDay());
    return { current: gap <= 1 ? count : 0, best, isNewDay: false };
  } catch {
    return { current: 0, best: 0, isNewDay: false };
  }
}

/** Wording for the streak badge. */
export function streakLabel(streak: Streak): string {
  if (streak.current <= 1) return "Day 1 — welcome back";
  if (streak.current < 7) return `${streak.current} days in a row`;
  if (streak.current % 7 === 0) {
    const weeks = streak.current / 7;
    return `${streak.current} days — ${weeks} week${weeks === 1 ? "" : "s"} straight`;
  }
  return `${streak.current} days in a row`;
}
