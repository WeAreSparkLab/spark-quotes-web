// utils/schedule.ts
//
// Shared notification schedule, and the rule for how often the displayed
// quote changes.
//
// The app used to cache one quote per calendar day, so someone receiving
// several notifications a day got several nudges all pointing at the same
// quote. The quote now changes once per notification slot the user has
// chosen: one a day if they take the default, five if they asked for five.

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface TimeSlot {
  label: string;
  time: string; // "HH:MM"
  hour: number;
}

export const TIME_SLOTS: TimeSlot[] = [
  { label: "Morning", time: "09:00", hour: 9 },
  { label: "Midday", time: "12:00", hour: 12 },
  { label: "Afternoon", time: "15:00", hour: 15 },
  { label: "Evening", time: "18:00", hour: 18 },
  { label: "Night", time: "21:00", hour: 21 },
];

export const DEFAULT_SLOT_LABELS = ["Morning"];

/** Local calendar day as YYYY-MM-DD (not UTC — the day must roll over locally). */
function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * The hours at which this user's quote should change.
 * Falls back to a single morning slot, which is the default schedule.
 */
export async function getSlotHours(): Promise<number[]> {
  try {
    const stored = await AsyncStorage.getItem("selectedTimes");
    const labels: string[] = stored ? JSON.parse(stored) : DEFAULT_SLOT_LABELS;

    const hours = TIME_SLOTS.filter((s) => labels.includes(s.label)).map((s) => s.hour);
    return hours.length > 0 ? hours.sort((a, b) => a - b) : [9];
  } catch {
    return [9];
  }
}

/**
 * Identifier for the period we are currently in, e.g. "2026-08-20-12".
 *
 * Used as the cache key for the displayed quote, so it stays put between
 * notifications and changes as each one lands. Before the first slot of the
 * day we belong to the last slot of *yesterday* — otherwise the quote would
 * change silently at midnight, which is not a moment anyone was notified.
 */
export function slotKey(slotHours: number[], now: Date = new Date()): string {
  const hours = slotHours.length > 0 ? [...slotHours].sort((a, b) => a - b) : [9];
  const currentHour = now.getHours();

  const passed = hours.filter((h) => h <= currentHour);

  if (passed.length > 0) {
    return `${localDay(now)}-${passed[passed.length - 1]}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return `${localDay(yesterday)}-${hours[hours.length - 1]}`;
}

/** Convenience: the current slot key for this user's own schedule. */
export async function currentSlotKey(now: Date = new Date()): Promise<string> {
  return slotKey(await getSlotHours(), now);
}
