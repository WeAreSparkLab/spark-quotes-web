// app/settings.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Linking,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  DevSettings,
  ActionSheetIOS,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "../components/common/Ionicons";
import PageHeader from "../components/common/PageHeader";
import { C, S } from "../styles/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Switch from "../components/common/Switch";
import { supabase } from "../supabaseClient";
import { useSupabase } from "./_layout";
import { shareApp } from "../utils/shareApp";
import { openCoffee, openTipChooser, getStripeCTA } from "../utils/support";
import { LINKS } from "../utils/support";
import { TIME_SLOTS, DEFAULT_SLOT_LABELS } from "../utils/schedule";

const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Slot definitions live in utils/schedule so Settings and the home screen
// (which keys the displayed quote to these slots) can never disagree.
const timeOptions = TIME_SLOTS.map((s) => s.label);
const DEFAULT_TIMES = DEFAULT_SLOT_LABELS;

const PRIVACY_POLICY_URL = "https://quotes.wearesparklab.com/privacy";

// Keep your imports above as-is, but remove the InstallCTA import

declare global { interface Window { __deferredPWA?: any } }

export async function forceUpdate() {
  // Ask SW to check for updates and reload
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map(r => r.update()));
  // Small delay to let new SW activate
  setTimeout(() => window.location.reload(), 400);
}


const isWebWithSW =
  typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

function InstallAppRow() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const check = () => setCanInstall(!!window.__deferredPWA);
    check();

    const handler = (e: any) => {
      e.preventDefault();
      window.__deferredPWA = e;
      check();
    };
    window.addEventListener("beforeinstallprompt", handler as any);
    return () => window.removeEventListener("beforeinstallprompt", handler as any);
  }, []);

  const doInstall = async () => {
    const dp = window.__deferredPWA;
    if (!dp) return;
    dp.prompt();
    await dp.userChoice;
    window.__deferredPWA = undefined;
    setCanInstall(false);
  };

  const isiOSWeb =
    Platform.OS === "web" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (Platform.OS !== "web") return null;

  return (
    <View style={styles.settingCard}>
      <Text style={styles.sectionTitle}>Install app</Text>
      {canInstall ? (
        <TouchableOpacity style={styles.logoutButton} onPress={doInstall}>
          <Text style={styles.logoutButtonText}>Install</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.installNote}>
          {isiOSWeb
            ? "On iPhone: Share → Add to Home Screen."
            : "If the button isn’t visible, you may already have installed it."}
        </Text>
      )}
    </View>
  );
}

