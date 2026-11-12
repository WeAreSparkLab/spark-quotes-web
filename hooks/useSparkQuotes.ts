// hooks/useSparkQuotes.ts
//
// Quote state for the Living Worlds home screen.
//
// The quote of the day behaves exactly as it does on the classic screen: the
// same AsyncStorage keys, the same per-notification-slot cache, the same
// topic filter, the same Supabase table. Choosing a mood or wandering into
// another world only changes what is *on screen*; it never overwrites the
// saved quote of the day, and "Today's quote" always brings it back.

import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../supabaseClient";
import { allCategories, legacyCategoryMap, quotes as bundledQuotes, type Quote } from "../data/data";
import { currentSlotKey } from "../utils/schedule";
import { MOODS, WORLDS, worldForCategory, type MoodId, type WorldId } from "../worlds/config";

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

/** Offline fallback: the quote set that ships in the bundle. */
function bundled(categories: string[] | null): Quote[] {
  if (!categories) return bundledQuotes;
  // The bundle still uses the old name for one topic.
  const list = bundledQuotes
    .map((q) => ({ ...q, category: legacyCategoryMap[q.category] ?? q.category }))
    .filter((q) => categories.includes(q.category));
  return list.length > 0 ? list : bundledQuotes;
}

async function userTopics(): Promise<string[]> {
  const stored = await AsyncStorage.getItem("selectedTopics");
  const selected: string[] = stored ? JSON.parse(stored) : allCategories;
  const normalised = selected.map((t) => legacyCategoryMap[t] ?? t).filter((t) => allCategories.includes(t));
  return normalised.length > 0 ? normalised : allCategories;
}

export interface SparkQuotes {
  quote: Quote | null;
  world: WorldId;
  mood: MoodId | null;
  loading: boolean;
  busy: boolean;
  /** True while the quote on screen is the saved quote of the day. */
  isDaily: boolean;
  another(): Promise<void>;
  chooseMood(mood: MoodId): Promise<void>;
  visitWorld(world: WorldId): Promise<void>;
  backToDaily(): void;
  refreshDaily(): Promise<void>;
}

export function useSparkQuotes(): SparkQuotes {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [daily, setDaily] = useState<Quote | null>(null);
  const [world, setWorld] = useState<WorldId>("garden");
  const [mood, setMood] = useState<MoodId | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // What "Another quote" draws from: the user's topics, a mood, or a world.
  const scopeRef = useRef<string[] | null | "topics">("topics");
  const pools = useRef(new Map<string, Quote[]>());
  const quoteRef = useRef<Quote | null>(null);
  quoteRef.current = quote;
  const dailyRef = useRef<Quote | null>(null);

  const fetchPool = useCallback(async (categories: string[] | null): Promise<Quote[]> => {
    const key = categories ? JSON.stringify([...categories].sort()) : "*";
    const hit = pools.current.get(key);
    if (hit && hit.length > 0) return hit;

    let q = supabase.schema("quotes").from("approved_quotes").select("id, text, author, category");
    if (categories) q = q.in("category", categories);
    const { data, error } = await q;
    if (!error && data && data.length > 0) {
      pools.current.set(key, data as Quote[]);
      return data as Quote[];
    }
    return [];
  }, []);

  const scopeCategories = useCallback(async (): Promise<string[] | null> => {
    return scopeRef.current === "topics" ? userTopics() : scopeRef.current;
  }, []);

  /** A quote from the given categories that isn't the one already showing. */
  const draw = useCallback(
    async (categories: string[] | null): Promise<Quote> => {
      let pool: Quote[] = [];
      try {
        pool = await fetchPool(categories);
      } catch {
        /* offline — fall through to the bundle */
      }
      if (pool.length === 0) pool = bundled(categories);
      const current = quoteRef.current;
      const candidates = current && pool.length > 1 ? pool.filter((p) => p.id !== current.id) : pool;
      return pick(candidates);
    },
    [fetchPool]
  );

  const refreshDaily = useCallback(async () => {
    const slot = await currentSlotKey();
    let next: Quote | null = null;

    try {
      const stored = await AsyncStorage.getItem("quoteOfTheDay");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.date === slot && parsed.quote) next = parsed.quote as Quote;
      }
      if (!next) {
        const pool = await fetchPool(await userTopics());
        next = pool.length > 0 ? pick(pool) : pick(bundledQuotes);
        await AsyncStorage.setItem("quoteOfTheDay", JSON.stringify({ quote: next, date: slot }));
      }
    } catch {
      next = pick(bundledQuotes);
      try {
        await AsyncStorage.setItem("quoteOfTheDay", JSON.stringify({ quote: next, date: slot }));
      } catch {}
    }

    const prev = dailyRef.current;
    dailyRef.current = next;
    setDaily(next);
    // Only move the screen if it was showing the daily quote (or nothing).
    if (!quoteRef.current || quoteRef.current.id === prev?.id) {
      setQuote(next);
      setWorld(worldForCategory(next.category));
    }
    setLoading(false);
  }, [fetchPool]);

  useEffect(() => {
    refreshDaily();
  }, [refreshDaily]);

  const another = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await draw(await scopeCategories());
      setQuote(next);
      // Outside a chosen mood or world, the quote decides where we are.
      if (scopeRef.current === "topics" || scopeRef.current === null) setWorld(worldForCategory(next.category));
    } finally {
      setBusy(false);
    }
  }, [busy, draw, scopeCategories]);

  const chooseMood = useCallback(
    async (id: MoodId) => {
      const cfg = MOODS.find((m) => m.id === id);
      if (!cfg) return;
      setBusy(true);
      setMood(id);
      scopeRef.current = cfg.categories;
      if (cfg.world) setWorld(cfg.world); // start travelling straight away
      try {
        const next = await draw(cfg.categories);
        setQuote(next);
        if (!cfg.world) setWorld(worldForCategory(next.category));
      } finally {
        setBusy(false);
      }
    },
    [draw]
  );

  const visitWorld = useCallback(
    async (id: WorldId) => {
      setBusy(true);
      setMood(null);
      scopeRef.current = WORLDS[id].categories;
      setWorld(id);
      try {
        const current = quoteRef.current;
        // If the quote on screen already belongs here, leave it be.
        if (!current || !WORLDS[id].categories.includes(current.category)) {
          setQuote(await draw(WORLDS[id].categories));
        }
      } finally {
        setBusy(false);
      }
    },
    [draw]
  );

  const backToDaily = useCallback(() => {
    if (!daily) return;
    scopeRef.current = "topics";
    setMood(null);
    setQuote(daily);
    setWorld(worldForCategory(daily.category));
  }, [daily]);

  return {
    quote,
    world,
    mood,
    loading,
    busy,
    isDaily: !!quote && !!daily && quote.id === daily.id,
    another,
    chooseMood,
    visitWorld,
    backToDaily,
    refreshDaily,
  };
}
