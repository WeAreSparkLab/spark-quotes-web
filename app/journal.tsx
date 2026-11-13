// app/journal.tsx — the Spark Journal
//
// A private place for two small things: a reflection (optionally about a
// quote) and an intention for the day. Only the person who wrote an entry
// can ever read it; it is never shared and never sent to any AI service.
// /journal?q=<quote id> starts a reflection about that quote.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import PageHeader from "../components/common/PageHeader";
import { Ionicons } from "../components/common/Ionicons";
import { C, F, S } from "../styles/theme";
import { useSupabase } from "./_layout";
import { useStudioQuote } from "../components/studio/useStudioQuote";
import { addEntry, deleteEntry, listEntries, localDate, type JournalEntry, type JournalKind } from "../services/journal";
import { creditLine } from "../utils/quoteArt";
import { THOUGHTS_KEY } from "../components/screens/ReflectScreen";
import { play } from "../utils/sound";

const PROMPTS: Record<JournalKind, { label: string; placeholder: string }> = {
  reflection: { label: "A reflection", placeholder: "What's on your mind?" },
  intention: { label: "An intention for today", placeholder: "Today, I'd like to…" },
};

function dayLabel(iso: string) {
  const today = localDate();
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (iso === today) return "Today";
  if (iso === localDate(y)) return "Yesterday";
  const [yy, mm, dd] = iso.split("-").map(Number);
  return new Date(yy, mm - 1, dd).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

export default function Journal() {
  const router = useRouter();
  const { userId } = useSupabase();
  const { quote: linkedQuote } = useStudioQuote(); // optional ?q=
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<JournalKind>("reflection");
  const [body, setBody] = useState("");
  const [aboutQuote, setAboutQuote] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deviceThoughts, setDeviceThoughts] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try { setEntries(await listEntries()); } catch { setError("Couldn't load your journal. Please try again."); }
    finally { setLoading(false); }
  }, [userId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    AsyncStorage.getItem(THOUGHTS_KEY).then((raw) => setDeviceThoughts(raw ? JSON.parse(raw) : [])).catch(() => {});
  }, []);

  const save = async () => {
    if (!body.trim() || saving) return;
    setSaving(true);
    setStatus("");
    try {
      const q = kind === "reflection" && aboutQuote && linkedQuote ? linkedQuote : null;
      const e = await addEntry({ kind, body, quote: q });
      setEntries((cur) => [e, ...cur]);
      setBody("");
      play("save");
      setStatus("Saved to your journal.");
    } catch {
      setStatus("Couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const before = entries;
    setEntries((cur) => cur.filter((e) => e.id !== id));
    setConfirmId(null);
    try { await deleteEntry(id); play("unsave"); setStatus("Entry deleted."); }
    catch { setEntries(before); setStatus("Couldn't delete that. Please try again."); }
  };

  const importDeviceThoughts = async () => {
    try {
      for (const t of deviceThoughts) {
        await addEntry({
          kind: "reflection",
          body: t.thought,
          quote: t.quoteId ? { id: t.quoteId, text: t.quote, author: t.author } : null,
          date: localDate(new Date(t.at)),
        });
      }
      await AsyncStorage.removeItem(THOUGHTS_KEY);
      setDeviceThoughts([]);
      setStatus("Added to your journal.");
      load();
    } catch {
      setStatus("Couldn't add those just now. They're still on this device.");
    }
  };

  const grouped = useMemo(() => {
    const m = new Map<string, JournalEntry[]>();
    for (const e of entries) m.set(e.entry_date, [...(m.get(e.entry_date) ?? []), e]);
    return [...m.entries()];
  }, [entries]);

  if (!userId) {
    return (
      <SafeAreaView style={S.page}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <PageHeader title="Your journal" />
          <View style={S.column}>
            <View style={[S.card, styles.empty]}>
              <Text style={S.h2}>A private place for your thoughts</Text>
              <Text style={[S.body, styles.emptyBody]}>
                Write a reflection on a quote, or a small intention for the day. Only you can read it. Sign in to start your journal.
              </Text>
              <Pressable onPress={() => router.push("/auth")} accessibilityRole="button" style={({ pressed }) => [S.btn, S.btnPrimary, { opacity: pressed ? 0.85 : 1 }]}>
                <Text style={S.btnPrimaryText}>Sign in or create an account</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.page}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <PageHeader title="Your journal" subtitle="Private to you. Never shared, and never sent to any AI service." />
        <View style={S.column}>
          {deviceThoughts.length > 0 ? (
            <View style={[S.card, styles.importCard]}>
              <Text style={S.label}>
                {deviceThoughts.length === 1 ? "You kept a thought" : `You kept ${deviceThoughts.length} thoughts`} on this device during a quiet minute.
              </Text>
              <View style={styles.row}>
                <Pressable onPress={importDeviceThoughts} accessibilityRole="button" style={({ pressed }) => [S.btn, S.btnPrimary, styles.smallBtn, { opacity: pressed ? 0.85 : 1 }]}>
                  <Text style={S.btnPrimaryText}>Add to my journal</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={S.card}>
            <View style={styles.tabs} role="radiogroup" aria-label="What would you like to write">
              {(Object.keys(PROMPTS) as JournalKind[]).map((k) => {
                const on = kind === k;
                return (
                  <Pressable key={k} role="radio" aria-checked={on} onPress={() => { play("tap"); setKind(k); }}
                    style={({ pressed }) => [S.chip, on && S.chipOn, { opacity: pressed ? 0.75 : 1 }]}>
                    <Text style={[S.chipText, on && S.chipTextOn]}>{PROMPTS[k].label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {kind === "reflection" && linkedQuote ? (
              <Pressable onPress={() => setAboutQuote((v) => !v)} role="checkbox" aria-checked={aboutQuote} style={styles.about}>
                <Ionicons name={aboutQuote ? "checkbox" : "square-outline"} size={18} color={aboutQuote ? C.accent : C.inkSoft} />
                <Text style={[S.body, { flex: 1 }]} numberOfLines={2}>
                  About {"“"}{linkedQuote.text}{"”"}
                </Text>
              </Pressable>
            ) : null}

            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={2000}
              placeholder={PROMPTS[kind].placeholder}
              placeholderTextColor={C.inkSoft}
              aria-label={PROMPTS[kind].label}
              style={[S.input, styles.input]}
            />
            <View style={styles.saveRow}>
              <Text style={styles.count}>{body.length}/2000</Text>
              <Pressable onPress={save} disabled={!body.trim() || saving} accessibilityRole="button"
                style={({ pressed }) => [S.btn, S.btnPrimary, styles.smallBtn, { opacity: !body.trim() || saving ? 0.5 : pressed ? 0.85 : 1 }]}>
                {saving ? <ActivityIndicator color={C.onAccent} /> : <Text style={S.btnPrimaryText}>Save</Text>}
              </Pressable>
            </View>
          </View>
          <Text accessibilityLiveRegion="polite" aria-live="polite" style={[S.body, styles.status]}>{status}</Text>

          {loading ? (
            <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} />
          ) : error ? (
            <Text accessibilityRole="alert" style={[S.body, { color: C.danger }]}>{error}</Text>
          ) : entries.length === 0 ? (
            <Text style={[S.body, styles.nothing]}>Your entries will appear here. There's no right way to do this, and no need to write every day.</Text>
          ) : (
            grouped.map(([day, list]) => (
              <View key={day} style={{ marginTop: 18 }}>
                <Text style={[S.eyebrow, styles.day]}>{dayLabel(day)}</Text>
                {list.map((e) => (
                  <View key={e.id} style={[S.card, styles.entry]}>
                    <Text style={styles.kind}>{e.kind === "intention" ? "Intention" : "Reflection"}</Text>
                    {e.quote_text ? (
                      <Text style={styles.entryQuote}>{"“"}{e.quote_text}{"”"}{e.quote_author ? ` — ${creditLine(e.quote_author)}` : ""}</Text>
                    ) : null}
                    <Text style={styles.entryBody}>{e.body}</Text>
                    <View style={styles.entryFoot}>
                      {confirmId === e.id ? (
                        <>
                          <Text style={[S.body, { fontSize: 13.5 }]}>Delete this entry? This can't be undone.</Text>
                          <Pressable onPress={() => remove(e.id)} accessibilityRole="button" hitSlop={6}><Text style={[S.link, { color: C.danger }]}>Delete</Text></Pressable>
                          <Pressable onPress={() => setConfirmId(null)} accessibilityRole="button" hitSlop={6}><Text style={S.link}>Keep</Text></Pressable>
                        </>
                      ) : (
                        <Pressable onPress={() => setConfirmId(e.id)} accessibilityRole="button" accessibilityLabel="Delete this entry" hitSlop={6} style={styles.del}>
                          <Ionicons name="trash-outline" size={15} color={C.inkSoft} />
                          <Text style={[S.body, { fontSize: 13 }]}>Delete</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "flex-start", gap: 4, paddingVertical: 24 },
  emptyBody: { marginBottom: 14 },
  importCard: { backgroundColor: C.accentWash, borderColor: "transparent" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  smallBtn: { minHeight: 42, paddingHorizontal: 18 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  about: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  input: { minHeight: 120, textAlignVertical: "top", fontFamily: F.serif, fontSize: 18, lineHeight: 26 },
  saveRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  count: { fontFamily: F.sans, fontSize: 12, color: C.inkSoft },
  status: { marginTop: 4, minHeight: 20 },
  nothing: { marginTop: 18, textAlign: "center" },
  day: { marginBottom: 8, marginLeft: 4 },
  entry: { paddingVertical: 16 },
  kind: { fontFamily: F.sans, fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", fontWeight: "600", color: C.accent },
  entryQuote: { fontFamily: F.serif, fontStyle: "italic", fontSize: 15, lineHeight: 21, color: C.inkSoft, marginTop: 8 },
  entryBody: { fontFamily: F.serif, fontSize: 18, lineHeight: 26, color: C.ink, marginTop: 8 },
  entryFoot: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 12 },
  del: { flexDirection: "row", alignItems: "center", gap: 5 },
});