// ----------------- START Settings component AFTER InstallAppRow closes -----------------
export default function Settings() {
  const router = useRouter();
  const { session, userId } = useSupabase();

  // iOS Safari has no prompt – show steps
  const isiOSWeb = Platform.OS === "web" && /iPad|iPhone|iPod/.test(navigator.userAgent);


  // notifications settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>(dayOptions);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(["Morning"]);
  const [refreshing, setRefreshing] = useState(false);

  // account / supporter
  const [deleting, setDeleting] = useState(false);
  const [isSupporter, setIsSupporter] = useState(false);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const [redeemMsg, setRedeemMsg] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [saving, setSaving] = useState(false);



  const SUPPORTER_KEYS_ENABLED =
    (process.env.EXPO_PUBLIC_SUPPORTER_KEYS ?? '').toLowerCase() === 'true';

  async function refreshApp() {
    try {
      setRefreshing(true);

      if (Platform.OS === "web") {
        await forceUpdate(); // uses your SW helper above, then reloads
        return;
      }
      let Updates: any;
      try {
        Updates = await import("expo-updates");
      } catch {
        Updates = null;
      }
      if (!Updates?.checkForUpdateAsync) {
        DevSettings.reload();
        return;
      }

      const res = await Updates.checkForUpdateAsync();
      if (res.isAvailable) await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (e) {
      console.log("Refresh failed", e);
      setRefreshing(false);
    }
  }

  // -----------------------------
  // Fetch profile.is_supporter
  // -----------------------------
  const refreshSupporter = useCallback(async () => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) {
        setIsSupporter(false);
        return;
      }
      const { data: profile, error } = await supabase
        .schema('quotes')
        .from("profiles")
        .select("is_supporter")
        .eq("id", uid)
        .single();

      if (error) throw error;
      setIsSupporter(!!profile?.is_supporter);
    } catch {
      // safe fallback
      setIsSupporter(false);
    }
  }, []);

  // Run once on mount and whenever auth user changes
  useEffect(() => {
    if (SUPPORTER_KEYS_ENABLED) {
      refreshSupporter();
    }
  }, [refreshSupporter, session?.user?.id]);

  // -----------------------------
  // Redeem supporter key
  // -----------------------------
  const redeemKey = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert("Enter code", "Please enter your supporter code.");
      return;
    }

    setRedeeming(true);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-support-key", {
        body: { code: trimmed },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Could not redeem.");
      }

      Alert.alert("Thank you!", "Supporter unlocked 🎉");
      setCode("");                 // clear the input on success
      await refreshSupporter();    // fetch profile.is_supporter again
    } catch (e: any) {
      Alert.alert("Could not redeem", String(e?.message ?? e));
    } finally {
      setRedeeming(false);
    }
  };


  // -----------------------------
  // Load & Save local settings
  // -----------------------------
  useEffect(() => {
    (async () => {
      try {
        const storedEnabled = await AsyncStorage.getItem("notificationsEnabled");
        if (storedEnabled !== null)
          setNotificationsEnabled(JSON.parse(storedEnabled));


        const storedDays = await AsyncStorage.getItem("selectedDays");
        if (storedDays !== null) setSelectedDays(JSON.parse(storedDays));

        const storedTimes = await AsyncStorage.getItem("selectedTimes");
        if (storedTimes !== null) setSelectedTimes(JSON.parse(storedTimes));
      } catch (e) {
        console.error("Failed to load settings.", e);
      }
    })();
  }, []);

  const handleSaveChanges = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await AsyncStorage.setItem(
        "notificationsEnabled",
        JSON.stringify(notificationsEnabled)
      );
      await AsyncStorage.setItem("selectedDays", JSON.stringify(selectedDays));
      await AsyncStorage.setItem("selectedTimes", JSON.stringify(selectedTimes));

      // Save to Supabase for web notifications
      if (Platform.OS === 'web' && userId) {
        // The chosen slots ARE the schedule. Never save an empty list — that
        // leaves notifications switched on while nothing is ever sent.
        const chosen = selectedTimes.length > 0 ? selectedTimes : DEFAULT_TIMES;
        const notificationTimes = TIME_SLOTS
          .filter((slot) => chosen.includes(slot.label))
          .map((slot) => slot.time);

        if (selectedTimes.length === 0) setSelectedTimes(DEFAULT_TIMES);
        
        try {
          console.log('Saving notification preferences for userId:', userId);
          console.log('Preferences:', { enabled: notificationsEnabled, times: notificationTimes, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
          
          // First, try to update existing record
          const { data: existing, error: selectError } = await supabase
            .schema('quotes')
            .from('notification_preferences')
            .select('id')
            .eq('user_id', userId)
            .single();
          
          console.log('Existing record check:', { existing, selectError });
          
          let error, data;
          if (existing) {
            // Update existing record
            console.log('Updating existing notification preferences...');
            const result = await supabase
              .schema('quotes')
              .from('notification_preferences')
              .update({
                enabled: notificationsEnabled,
                times: notificationTimes,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId);
            error = result.error;
            data = result.data;
          } else {
            // Insert new record
            console.log('Inserting new notification preferences...');
            const result = await supabase
              .schema('quotes')
              .from('notification_preferences')
              .insert({
                user_id: userId,
                enabled: notificationsEnabled,
                times: notificationTimes,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            error = result.error;
            data = result.data;
          }
          
          console.log('Save result:', { data, error });
          
          if (error) {
            console.error('❌ Error saving notification preferences:', error);
          } else {
            console.log('✅ Notification preferences saved to Supabase successfully');
          }
        } catch (e) {
          console.error('Failed to save notification preferences:', e);
        }
      }

      // Optional: quick feedback
      // Alert.alert("Saved", "Your preferences have been updated.");

      goBackOrHome();
    } catch (e) {
      console.error("Failed to save settings.", e);
      Alert.alert("Couldn't save", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // Account actions
  // -----------------------------

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSignIn = () => {
    router.push("/auth");
  };

  const openPrivacy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert("Error", "Could not open Privacy Policy.");
    }
  };

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        "Delete account?\n\nThis permanently deletes your account and related data. This cannot be undone."
      );
      if (confirmed) {
        deleteAccount();
      }
    } else {
      Alert.alert(
        "Delete account",
        "This permanently deletes your account and related data. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: deleteAccount },
        ]
      );
    }
  };

  const deleteAccount = async () => {
    if (!session?.user) return;
    setDeleting(true);
    try {
      // One atomic call: deletes the caller's app data and their actual
      // Supabase Auth account together, or (if anything fails) neither --
      // never a state where the account is told "deleted" but can still
      // log back in.
      const { error } = await supabase.schema('quotes').rpc('delete_user');
      if (error) throw error;

      await supabase.auth.signOut();

      if (Platform.OS === 'web') {
        alert("Account deleted. Your account and data have been removed.");
      } else {
        Alert.alert("Account deleted", "Your account and data have been removed.");
      }

      router.replace("/");
    } catch (e: any) {
      console.error("Delete account failed:", e?.message ?? e);

      if (Platform.OS === 'web') {
        alert("Could not delete account. Nothing was removed — please try again or contact support.");
      } else {
        Alert.alert(
          "Could not delete account",
          "Nothing was removed — please try again or contact support."
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  // -----------------------------
  // UI helpers
  // -----------------------------

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const goBackOrHome = () => {
    // If there's a history entry, go back. Otherwise jump to home.
    if (router.canGoBack()) router.back();
    else router.replace("/"); // or router.replace("/index")
  };



  // -----------------------------
  // Render
  // -----------------------------

  const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      role="checkbox"
      aria-checked={on}
      accessibilityLabel={label}
      style={({ pressed }) => [S.chip, on && S.chipOn, { opacity: pressed ? 0.75 : 1 }]}
    >
      <Text style={[S.chipText, on && S.chipTextOn]}>{label}</Text>
    </Pressable>
  );

  const Button = ({ label, onPress, kind = "ghost", busy, disabled }: {
    label: string; onPress: () => void; kind?: "primary" | "ghost" | "danger"; busy?: boolean; disabled?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      style={({ pressed }) => [
        S.btn,
        kind === "primary" ? S.btnPrimary : kind === "danger" ? styles.btnDanger : S.btnGhost,
        { opacity: disabled || busy ? 0.6 : pressed ? 0.85 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={kind === "primary" ? C.onAccent : C.ink} />
      ) : (
        <Text style={kind === "primary" ? S.btnPrimaryText : kind === "danger" ? styles.btnDangerText : S.btnGhostText}>{label}</Text>
      )}
    </Pressable>
  );

  const hasTips = !!(LINKS.BMC_URL || LINKS.TIP_ANY || LINKS.TIP_5 || LINKS.TIP_10);

  return (
    <SafeAreaView style={S.page}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <PageHeader title="Settings" onBack={goBackOrHome} />

        <View style={S.column}>
          {/* Reminders */}
          <Text style={[S.eyebrow, styles.group]}>Daily reminders</Text>
          <View style={S.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={S.label}>Send me a quote</Text>
                <Text style={[S.body, { marginTop: 2 }]}>A gentle notification with a fresh quote.</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#D8D0DF", true: C.accent }}
                thumbColor={"#FFFFFF"}
              />
            </View>

            <View style={[styles.divider, !notificationsEnabled && { opacity: 0.5 }]} />

            <View style={!notificationsEnabled ? { opacity: 0.5 } : null} pointerEvents={notificationsEnabled ? "auto" : "none"}>
              <Text style={S.label}>When</Text>
              <Text style={[S.body, styles.help]}>
                {selectedTimes.length <= 1
                  ? "One quote a day. Add more times if you'd like extra."
                  : `${selectedTimes.length} quotes a day.`}
              </Text>
              <View style={styles.chips}>
                {timeOptions.map((option) => (
                  <Chip key={option} label={option} on={selectedTimes.includes(option)} onPress={() => toggleTime(option)} />
                ))}
              </View>

              <Text style={[S.label, { marginTop: 18 }]}>Which days</Text>
              <View style={[styles.chips, { marginTop: 10 }]}>
                {dayOptions.map((day) => (
                  <Chip key={day} label={day} on={selectedDays.includes(day)} onPress={() => toggleDay(day)} />
                ))}
              </View>
            </View>

            <View style={{ marginTop: 20 }}>
              <Button label={saving ? "Saving…" : "Save reminders"} kind="primary" onPress={handleSaveChanges} disabled={saving} />
            </View>
          </View>

          {/* Account */}
          <Text style={[S.eyebrow, styles.group]}>Account</Text>
          <View style={S.card}>
            {session ? (
              <>
                {session.user?.email ? <Text style={[S.body, { marginBottom: 14 }]}>Signed in as {session.user.email}</Text> : null}
                <Button label="Sign out" onPress={handleLogout} disabled={deleting} />
                <View style={[styles.divider, { marginVertical: 18 }]} />
                <Text style={S.label}>Delete account</Text>
                <Text style={[S.body, styles.help]}>Permanently removes your account, favourites and reminder settings. This can't be undone.</Text>
                <Button label="Delete my account" kind="danger" onPress={confirmDelete} busy={deleting} />
              </>
            ) : (
              <>
                <Text style={[S.body, { marginBottom: 14 }]}>An account lets you save favourites and get daily reminders.</Text>
                <Button label="Sign in or create an account" kind="primary" onPress={handleSignIn} />
              </>
            )}
          </View>

          {/* Support */}
          {hasTips || SUPPORTER_KEYS_ENABLED ? (
            <>
              <Text style={[S.eyebrow, styles.group]}>Support Spark Quotes</Text>
              <View style={[S.card, styles.supportCard]}>
                <Text style={S.h2}>Made by a small family business</Text>
                <Text style={[S.body, styles.help]}>
                  Spark Quotes is free, with no ads. If it brightens your day, a tip helps keep it that way.
                </Text>
                <View style={styles.chips}>
                  {LINKS.BMC_URL ? (
                    <Pressable onPress={openCoffee} accessibilityRole="button" style={({ pressed }) => [S.btn, styles.btnGold, { opacity: pressed ? 0.85 : 1 }]}>
                      <Text style={styles.btnGoldText}>Buy us a coffee</Text>
                    </Pressable>
                  ) : null}
                  {LINKS.TIP_ANY || LINKS.TIP_5 || LINKS.TIP_10 ? (
                    Platform.OS === "web" ? (
                      <>
                        {LINKS.TIP_5 ? <Button label="Tip £5" onPress={() => Linking.openURL(LINKS.TIP_5)} /> : null}
                        {LINKS.TIP_10 ? <Button label="Tip £10" onPress={() => Linking.openURL(LINKS.TIP_10)} /> : null}
                        {LINKS.TIP_ANY ? <Button label="Choose an amount" onPress={() => Linking.openURL(LINKS.TIP_ANY)} /> : null}
                      </>
                    ) : (
                      <Button label={getStripeCTA()} onPress={openTipChooser} />
                    )
                  ) : null}
                </View>

                {SUPPORTER_KEYS_ENABLED ? (
                  <View style={{ marginTop: 18 }}>
                    <View style={[styles.divider, { marginBottom: 18 }]} />
                    {isSupporter ? (
                      <View style={styles.supporter}>
                        <Text style={[S.label, { color: C.success }]}>You're a supporter. Thank you!</Text>
                        <Text style={[S.body, { marginTop: 4 }]}>It means a great deal to a small family business.</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={S.label}>Already tipped?</Text>
                        <Text style={[S.body, styles.help]}>Enter your supporter key to say hello.</Text>
                        <TextInput
                          style={[S.input, { marginBottom: 10 }]}
                          placeholder="e.g. SPARK-ABCD-1234"
                          placeholderTextColor={C.inkSoft}
                          value={code}
                          onChangeText={setCode}
                          autoCapitalize="characters"
                          aria-label="Supporter key"
                        />
                        <Button label="Redeem key" onPress={redeemKey} busy={redeeming} />
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {/* The app */}
          <Text style={[S.eyebrow, styles.group]}>The app</Text>
          <View style={S.card}>
            <Pressable onPress={shareApp} accessibilityRole="button" style={styles.row}>
              <Text style={S.label}>Share Spark Quotes</Text>
              <Ionicons name="share-outline" size={19} color={C.ink} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable onPress={openPrivacy} accessibilityRole="link" style={styles.row}>
              <Text style={S.label}>Privacy policy</Text>
              <Ionicons name="open-outline" size={18} color={C.ink} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable onPress={refreshApp} disabled={refreshing} accessibilityRole="button" style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={S.label}>{refreshing ? "Checking…" : "Check for updates"}</Text>
                <Text style={[S.body, { fontSize: 13 }]}>Fetches the latest version and reloads.</Text>
              </View>
              {refreshing ? <ActivityIndicator color={C.ink} /> : <Ionicons name="refresh" size={19} color={C.ink} />}
            </Pressable>
          </View>

          <InstallAppRow />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 14, marginBottom: 10, marginLeft: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48, gap: 12 },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 14 },
  help: { marginTop: 4, marginBottom: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btnDanger: { backgroundColor: C.dangerWash, borderWidth: 1, borderColor: "rgba(168, 66, 58, 0.35)" },
  btnDangerText: { ...S.btnGhostText, color: C.danger },
  btnGold: { backgroundColor: C.gold },
  btnGoldText: { ...S.btnGhostText, color: C.ink },
  supportCard: { backgroundColor: "#FBF3E4", borderColor: "rgba(231, 197, 140, 0.55)" },
  supporter: { padding: 14, borderRadius: 14, backgroundColor: C.successWash },
  // used by InstallAppRow
  settingCard: { ...S.card },
  sectionTitle: { ...S.label, marginBottom: 10 },
  logoutButton: { ...S.btn, ...S.btnPrimary },
  logoutButtonText: S.btnPrimaryText,
  installNote: { ...S.body },
});