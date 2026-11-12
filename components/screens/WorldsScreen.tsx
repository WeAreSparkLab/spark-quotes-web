// components/screens/WorldsScreen.tsx
//
// The Living Worlds home screen.
//
// The words come first, always: the quote is laid over a painted backdrop the
// moment it is known, and the 3D scene arrives behind it afterwards. Every
// existing action (save, share, another quote, report, topics, favourites,
// submit, settings) is still here; the worlds are a new way of presenting
// them, not a replacement.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { LINKS, openCoffee } from "../../utils/support";
import Head from "expo-router/head";
import { supabase } from "../../supabaseClient";
import { useSupabase } from "../../app/_layout";
import { Ionicons } from "../common/Ionicons";
import NotificationPrompt from "../NotificationPrompt";
import WorldBackdrop from "../worlds/WorldBackdrop";
import WorldCanvas, { type WorldCanvasHandle } from "../worlds/WorldCanvas";
import { useSparkQuotes } from "../../hooks/useSparkQuotes";
import { addFavoriteQuote, isQuoteFavorited, removeFavoriteQuote } from "../../services/supabaseFavorites";
import { shareQuote } from "../../utils/shareQuote";
import { recordVisit, streakLabel, type Streak } from "../../utils/streak";
import { getSlotHours } from "../../utils/schedule";
import { MOODS, WORLDS, WORLD_ORDER, categorySlug, type MoodId, type WorldId } from "../../worlds/config";

const SERIF = Platform.OS === "web" ? '"Newsreader", "Iowan Old Style", Georgia, serif' : undefined;
const SANS = Platform.OS === "web" ? '"Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif' : undefined;

const ASK_KEY = "sparkMoodAsk"; // { day, answered }
const SHORT_NAME: Record<WorldId, string> = { garden: "Garden", lake: "Lake", summit: "Summit", sunroom: "Sunshine Room" };

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const WEB_CSS = `
  .sq-world [role="button"]:focus-visible, .sq-world [role="radio"]:focus-visible, .sq-world a:focus-visible {
    outline: 2px solid currentColor; outline-offset: 3px; border-radius: 999px;
  }
  @media (prefers-reduced-motion: reduce) {
    .sq-world canvas, .sq-world * { transition-duration: 0ms !important; }
  }
`;

interface Ui {
  ink: string; soft: string; line: string; fill: string; fillOn: string; inkOn: string; tray: string; shadow: any; veil: any;
}
const UiContext = React.createContext<Ui | null>(null);

/** The one button shape used across the screen; colours follow the world. */
function Pill({ icon, label, onPress, a11y, on, disabled, quiet }: {
  icon?: string; label: string; onPress: () => void; a11y?: string; on?: boolean; disabled?: boolean; quiet?: boolean;
}) {
  const ui = React.useContext(UiContext)!;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.pill,
        { borderColor: quiet ? "transparent" : ui.line, backgroundColor: on ? ui.fillOn : quiet ? "transparent" : ui.fill, opacity: disabled ? 0.55 : pressed ? 0.75 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={17} color={on ? ui.inkOn : ui.ink} /> : null}
      {label ? <Text style={[styles.pillText, { color: on ? ui.inkOn : ui.ink, fontFamily: SANS }]}>{label}</Text> : null}
    </Pressable>
  );
}

