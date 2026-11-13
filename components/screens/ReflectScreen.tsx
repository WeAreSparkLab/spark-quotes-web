// components/screens/ReflectScreen.tsx — a quiet minute
//
// /reflect?q=<quote id>. A short pause with one quote, in its own world:
// 30 seconds or a minute, optional breathing cues, optional thought.
// It is a pause, not a treatment — no health claims anywhere — and leaving
// early is simply leaving: there is no score, streak or "you didn't finish".
//
// A thought written here stays on this device only (localStorage). When the
// Spark Journal exists, it can offer to bring these in.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import WorldBackdrop from "../worlds/WorldBackdrop";
import WorldCanvas from "../worlds/WorldCanvas";
import { Ionicons } from "../common/Ionicons";
import { useStudioQuote } from "../studio/useStudioQuote";
import { WORLDS, worldForCategory } from "../../worlds/config";
import { creditLine } from "../../utils/quoteArt";
import { play } from "../../utils/sound";
import SoundToggle from "../common/SoundToggle";
import { useSupabase } from "../../app/_layout";
import { addEntry } from "../../services/journal";

const SERIF = Platform.OS === "web" ? '"Newsreader", "Iowan Old Style", Georgia, serif' : undefined;
const SANS = Platform.OS === "web" ? '"Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif' : undefined;

const IN_MS = 4000;
const OUT_MS = 6000;
const PREFS_KEY = "sparkReflectPrefs";
export const THOUGHTS_KEY = "sparkReflectThoughts"; // on this device only

type Phase = "ready" | "running" | "paused" | "done";

