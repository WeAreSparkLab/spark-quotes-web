// app/favorites.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "../components/common/Ionicons";
import PageHeader from "../components/common/PageHeader";
import { C, F, S } from "../styles/theme";
import { useSupabase } from "./_layout";
import { getFavoriteQuoteIds, removeFavoriteQuote } from "../services/supabaseFavorites";
import { shareQuote } from "../utils/shareQuote";
import { supabase } from "../supabaseClient";


// Re-use the Quote interface for consistency
interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { userId, session } = useSupabase(); // Get userId and session
  const [favoriteQuotes, setFavoriteQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchFavoriteQuotes = useCallback(async () => {
    if (!userId) {
      setError("Please log in to view your favorite quotes.");
      setFavoriteQuotes([]); // Clear previous favorites if logged out
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Get the IDs of favorite quotes for the current user
      const favoriteIds = await getFavoriteQuoteIds(userId);

      if (favoriteIds.length === 0) {
        setFavoriteQuotes([]);
        return;
      }

      // 2. Fetch the full quote details from the 'approved_quotes' table
      const { data, error: fetchError } = await supabase
        .schema('quotes')
        .from("approved_quotes")
        .select("id, text, author, category")
        .in("id", favoriteIds); // Filter by the favorite IDs

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setFavoriteQuotes(data || []);
    } catch (e: any) {
      console.error("Error fetching favorite quotes:", e.message);
      setError("Failed to load favorite quotes. " + e.message);
      setFavoriteQuotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]); // Re-run if userId changes

  // Use useFocusEffect to refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchFavoriteQuotes();
    }, [fetchFavoriteQuotes])
  );

  // Favourites are the quotes someone already told us they like, so this is
  // the best place to offer sharing — not just the home screen.
  const handleShare = async (quote: Quote) => {
    if (sharingId) return;
    setSharingId(quote.id);
    try {
      await shareQuote(quote);
    } finally {
      setSharingId(null);
    }
  };

  const handleRemove = async (quote: Quote) => {
    if (!userId || removingId) return;
    setRemovingId(quote.id);

    // Optimistic: the row disappears immediately, and comes back if the
    // delete fails, rather than leaving the list looking stale.
    const previous = favoriteQuotes;
    setFavoriteQuotes((current) => current.filter((q) => q.id !== quote.id));

    const ok = await removeFavoriteQuote(userId, quote.id);
    if (!ok) {
      setFavoriteQuotes(previous);
      alert("Could not remove that favourite. Please try again.");
    }
    setRemovingId(null);
  };

  const anon = (a: string) => /^(anonymous|unknown)$/i.test(a.trim());

  const renderQuoteItem = ({ item }: { item: Quote }) => (
    <View style={S.column}>
    <View style={[S.card, styles.card]}>
      <Text style={S.eyebrow}>{item.category}</Text>
      <Text style={styles.quote}>{"“"}{item.text}{"”"}</Text>
      <Text style={styles.author}>{anon(item.author) ? "Author unknown" : item.author}</Text>

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
    </View>
    </View>
  );

  const count = favoriteQuotes.length;

  return (
    <SafeAreaView style={S.page}>
      <FlatList
        data={isLoading || error ? [] : favoriteQuotes}
        renderItem={renderQuoteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <PageHeader
            title="Your favourites"
            subtitle={!userId || isLoading || error ? undefined : count === 0 ? undefined : `${count} saved ${count === 1 ? "quote" : "quotes"}`}
          />
        }
        ListEmptyComponent={
          <View style={S.column}>
            {isLoading ? (
              <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 40 }} />
            ) : !userId ? (
              <View style={[S.card, styles.empty]}>
                <Text style={S.h2}>Keep the ones that land</Text>
                <Text style={[S.body, styles.emptyBody]}>Sign in to save quotes and find them here whenever you need them.</Text>
                <Pressable onPress={() => router.push("/auth")} accessibilityRole="button" style={({ pressed }) => [S.btn, S.btnPrimary, { opacity: pressed ? 0.8 : 1 }]}>
                  <Text style={S.btnPrimaryText}>Sign in or create an account</Text>
                </Pressable>
              </View>
            ) : error ? (
              <Text accessibilityRole="alert" style={[S.body, { color: C.danger }]}>{error}</Text>
            ) : (
              <View style={[S.card, styles.empty]}>
                <Text style={S.h2}>Nothing saved yet</Text>
                <Text style={[S.body, styles.emptyBody]}>Tap Save on any quote and it will wait for you here.</Text>
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
});