export default function WorldsScreen({ topInset = 0 }: { topInset?: number }) {
  const router = useRouter();
  const { userId } = useSupabase();
  const q = useSparkQuotes();

  // /?q=<quote id> — arriving from a public quote page or a shared link
  const { q: linkedId } = useLocalSearchParams<{ q?: string }>();
  const openQuote = q.openQuote;
  useEffect(() => {
    if (typeof linkedId === "string" && /^[A-Za-z0-9-]{1,64}$/.test(linkedId)) openQuote(linkedId);
  }, [linkedId, openQuote]);
  const { width, height } = useWindowDimensions();
  const cfg = WORLDS[q.world];
  const quote = q.quote;

  const [isFavorited, setIsFavorited] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [worldsOpen, setWorldsOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);
  const [no3D, setNo3D] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [slotCount, setSlotCount] = useState(1);
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const canvasHandle = useRef<WorldCanvasHandle | null>(null);

  // ── one-off setup ────────────────────────────────────────────────────────
  useEffect(() => {
    recordVisit().then(setStreak).catch(() => {});
    getSlotHours().then((h) => setSlotCount(h.length)).catch(() => {});

    (async () => {
      try {
        const ask = await AsyncStorage.getItem(ASK_KEY);
        const parsed = ask ? JSON.parse(ask) : null;
        setAskOpen(!(parsed?.day === today()));
      } catch {
        setAskOpen(true);
      }
      // Reduced motion still gets the 3D world, drawn as a single still frame
      // (the engine handles that); there is no separate still mode.
      if (Platform.OS === "web") setReduceMotion(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
      setPrefsReady(true);
    })();
  }, []);

  // Same as the classic screen: coming back to Home re-checks the daily quote
  // (topics or notification slots may have changed in the meantime).
  const refreshDaily = q.refreshDaily;
  useFocusEffect(useCallback(() => { refreshDaily(); }, [refreshDaily]));

  // ── per-quote state ──────────────────────────────────────────────────────
  useEffect(() => {
    setHasReported(false);
    setNotice(null);
  }, [quote?.id]);

  useEffect(() => {
    let live = true;
    (async () => {
      const fav = userId && quote?.id ? await isQuoteFavorited(userId, quote.id) : false;
      if (live) setIsFavorited(fav);
    })();
    return () => { live = false; };
  }, [userId, quote?.id]);

  // the words arrive softly
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!quote?.id) return;
    if (reduceMotion) { appear.setValue(1); return; }
    appear.setValue(0);
    Animated.timing(appear, { toValue: 1, duration: 620, useNativeDriver: Platform.OS !== "web" }).start();
  }, [quote?.id, reduceMotion, appear]);

  useEffect(() => {
    if (!q.loading) setStatus(`Now in ${cfg.name}.`);
  }, [cfg.name, q.loading]);

  // ── actions ──────────────────────────────────────────────────────────────
  const closeAsk = useCallback(async () => {
    setAskOpen(false);
    try { await AsyncStorage.setItem(ASK_KEY, JSON.stringify({ day: today() })); } catch {}
  }, []);

  const onMood = useCallback((id: MoodId) => {
    closeAsk();
    q.chooseMood(id);
  }, [closeAsk, q]);

  const onFavorite = useCallback(async () => {
    if (!userId) { router.push("/auth"); return; }
    if (!quote?.id) return;
    if (isFavorited) {
      const ok = await removeFavoriteQuote(userId, quote.id);
      if (ok) { setIsFavorited(false); setStatus("Removed from favourites."); }
      else setNotice("Couldn't update your favourites. Please try again.");
    } else {
      const ok = await addFavoriteQuote(userId, quote.id);
      if (ok) {
        setIsFavorited(true);
        canvasHandle.current?.pulse();
        setStatus(`Saved to favourites. ${cfg.saveNote}`);
      } else setNotice("Couldn't update your favourites. Please try again.");
    }
  }, [userId, quote?.id, isFavorited, router, cfg.saveNote]);

  const onShare = useCallback(async () => {
    if (!quote || isSharing) return;
    setIsSharing(true);
    try { await shareQuote(quote); } finally { setIsSharing(false); }
  }, [quote, isSharing]);

  const onReport = useCallback(async () => {
    if (!quote?.id || hasReported) return;
    if (!userId) { setNotice("Please sign in to report a quote."); return; }
    const { error } = await supabase.schema("quotes").from("quote_reports").insert({
      quote_id: quote.id, reason: "inappropriate", reported_by_user_id: userId,
    });
    if (error) setNotice("Couldn't send that report. Please try again later.");
    else { setHasReported(true); setNotice("Thanks — report sent."); }
  }, [quote?.id, hasReported, userId]);

  const onCollection = useCallback(() => {
    if (!quote?.category) return;
    const path = `/quotes/${categorySlug(quote.category)}`;
    if (Platform.OS === "web") window.location.assign(path);
  }, [quote?.category]);


  // ── look ─────────────────────────────────────────────────────────────────
  const wide = width >= 900;
  const len = quote?.text.length ?? 0;
  const base = len < 60 ? 35 : len < 100 ? 30 : len < 150 ? 26 : len < 220 ? 23 : 20;
  const quoteSize = Math.round(base * (wide ? 1.32 : width < 360 ? 0.9 : 1));

  const ui = useMemo(() => {
    const dark = cfg.dark;
    return {
      ink: cfg.ink,
      soft: cfg.inkSoft,
      line: dark ? "rgba(247,243,237,0.30)" : "rgba(44,37,54,0.24)",
      fill: dark ? "rgba(22,24,50,0.34)" : "rgba(255,252,246,0.56)",
      fillOn: dark ? "rgba(247,243,237,0.94)" : "rgba(44,37,54,0.92)",
      inkOn: dark ? "#221C2B" : "#FBF6EE",
      tray: dark ? "rgba(24,26,52,0.74)" : "rgba(252,248,240,0.80)",
      shadow: Platform.OS === "web"
        ? ({ textShadow: dark ? "0 1px 22px rgba(18,20,44,0.75), 0 0 2px rgba(18,20,44,0.35)" : "0 1px 20px rgba(255,251,242,0.95), 0 0 2px rgba(255,251,242,0.7)" } as any)
        : null,
      veil: Platform.OS === "web"
        ? ({ backgroundImage: `radial-gradient(ellipse 85% 44% at 50% 34%, ${cfg.veil}${dark ? "BF" : "B0"} 0%, ${cfg.veil}${dark ? "66" : "4D"} 46%, ${cfg.veil}00 74%)` } as any)
        : null,
    };
  }, [cfg]);

  const eyebrow = q.mood
    ? `A little more ${MOODS.find((m) => m.id === q.mood)!.label.toLowerCase().replace("surprise me", "of the unexpected")}`
    : q.isDaily
      ? slotCount > 1 ? "Your quote right now" : "Your quote of the day"
      : cfg.name;

  const use3D = prefsReady && !no3D && Platform.OS === "web" && !q.loading;
  const anon = !!quote && /^(anonymous|unknown)$/i.test(quote.author.trim());

  return (
    <UiContext.Provider value={ui}>
    <View style={[styles.root, { backgroundColor: cfg.sky[1] }]} {...(Platform.OS === "web" ? ({ className: "sq-world" } as any) : {})}>
      {Platform.OS === "web" ? (
        <Head>
          <style dangerouslySetInnerHTML={{ __html: WEB_CSS }} />
        </Head>
      ) : null}

      {/* Sky colours while the 3D world loads or travels; the painted
          version only where 3D can't run, so two art styles never swap */}
      <WorldBackdrop world={q.world} painted={no3D || Platform.OS !== "web"} />
      {use3D ? <WorldCanvas world={q.world} onUnavailable={() => setNo3D(true)} handleRef={canvasHandle} /> : null}
      <View style={[StyleSheet.absoluteFill, ui.veil]} pointerEvents="none" />

      <SafeAreaView style={[styles.safe, { paddingTop: topInset }]} edges={["top", "bottom"]}>
        {/* header */}
        <View style={styles.header}>
          <Text accessibilityRole="header" aria-level={1} style={[styles.wordmark, ui.shadow, { color: ui.ink, fontFamily: SERIF }]}>
            Spark Quotes
          </Text>
          <Text style={[styles.worldName, ui.shadow, { color: ui.soft, fontFamily: SERIF }]} numberOfLines={1}>
            {cfg.name}
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollBody, { paddingTop: Math.max(10, height * (wide ? 0.07 : 0.035)) }]}
          showsVerticalScrollIndicator={false}
        >
          {quote ? (
            <Animated.View
              style={[
                styles.quoteBlock,
                { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
              ]}
            >
              <Text style={[styles.eyebrow, ui.shadow, { color: ui.soft, fontFamily: SANS }]}>
                {eyebrow} · {quote.category}
              </Text>

              <View accessibilityLiveRegion="polite" aria-live="polite">
                <Text
                  style={[styles.quote, ui.shadow, { color: ui.ink, fontFamily: SERIF, fontSize: quoteSize, lineHeight: Math.round(quoteSize * 1.3) }]}
                >
                  {"“"}{quote.text}{"”"}
                </Text>
                <Text style={[styles.author, ui.shadow, { color: ui.soft, fontFamily: SANS }]}>
                  {anon ? "Author unknown" : quote.author}
                </Text>
              </View>

              <View style={styles.actions}>
                <Pill
                  icon={isFavorited ? "heart" : "heart-outline"}
                  label={isFavorited ? "Saved" : "Save"}
                  on={isFavorited}
                  onPress={onFavorite}
                  a11y={!userId ? "Sign in to save this quote" : isFavorited ? "Remove from favourites" : "Save to favourites"}
                />
                <Pill icon="share-social-outline" label={isSharing ? "Preparing…" : "Share"} onPress={onShare} disabled={isSharing} a11y="Share this quote" />
                <Pill icon="ellipsis-horizontal" label={width < 430 ? "" : "More"} onPress={() => setMoreOpen((v) => !v)} a11y={moreOpen ? "Hide more options" : "More options"} on={moreOpen} />
              </View>

              {moreOpen ? (
                <View style={styles.more}>
                  {!q.isDaily ? <Pill quiet icon="today-outline" label="Today's quote" onPress={q.backToDaily} /> : null}
                  {Platform.OS === "web" ? (
                    <Pill quiet icon="book-outline" label={`All ${quote.category} quotes`} onPress={onCollection} />
                  ) : null}
                  {LINKS.BMC_URL ? <Pill quiet icon="cafe-outline" label="Buy us a coffee" onPress={openCoffee} a11y="Buy us a coffee (opens Buy Me a Coffee)" /> : null}
                  <Pill quiet icon="albums-outline" label="Classic view" onPress={() => router.push("/classic" as any)} />
                  <Pill quiet icon="flag-outline" label={hasReported ? "Reported" : "Report"} onPress={onReport} disabled={hasReported} a11y="Report this quote as inappropriate" />
                </View>
              ) : null}

              {/* Today's quote is the centrepiece, so a new one is a quiet
                  offer rather than a main button — but it's always there
                  for a day when this one doesn't land. */}
              <Pressable
                onPress={q.another}
                disabled={q.busy}
                accessibilityRole="button"
                accessibilityLabel="Show a different quote"
                hitSlop={8}
                style={({ pressed }) => [styles.tryAnother, { opacity: q.busy ? 0.5 : pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.tryAnotherText, ui.shadow, { color: ui.soft, fontFamily: SANS }]}>
                  {q.busy ? "Finding one…" : "Not quite right? "}
                  {q.busy ? null : <Text style={[styles.tryAnotherLink, { color: ui.ink }]}>Try another</Text>}
                </Text>
              </Pressable>

              {notice ? <Text accessibilityRole="alert" style={[styles.notice, { color: ui.ink, fontFamily: SANS }]}>{notice}</Text> : null}

              {streak && streak.current > 1 ? (
                <Text style={[styles.streak, ui.shadow, { color: ui.soft, fontFamily: SANS }]}>{streakLabel(streak)}</Text>
              ) : null}
            </Animated.View>
          ) : (
            <Text style={[styles.loading, { color: ui.soft, fontFamily: SERIF }]} accessibilityLiveRegion="polite">
              Finding today's spark…
            </Text>
          )}

          {quote ? (
            <View style={styles.prompt}>
              <NotificationPrompt userId={userId} />
            </View>
          ) : null}
        </ScrollView>

        {/* tray: the daily question, or the way between worlds */}
        <View style={[styles.tray, { backgroundColor: ui.tray, borderColor: ui.line }]}>
          {askOpen ? (
            <View role="group" aria-label="What would you like a little more of today?">
              <View style={styles.askHead}>
                <Text style={[styles.askTitle, { color: ui.ink, fontFamily: SERIF }]}>What would you like a little more of today?</Text>
                <Pressable onPress={closeAsk} accessibilityRole="button" accessibilityLabel="Skip this question" hitSlop={10} style={styles.skip}>
                  <Text style={[styles.skipText, { color: ui.soft, fontFamily: SANS }]}>Skip</Text>
                </Pressable>
              </View>
              <View style={styles.chips}>
                {MOODS.map((m) => (
                  <Pill key={m.id} label={m.label} onPress={() => onMood(m.id)} on={q.mood === m.id} />
                ))}
              </View>
            </View>
          ) : (
            // The world follows the quote and the mood, so nobody has to
            // choose one. Wandering is there for those who want it.
            worldsOpen ? (
              <View style={styles.switchRow}>
                <View role="radiogroup" aria-label="Choose a world" style={styles.worlds}>
                  {WORLD_ORDER.map((id) => {
                    const on = id === q.world;
                    return (
                      <Pressable
                        key={id}
                        role="radio"
                        aria-checked={on}
                        aria-label={WORLDS[id].name}
                        onPress={() => { q.visitWorld(id); setWorldsOpen(false); }}
                        style={({ pressed }) => [styles.worldBtn, { backgroundColor: on ? ui.fillOn : "transparent", borderColor: on ? "transparent" : ui.line, opacity: pressed ? 0.7 : 1 }]}
                      >
                        <Text style={[styles.worldBtnText, { color: on ? ui.inkOn : ui.ink, fontFamily: SANS }]} numberOfLines={1}>
                          {SHORT_NAME[id]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={() => setWorldsOpen(false)} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={styles.reask}>
                  <Ionicons name="close" size={19} color={ui.ink} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.hereRow}>
                <Pressable onPress={() => setWorldsOpen(true)} accessibilityRole="button" accessibilityLabel={`You're in ${cfg.name}. Visit a different world`} hitSlop={6} style={({ pressed }) => [styles.here, { opacity: pressed ? 0.65 : 1 }]}>
                  <Ionicons name="compass-outline" size={16} color={ui.ink} />
                  {width >= 520 ? (
                    <Text style={[styles.hereText, { color: ui.soft, fontFamily: SERIF }]} numberOfLines={1}>{cfg.mood}</Text>
                  ) : null}
                  <Text style={[styles.hereLink, { color: ui.ink, fontFamily: SANS }]}>{width >= 520 ? "Wander" : "Visit another world"}</Text>
                </Pressable>
                <Pressable onPress={() => setAskOpen(true)} accessibilityRole="button" accessibilityLabel="Choose what you would like a little more of today" hitSlop={6} style={({ pressed }) => [styles.here, { opacity: pressed ? 0.65 : 1 }]}>
                  <Ionicons name="sparkles-outline" size={16} color={ui.ink} />
                  <Text style={[styles.hereLink, { color: ui.ink, fontFamily: SANS }]}>{q.mood ? MOODS.find((m) => m.id === q.mood)!.label : width >= 380 ? "Choose a mood" : "Mood"}</Text>
                </Pressable>
              </View>
            )
          )}

          <View style={[styles.dock, { borderColor: ui.line }]} role="navigation" aria-label="Main">
            {([
              ["list", "Topics", "/topics"],
              ["heart", "Favourites", "/favorites"],
              ["add", "Add quote", "/submitQuote"],
              ["settings-outline", "Settings", "/settings"],
            ] as const).map(([icon, label, href]) => (
              <Pressable key={href} onPress={() => router.push(href as any)} accessibilityRole="button" accessibilityLabel={label}
                style={({ pressed }) => [styles.dockBtn, { opacity: pressed ? 0.6 : 1 }]}>
                <Ionicons name={icon} size={21} color={ui.ink} />
                <Text style={[styles.dockText, { color: ui.ink, fontFamily: SANS }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>

      {/* for screen readers: where we are, and what a save did */}
      <Text accessibilityLiveRegion="polite" aria-live="polite" style={styles.srOnly}>{status}</Text>
    </View>
    </UiContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  safe: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "baseline", justifyContent: "space-between",
    paddingHorizontal: 22, paddingTop: Platform.OS === "web" ? 18 : 8, paddingBottom: 6, gap: 12,
  },
  wordmark: { fontSize: 21, letterSpacing: -0.2, fontWeight: "500" },
  worldName: { fontSize: 15, fontStyle: "italic", flexShrink: 1, textAlign: "right" },
  scroll: { flex: 1 },
  scrollBody: { flexGrow: 1, alignItems: "center", paddingHorizontal: 18, paddingBottom: 18 },
  quoteBlock: { width: "100%", maxWidth: 720, alignItems: "center" },
  eyebrow: { fontSize: 11.5, letterSpacing: 1.9, textTransform: "uppercase", fontWeight: "600", textAlign: "center", marginBottom: 16 },
  quote: { textAlign: "center", fontWeight: "400", letterSpacing: -0.3 },
  author: { textAlign: "center", fontSize: 13, letterSpacing: 1.6, textTransform: "uppercase", fontWeight: "600", marginTop: 18 },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 26 },
  more: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 2, marginTop: 10, maxWidth: 560 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 7, minHeight: 40,
    paddingVertical: 9, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1,
  },
  pillText: { fontSize: 14, fontWeight: "600" },
  notice: { marginTop: 12, fontSize: 13.5, textAlign: "center", fontWeight: "500" },
  tryAnother: { marginTop: 14, paddingVertical: 8, paddingHorizontal: 10, minHeight: 40, justifyContent: "center" },
  tryAnotherText: { fontSize: 14, textAlign: "center" },
  tryAnotherLink: { fontWeight: "600", textDecorationLine: "underline" },
  streak: { marginTop: 16, fontSize: 12.5, letterSpacing: 0.3 },
  loading: { fontSize: 22, fontStyle: "italic", marginTop: 60, textAlign: "center" },
  prompt: { width: "100%", maxWidth: 520, marginTop: 8 },
  tray: {
    marginHorizontal: 10, marginBottom: Platform.OS === "web" ? 10 : 4, borderRadius: 24, borderWidth: 1,
    paddingTop: 12, paddingHorizontal: 12, alignSelf: "center", width: "100%", maxWidth: 640,
  },
  askHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingHorizontal: 6 },
  askTitle: { fontSize: 18.5, lineHeight: 24, fontStyle: "italic", flex: 1 },
  skip: { paddingVertical: 4, paddingHorizontal: 6 },
  skipText: { fontSize: 13.5, fontWeight: "600", textDecorationLine: "underline" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 11, marginBottom: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  worlds: { flexDirection: "row", flex: 1, gap: 5 },
  worldBtn: { flexGrow: 1, flexShrink: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 1, paddingHorizontal: 8 },
  worldBtnText: { fontSize: 13, fontWeight: "600" },
  reask: { width: 40, height: 38, alignItems: "center", justifyContent: "center" },
  hereRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 6, marginBottom: 10, minHeight: 38 },
  here: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 38, flexShrink: 1 },
  hereText: { fontSize: 15.5, fontStyle: "italic", flexShrink: 1 },
  hereLink: { fontSize: 13.5, fontWeight: "600", textDecorationLine: "underline" },
  dock: { flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, paddingTop: 8, paddingBottom: 9 },
  dockBtn: { alignItems: "center", gap: 3, minWidth: 64, paddingVertical: 2 },
  dockText: { fontSize: 11.5, fontWeight: "600" },
  srOnly: { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, left: -10 },
});