export default function ReflectScreen() {
  const router = useRouter();
  const { userId } = useSupabase();
  const { quote, state } = useStudioQuote();
  const [savedTo, setSavedTo] = useState<"journal" | "device">("device");
  const world = quote ? worldForCategory(quote.category) : "lake";
  const cfg = WORLDS[world];

  const [phase, setPhase] = useState<Phase>("ready");
  const [length, setLength] = useState<30 | 60>(60);
  const [breathing, setBreathing] = useState(true);
  const [cue, setCue] = useState<"in" | "out">("in");
  const [elapsed, setElapsed] = useState(0);
  const [endedEarly, setEndedEarly] = useState(false);
  const [thought, setThought] = useState("");
  const [saved, setSaved] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [no3D, setNo3D] = useState(false);

  const ring = useRef(new Animated.Value(0)).current;
  const clock = useRef<{ start: number; carried: number; timer: any }>({ start: 0, carried: 0, timer: null });

  useEffect(() => {
    if (Platform.OS === "web") setReduceMotion(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
    AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.length === 30 || p.length === 60) setLength(p.length);
      if (typeof p.breathing === "boolean") setBreathing(p.breathing);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ length, breathing })).catch(() => {});
  }, [length, breathing]);

  // ── the clock ────────────────────────────────────────────────────────────
  const stopClock = () => {
    if (clock.current.timer) clearInterval(clock.current.timer);
    clock.current.timer = null;
  };
  const startClock = useCallback(() => {
    clock.current.start = Date.now();
    stopClock();
    clock.current.timer = setInterval(() => {
      const ms = clock.current.carried + (Date.now() - clock.current.start);
      setElapsed(ms);
      // breathing phase follows the clock, so pausing never desyncs it
      const inCycle = ms % (IN_MS + OUT_MS);
      setCue(inCycle < IN_MS ? "in" : "out");
      if (ms >= length * 1000) {
        stopClock();
        play("done");
        setPhase("done");
      }
    }, 200);
  }, [length]);
  useEffect(() => () => stopClock(), []);

  // ── the ring ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "running" && breathing) play(cue === "in" ? "breatheIn" : "breatheOut");
  }, [cue, phase, breathing]);
  useEffect(() => {
    if (phase !== "running" || !breathing || reduceMotion) { ring.stopAnimation(); return; }
    Animated.timing(ring, {
      toValue: cue === "in" ? 1 : 0,
      duration: cue === "in" ? IN_MS : OUT_MS,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [cue, phase, breathing, reduceMotion, ring]);

  const begin = () => {
    clock.current.carried = 0;
    setElapsed(0);
    setCue("in");
    setEndedEarly(false);
    ring.setValue(0);
    play("begin");
    setPhase("running");
    startClock();
  };
  const pause = () => {
    clock.current.carried += Date.now() - clock.current.start;
    stopClock();
    setPhase("paused");
  };
  const resume = () => {
    setPhase("running");
    startClock();
  };
  const end = () => {
    stopClock();
    setEndedEarly(phase === "running" || phase === "paused");
    setPhase("done");
  };
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const keepThought = async () => {
    const t = thought.trim();
    if (!t || !quote) return;
    // signed in: straight into the private Spark Journal
    if (userId) {
      try {
        await addEntry({ kind: "reflection", body: t, quote: { id: quote.id, text: quote.text, author: quote.author } });
        setSavedTo("journal");
        setSaved(true);
        play("save");
        return;
      } catch {
        /* fall back to keeping it on the device */
      }
    }
    try {
      const raw = await AsyncStorage.getItem(THOUGHTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.push({ at: new Date().toISOString(), quoteId: quote.id, quote: quote.text, author: quote.author, thought: t.slice(0, 1000) });
      await AsyncStorage.setItem(THOUGHTS_KEY, JSON.stringify(list.slice(-200)));
      setSavedTo("device");
      setSaved(true);
      play("save");
    } catch {
      setSaved(false);
    }
  };

  // ── look ─────────────────────────────────────────────────────────────────
  const ink = cfg.ink, soft = cfg.inkSoft;
  const panel = cfg.dark ? "rgba(24,26,52,0.72)" : "rgba(252,248,240,0.84)";
  const line = cfg.dark ? "rgba(247,243,237,0.3)" : "rgba(44,37,54,0.22)";
  const progress = Math.min(1, elapsed / (length * 1000));
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] });

  const Btn = ({ icon, label, onPress, primary, a11y }: { icon?: string; label: string; onPress: () => void; primary?: boolean; a11y?: string }) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      style={({ pressed }) => [styles.btn, { borderColor: line, backgroundColor: primary ? (cfg.dark ? "rgba(247,243,237,0.94)" : "rgba(44,37,54,0.92)") : "transparent", opacity: pressed ? 0.75 : 1 }]}>
      {icon ? <Ionicons name={icon} size={18} color={primary ? (cfg.dark ? "#221C2B" : "#FBF6EE") : ink} /> : null}
      <Text style={[styles.btnText, { color: primary ? (cfg.dark ? "#221C2B" : "#FBF6EE") : ink, fontFamily: SANS }]}>{label}</Text>
    </Pressable>
  );
  const Choice = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
    <Pressable onPress={onPress} role="radio" aria-checked={on}
      style={({ pressed }) => [styles.choice, { borderColor: on ? "transparent" : line, backgroundColor: on ? (cfg.dark ? "rgba(247,243,237,0.9)" : "rgba(44,37,54,0.88)") : "transparent", opacity: pressed ? 0.75 : 1 }]}>
      <Text style={[styles.choiceText, { color: on ? (cfg.dark ? "#221C2B" : "#FBF6EE") : ink, fontFamily: SANS }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: cfg.sky[1] }]}>
      <WorldBackdrop world={world} painted={no3D || Platform.OS !== "web"} />
      {Platform.OS === "web" && quote ? <WorldCanvas world={world} onUnavailable={() => setNo3D(true)} /> : null}

      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <Pressable onPress={phase === "running" || phase === "paused" ? end : leave} accessibilityRole="button"
            accessibilityLabel={phase === "running" || phase === "paused" ? "End the quiet minute" : "Back"} hitSlop={10} style={[styles.topBtn, { backgroundColor: panel }]}>
            <Ionicons name={phase === "running" || phase === "paused" ? "close" : "arrow-back"} size={18} color={ink} />
            <Text style={[styles.topText, { color: ink, fontFamily: SANS }]}>{phase === "running" || phase === "paused" ? "End" : "Back"}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <SoundToggle color={ink} background={panel} />
        </View>

        <View style={styles.centre}>
          {state !== "ready" || !quote ? (
            <Text style={[styles.quote, { color: soft, fontFamily: SERIF, fontSize: 22 }]}>{state === "loading" ? "One moment…" : "That quote couldn't be found."}</Text>
          ) : (
            <View style={[styles.panel, { backgroundColor: panel, borderColor: line }]}>
              {phase === "ready" ? (
                <>
                  <Text style={[styles.eyebrow, { color: soft, fontFamily: SANS }]}>A quiet minute</Text>
                  <Text style={[styles.quote, { color: ink, fontFamily: SERIF }]}>{"“"}{quote.text}{"”"}</Text>
                  <Text style={[styles.author, { color: soft, fontFamily: SANS }]}>{creditLine(quote.author)}</Text>
                  <Text style={[styles.body, { color: soft, fontFamily: SANS }]}>
                    Read the words, then rest with them for a moment. You can pause or end whenever you like.
                  </Text>
                  <View style={styles.choices} role="radiogroup" aria-label="How long">
                    <Choice on={length === 30} label="30 seconds" onPress={() => setLength(30)} />
                    <Choice on={length === 60} label="1 minute" onPress={() => setLength(60)} />
                  </View>
                  <View style={styles.choices} role="radiogroup" aria-label="Breathing guide">
                    <Choice on={breathing} label="Breathing guide" onPress={() => setBreathing(true)} />
                    <Choice on={!breathing} label="Just the quote" onPress={() => setBreathing(false)} />
                  </View>
                  <View style={styles.row}><Btn icon="play" label="Begin" primary onPress={begin} /></View>
                </>
              ) : phase === "done" ? (
                <>
                  <Text style={[styles.eyebrow, { color: soft, fontFamily: SANS }]}>{endedEarly ? "That's alright" : "Thank you"}</Text>
                  <Text style={[styles.quote, { color: ink, fontFamily: SERIF, fontSize: 26 }]}>
                    {endedEarly ? "Any moment you take is a good one." : "Thank you for taking a moment."}
                  </Text>
                  <Text style={[styles.body, { color: soft, fontFamily: SANS }]}>Come back whenever you like.</Text>
                  {saved ? (
                    <Text accessibilityRole="alert" style={[styles.body, { color: ink, fontFamily: SANS, fontWeight: "600" }]}>{savedTo === "journal" ? "Saved to your journal." : "Kept on this device."}</Text>
                  ) : (
                    <>
                      <Text style={[styles.label, { color: ink, fontFamily: SANS }]} nativeID="thought-label">A thought, if you'd like (optional)</Text>
                      <TextInput
                        value={thought}
                        onChangeText={setThought}
                        multiline
                        maxLength={1000}
                        placeholder="Anything that came to mind…"
                        placeholderTextColor={soft}
                        aria-label="A thought, if you'd like"
                        style={[styles.input, { color: ink, borderColor: line, fontFamily: SERIF }]}
                      />
                      <Text style={[styles.small, { color: soft, fontFamily: SANS }]}>
                        {userId ? "Saved to your private journal. Only you can read it." : "Only kept on this device. Nothing is sent anywhere."}
                      </Text>
                    </>
                  )}
                  <View style={styles.row}>
                    {!saved && thought.trim() ? <Btn icon="bookmark-outline" label="Keep this thought" primary onPress={keepThought} /> : null}
                    <Btn icon="refresh" label="Another minute" onPress={() => { setSaved(false); setThought(""); setPhase("ready"); }} />
                    <Btn icon="home-outline" label="Back to my quote" onPress={leave} />
                  </View>
                </>
              ) : (
                <>
                  {breathing ? (
                    <View style={styles.breathWrap} aria-hidden>
                      <Animated.View style={[styles.ring, { borderColor: cfg.accent, opacity: reduceMotion ? 0.7 : ringOpacity, transform: [{ scale: reduceMotion ? 0.82 : ringScale }] }]} />
                      <Text style={[styles.cue, { color: ink, fontFamily: SERIF }]}>{phase === "paused" ? "Paused" : cue === "in" ? "Breathe in…" : "…and out"}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.quote, { color: ink, fontFamily: SERIF }]}>{"“"}{quote.text}{"”"}</Text>
                  <Text style={[styles.author, { color: soft, fontFamily: SANS }]}>{creditLine(quote.author)}</Text>
                  <View style={[styles.track, { backgroundColor: line }]} aria-hidden>
                    <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: cfg.accent }]} />
                  </View>
                  <View style={styles.row}>
                    {phase === "running"
                      ? <Btn icon="pause" label="Pause" onPress={pause} />
                      : <Btn icon="play" label="Resume" primary onPress={resume} />}
                    <Btn icon="close" label="End" onPress={end} a11y="End the quiet minute" />
                  </View>
                </>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
      <Text accessibilityLiveRegion="polite" aria-live="polite" style={styles.srOnly}>
        {phase === "running" ? "Quiet minute started." : phase === "paused" ? "Paused." : phase === "done" ? "Finished." : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  safe: { flex: 1 },
  top: { flexDirection: "row", paddingHorizontal: 18, paddingTop: 16 },
  topBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  topText: { fontSize: 14, fontWeight: "600" },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, paddingBottom: 24 },
  panel: { width: "100%", maxWidth: 560, borderRadius: 26, borderWidth: 1, paddingVertical: 28, paddingHorizontal: 24, alignItems: "center" },
  eyebrow: { fontSize: 11.5, letterSpacing: 1.9, textTransform: "uppercase", fontWeight: "600", marginBottom: 14 },
  quote: { fontSize: 25, lineHeight: 33, textAlign: "center" },
  author: { fontSize: 12.5, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "600", marginTop: 14 },
  body: { fontSize: 14.5, lineHeight: 21, textAlign: "center", marginTop: 16 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 20, alignSelf: "flex-start" },
  small: { fontSize: 12.5, marginTop: 6, alignSelf: "flex-start" },
  input: { width: "100%", minHeight: 90, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 8, fontSize: 17, lineHeight: 24, textAlignVertical: "top" },
  choices: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 14 },
  choice: { minHeight: 38, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, justifyContent: "center" },
  choiceText: { fontSize: 14, fontWeight: "600" },
  row: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 22 },
  btn: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 44, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1 },
  btnText: { fontSize: 15, fontWeight: "600" },
  breathWrap: { width: 150, height: 150, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  ring: { position: "absolute", width: 150, height: 150, borderRadius: 75, borderWidth: 2 },
  cue: { fontSize: 17, fontStyle: "italic" },
  track: { width: "70%", height: 2, borderRadius: 2, marginTop: 22, overflow: "hidden" },
  fill: { height: 2 },
  srOnly: { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, left: -10 },
});
