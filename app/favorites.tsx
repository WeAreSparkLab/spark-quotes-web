// app/favorites.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "../components/common/Ionicons";
import AppStyles from "../styles/AppStyles";
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

  const renderQuoteItem = ({ item }: { item: Quote }) => (
    <View style={styles.quoteCard}>
      <View style={[AppStyles.categoryBadge, { backgroundColor: "#e63946" }]}>
        <Text style={AppStyles.categoryText}>{item.category}</Text>
      </View>
      <Text style={styles.quoteText}>"{item.text}"</Text>
      <Text style={styles.authorText}>- {item.author}</Text>

      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => handleShare(item)}
          disabled={sharingId === item.id}
          style={[styles.shareButton, sharingId === item.id && styles.buttonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Share this quote"
        >
          <Ionicons name="share-social" color="#FFFFFF" size={18} />
          <Text style={styles.shareButtonText}>
            {sharingId === item.id ? "Preparing…" : "Share"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleRemove(item)}
          disabled={removingId === item.id}
          style={[styles.removeButton, removingId === item.id && styles.buttonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Remove from favourites"
        >
          <Ionicons name="heart-dislike-outline" color="#E0A0A5" size={18} />
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.sceneContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" color="#FFFFFF" size={24} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.sceneTitle}>Favorite Quotes</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : favoriteQuotes.length === 0 ? (
          <Text style={styles.emptyText}>
            No favorite quotes yet! Tap the heart icon on your daily quotes to
            save them.
          </Text>
        ) : (
          <FlatList
            data={favoriteQuotes}
            renderItem={renderQuoteItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.flatListContent}
          />
        )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: "#0C0A1A",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0C0A1A',
    justifyContent: 'flex-start',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 24,
  },
  sceneTitle: {
    ...AppStyles.title,
    color: "#FFFFFF",
    textShadowColor: "rgba(96, 116, 245, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginLeft: 16,
  },
  backButton: {
    padding: 10,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#E63946",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: "#D0D0D0",
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    paddingHorizontal: 20,
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    // Was 60 each side, which left cards too narrow for the action buttons
    // on a phone.
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#6672E7",
  },
  shareButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  removeButtonText: { color: "#E0A0A5", fontWeight: "700", fontSize: 14 },
  buttonDisabled: { opacity: 0.6 },
  quoteCard: {
    backgroundColor: "rgba(12, 10, 26, 0.8)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
  },
  quoteText: {
    fontSize: 18,
    fontStyle: "italic",
    textAlign: "center",
    color: "#E0E0E0",
    marginBottom: 8,
  },
  authorText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#B0B0B0",
    textAlign: "center",
  },
});
