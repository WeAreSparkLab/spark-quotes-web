// app/favorites.tsx
//
// Your saved quotes, two ways:
//   • Garden — the Garden of Saved Sparks: each saved quote is a glowing
//     flower in a dusk meadow, planted in the order you saved it. Tap one to
//     read it. (Web only, and only where 3D can run.)
//   • List — every saved quote as a card. Always available; it is the
//     accessible view and the fallback.
// No counts to beat, no streaks, nothing that wilts.

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "../components/common/Ionicons";
import PageHeader from "../components/common/PageHeader";
import SparkGarden from "../components/sparks/SparkGarden";
import { C, F, S } from "../styles/theme";
import { useSupabase } from "./_layout";
import { removeFavoriteQuote } from "../services/supabaseFavorites";
import { shareQuote } from "../utils/shareQuote";
import { supabase } from "../supabaseClient";
import { WORLDS, worldForCategory } from "../worlds/config";
import { play } from "../utils/sound";

interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
}

type View_ = "garden" | "list";
const VIEW_KEY = "sparkFavouritesView";
const canGarden = Platform.OS === "web";

export default function FavoritesScreen() {
  const router = useRouter();
  const { userId } = useSupabase();
  const { width, height } = useWindowDimensions();
  const [favoriteQuotes, setFavoriteQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [view, setView] = useState<View_>(canGarden ? "garden" : "list");
  const [no3D, setNo3D] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  // Bring the quote card into view whenever a flower is chosen.
  useEffect(() => {
    if (selectedId) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, [selectedId]);

  useEffect(() => {
    AsyncStorage.getItem(VIEW_KEY).then((v) => { if (v === "list" || (v === "garden" && canGarden)) setView(v); }).catch(() => {});
  }, []);
  const chooseView = (v: View_) => {
    setView(v);
    AsyncStorage.setItem(VIEW_KEY, v).catch(() => {});
  };

  // Development only (stripped from production builds): /favorites?demo=N
  // fills the garden with bundled quotes, so it can be looked at signed out.
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const demoCount = __DEV__ && demo ? Math.max(1, Math.min(200, Number(demo) || 24)) : 0;

  const fetchFavoriteQuotes = useCallback(async () => {
    if (demoCount) {
      const { quotes } = await import("../data/data");
      // take quotes round-robin across topics, so every world's colour shows
      const byCat = new Map<string, typeof quotes>();
      for (const q of quotes) byCat.set(q.category, [...(byCat.get(q.category) ?? []), q]);
      const lists = [...byCat.values()], picked: typeof quotes = [];
      for (let i = 0; picked.length < demoCount && i < 50; i++) for (const l of lists) if (l[i] && picked.length < demoCount) picked.push(l[i]);
      setFavoriteQuotes(picked.map((q) => ({ ...q, category: q.category === "Health & Wellbeing" ? "Health" : q.category })));
      setError(null);
      setIsLoading(false);
      return;
    }
    if (!userId) {
      setError("Please log in to view your favorite quotes.");
      setFavoriteQuotes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // In the order they were saved — the garden grows outward with time.
      const { data: favs, error: favError } = await supabase
        .schema("quotes")
        .from("favorite_quotes")
        .select("quote_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (favError) throw new Error(favError.message);

      const ids = (favs ?? []).map((f) => f.quote_id as string);
      if (ids.length === 0) {
        setFavoriteQuotes([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .schema("quotes")
        .from("approved_quotes")
        .select("id, text, author, category")
        .in("id", ids);
      if (fetchError) throw new Error(fetchError.message);

      const byId = new Map((data ?? []).map((q) => [q.id, q as Quote]));
      setFavoriteQuotes(ids.map((id) => byId.get(id)).filter(Boolean) as Quote[]);
    } catch (e: any) {
      console.error("Error fetching favorite quotes:", e.message);
      setError("Couldn't load your saved quotes. Please try again.");
      setFavoriteQuotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, demoCount]);

  useFocusEffect(useCallback(() => { fetchFavoriteQuotes(); }, [fetchFavoriteQuotes]));

  // On the web, Share opens the studio; native keeps the plain text share.
  const handleShare = async (quote: Quote) => {
    if (Platform.OS === "web") { router.push(`/studio?q=${encodeURIComponent(quote.id)}` as any); return; }
    if (sharingId) return;
    setSharingId(quote.id);
    try { await shareQuote(quote); } finally { setSharingId(null); }
  };

  const handleRemove = async (quote: Quote) => {
    if (!userId || removingId) return;
    setRemovingId(quote.id);
    setNotice(null);
    // Optimistic: it disappears straight away and comes back if the delete fails.
    const previous = favoriteQuotes;
    const index = previous.findIndex((q) => q.id === quote.id);
    const next = previous.filter((q) => q.id !== quote.id);
    setFavoriteQuotes(next);
    if (selectedId === quote.id) setSelectedId(next.length ? next[Math.min(index, next.length - 1)].id : null);

    const ok = await removeFavoriteQuote(userId, quote.id);
    if (!ok) {
      setFavoriteQuotes(previous);
      setNotice("Couldn't remove that one. Please try again.");
    }
    setRemovingId(null);
  };

  const count = favoriteQuotes.length;
  const showGarden = canGarden && view === "garden" && !no3D && count > 0 && !isLoading && !error && (!!userId || !!demoCount);
  const selected = favoriteQuotes.find((q) => q.id === selectedId) ?? null;
  const sparks = useMemo(() => favoriteQuotes.map((q) => ({ id: q.id, category: q.category })), [favoriteQuotes]);

  const step = useCallback((dir: 1 | -1) => {
    if (!favoriteQuotes.length) return;
    const i = favoriteQuotes.findIndex((q) => q.id === selectedId);
    const n = i < 0 ? (dir === 1 ? 0 : favoriteQuotes.length - 1) : (i + dir + favoriteQuotes.length) % favoriteQuotes.length;
    setSelectedId(favoriteQuotes[n].id);
  }, [favoriteQuotes, selectedId]);

  // Keyboard: arrows walk between flowers, Escape steps back out.
  useEffect(() => {
    if (!showGarden || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      else if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showGarden, step]);

  const anon = (a: string) => /^(anonymous|unknown)$/i.test(a.trim());

  const Actions = ({ item }: { item: Quote }) => (
    <View style={styles.actions}>
      <Pressable
        onPress={() => handleShare(item)}
        disabled={sharingId === item.id}
        accessibilityRole="button"
        accessibilityLabel="Share this quote"
        style={({ pressed }) => [S.btn, S.btnPrimary, styles.smallBtn, { opacity: sharingId === item.id ? 0.6 : pressed ? 0.8 : 1 }]}
      >
        <Ionicons name="share-social-outline" color={C.onAccent} size={17} />
        <Text style={S.btnPrimaryText}>{sharingId === item.id ? "Preparing…" : "Share"}</Text>
      </Pressable>
      <Pressable
        onPress={() => handleRemove(item)}
        disabled={removingId === item.id}
        accessibilityRole="button"
        accessibilityLabel="Remove from favourites"
        style={({ pressed }) => [S.btn, S.btnGhost, styles.smallBtn, { opacity: removingId === item.id ? 0.6 : pressed ? 0.8 : 1 }]}
      >
        <Ionicons name="heart-dislike-outline" color={C.ink} size={17} />
        <Text style={S.btnGhostText}>Remove</Text>
      </Pressable>
    </View>
  );

  const renderQuoteItem = ({ item }: { item: Quote }) => (
    <View style={S.column}>
      <View style={[S.card, styles.card]}>
        <Text style={S.eyebrow}>{item.category}</Text>
        <Text style={styles.quote}>{"“"}{item.text}{"”"}</Text>
        <Text style={styles.author}>{anon(item.author) ? "Author unknown" : item.author}</Text>
        <Actions item={item} />
      </View>
    </View>
  );

  const Toggle = () =>
    canGarden && !no3D && count > 0 ? (
      <View style={[S.column, styles.toggleRow]}>
        <View style={styles.toggle} role="radiogroup" aria-label="How to show your saved quotes">
          {(["garden", "list"] as View_[]).map((v) => {
            const on = view === v;
            return (
              <Pressable key={v} role="radio" aria-checked={on} onPress={() => chooseView(v)}
                style={({ pressed }) => [styles.toggleBtn, on && styles.toggleOn, { opacity: pressed ? 0.75 : 1 }]}>
                <Ionicons name={v === "garden" ? "flower-outline" : "list"} size={16} color={on ? C.onAccent : C.ink} />
                <Text style={[styles.toggleText, on && { color: C.onAccent }]}>{v === "garden" ? "Garden" : "List"}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    ) : null;

  const header = (
    <>
      <PageHeader
        title={showGarden ? "Your garden of sparks" : "Your favourites"}
        subtitle={
          !userId || isLoading || error || count === 0
            ? undefined
            : showGarden
              ? "Every quote you save grows here. Tap a flower to read it."
              : `${count} saved ${count === 1 ? "quote" : "quotes"}`
        }
      />
      <Toggle />
      {notice ? <Text accessibilityRole="alert" style={[S.column, S.body, styles.notice]}>{notice}</Text> : null}
    </>
  );

  if (showGarden) {
    const wide = width >= 900;
    const gardenH = Math.round(Math.min(height * (wide ? 0.56 : 0.5), 560));
    const world = selected ? WORLDS[worldForCategory(selected.category)] : null;
    return (
      <SafeAreaView style={S.page}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 24 }}>
          {header}
          <View style={[styles.gardenWrap, { maxWidth: wide ? 1040 : 640 }]}>
            <View style={[styles.gardenFrame, { height: gardenH }]}>
              <SparkGarden sparks={sparks} selectedId={selectedId} onSelect={(id) => { if (id) play("open"); setSelectedId(id); }} onUnavailable={() => setNo3D(true)} />
            </View>

            <View style={styles.reader} accessibilityLiveRegion="polite" aria-live="polite">
              {selected ? (
                <View style={[S.card, styles.readerCard]}>
                  <View style={styles.readerTop}>
                    <Text style={S.eyebrow}>{world?.name} · {selected.category}</Text>
                    <View style={styles.stepper}>
                      <Pressable onPress={() => step(-1)} accessibilityRole="button" accessibilityLabel="Previous saved quote" hitSlop={8} style={styles.stepBtn}>
                        <Ionicons name="chevron-back" size={18} color={C.ink} />
                      </Pressable>
                      <Text style={styles.stepText}>{favoriteQuotes.indexOf(selected) + 1} / {count}</Text>
                      <Pressable onPress={() => step(1)} accessibilityRole="button" accessibilityLabel="Next saved quote" hitSlop={8} style={styles.stepBtn}>
                        <Ionicons name="chevron-forward" size={18} color={C.ink} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.quote}>{"“"}{selected.text}{"”"}</Text>
                  <Text style={styles.author}>{anon(selected.author) ? "Author unknown" : selected.author}</Text>
                  <Actions item={selected} />
                </View>
              ) : (
                <View style={styles.hintRow}>
                  <Text style={[S.body, styles.hint]}>
                    {count === 1 ? "One flower so far." : `${count} flowers.`} Tap one, or use the arrow keys.
                  </Text>
                  <Pressable onPress={() => step(1)} accessibilityRole="button" hitSlop={8}>
                    <Text style={S.link}>Start with the first</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.page}>
      <FlatList
        data={isLoading || error ? [] : favoriteQuotes}
        renderItem={renderQuoteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={S.column}>
            {isLoading ? (
              <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 40 }} />
            ) : !userId ? (
              <View style={[S.card, styles.empty]}>
                <Text style={S.h2}>Keep the ones that land</Text>
                <Text style={[S.body, styles.emptyBody]}>Sign in to save quotes. Each one grows into a flower in your own garden of sparks.</Text>
                <Pressable onPress={() => router.push("/auth")} accessibilityRole="button" style={({ pressed }) => [S.btn, S.btnPrimary, { opacity: pressed ? 0.8 : 1 }]}>
                  <Text style={S.btnPrimaryText}>Sign in or create an account</Text>
                </Pressable>
              </View>
            ) : error ? (
              <Text accessibilityRole="alert" style={[S.body, { color: C.danger }]}>{error}</Text>
            ) : (
              <View style={[S.card, styles.empty]}>
                <Text style={S.h2}>Your garden is waiting</Text>
                <Text style={[S.body, styles.emptyBody]}>Tap Save on any quote and the first flower will grow here.</Text>
                <Pressable onPress={() => router.replace("/")} accessibilityRole="button" style={({ pressed }) => [S.btn, S.btnGhost, { opacity: pressed ? 0.8 : 1 }]}>
                  <Text style={S.btnGhostText}>Find a quote</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 22 },
  quote: { fontFamily: F.serif, fontSize: 21, lineHeight: 29, color: C.ink, marginTop: 10 },
  author: { fontFamily: F.sans, fontSize: 12.5, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "600", color: C.inkSoft, marginTop: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  smallBtn: { minHeight: 40, paddingHorizontal: 16 },
  empty: { alignItems: "flex-start", gap: 4, paddingVertical: 24 },
  emptyBody: { marginBottom: 14 },
  notice: { color: C.danger, marginBottom: 8 },
  toggleRow: { marginBottom: 14 },
  toggle: { flexDirection: "row", alignSelf: "flex-start", backgroundColor: C.sheetSunk, borderRadius: 999, padding: 4, gap: 4 },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 999 },
  toggleOn: { backgroundColor: C.ink },
  toggleText: { fontFamily: F.sans, fontSize: 14, fontWeight: "600", color: C.ink },
  gardenWrap: { width: "100%", alignSelf: "center", paddingHorizontal: 18 },
  gardenFrame: { width: "100%", borderRadius: 22, overflow: "hidden", backgroundColor: "#2A2747" },
  reader: { width: "100%", maxWidth: 640, alignSelf: "center", marginTop: 14, paddingBottom: 24 },
  readerCard: { paddingVertical: 20 },
  readerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: C.line },
  stepText: { fontFamily: F.sans, fontSize: 12.5, color: C.inkSoft, minWidth: 44, textAlign: "center" },
  hintRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  hint: { flexShrink: 1 },
});
