// app/search.tsx
//
// Search across the quote library.
//
// The homepage JSON-LD has always advertised a SearchAction pointing at
// /?q={search_term_string}, but no search existed — so Google could surface a
// sitelinks searchbox that went nowhere. This route makes that claim true and
// gives people a way to find something among 570 quotes.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "../components/common/Ionicons";
import AppStyles from "../styles/AppStyles";
import { supabase } from "../supabaseClient";
import { shareQuote } from "../utils/shareQuote";
import { trackEvent } from "../utils/analytics";

interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
}

const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const router = useRouter();
  // Support /search?q=... so the advertised SearchAction target works
  const { q } = useLocalSearchParams<{ q?: string }>();

  const [query, setQuery] = useState(typeof q === "string" ? q : "");
  const [results, setResults] = useState<Quote[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

  // Ignore responses from earlier keystrokes that resolve late, otherwise
  // stale results can overwrite newer ones.
  const requestRef = useRef(0);

  const runSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < MIN_QUERY) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const requestId = ++requestRef.current;
    setIsSearching(true);

    // Escape PostgREST's or() delimiters so a comma or paren can't break the
    // filter expression.
    const safe = trimmed.replace(/[,()]/g, " ");

    const { data, error } = await supabase
      .schema('quotes')
      .from("approved_quotes")
      .select("id, text, author, category")
      .or(`text.ilike.%${safe}%,author.ilike.%${safe}%,category.ilike.%${safe}%`)
      .limit(50);

    if (requestId !== requestRef.current) return; // superseded

    if (error) {
      console.log("Search failed:", error);
      setResults([]);
    } else {
      setResults(data || []);
      trackEvent("Search", { term: trimmed.slice(0, 40), results: data?.length ?? 0 });
    }

    setHasSearched(true);
    setIsSearching(false);
  }, []);

  // Debounce so we aren't querying on every keystroke
  useEffect(() => {
    const handle = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, runSearch]);

  const handleShare = async (quote: Quote) => {
    if (sharingId) return;
    setSharingId(quote.id);
    try {
      await shareQuote(quote);
    } finally {
      setSharingId(null);
    }
  };

  const renderItem = ({ item }: { item: Quote }) => (
    <View style={styles.card}>
      <View style={[AppStyles.categoryBadge, { backgroundColor: "#e63946" }]}>
        <Text style={AppStyles.categoryText}>{item.category}</Text>
      </View>
      <Text style={styles.quoteText}>"{item.text}"</Text>
      <Text style={styles.authorText}>— {item.author}</Text>

      <TouchableOpacity
        onPress={() => handleShare(item)}
        disabled={sharingId === item.id}
        style={[styles.shareButton, sharingId === item.id && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel="Share this quote"
      >
        <Ionicons name="share-social" color="#FFFFFF" size={17} />
        <Text style={styles.shareButtonText}>
          {sharingId === item.id ? "Preparing…" : "Share"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const showEmpty = hasSearched && !isSearching && results.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Search quotes</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" color="#8E94AD" size={18} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Try “courage”, “Maya Angelou”, or “family”"
          placeholderTextColor="#6E7391"
          style={styles.input}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search quotes"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery("")}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" color="#6E7391" size={18} />
          </TouchableOpacity>
        )}
      </View>

      {isSearching ? (
        <ActivityIndicator color="#6672E7" style={{ marginTop: 28 }} />
      ) : showEmpty ? (
        <Text style={styles.hint}>
          Nothing matched “{query.trim()}”. Try a different word, or browse by
          topic instead.
        </Text>
      ) : results.length === 0 ? (
        <Text style={styles.hint}>
          Search across every quote by word, author, or topic.
        </Text>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.count}>
              {results.length}{results.length === 50 ? "+" : ""} result
              {results.length === 1 ? "" : "s"}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0C0A1A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: { padding: 10 },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", marginLeft: 4 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "web" ? 12 : 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  hint: {
    color: "#8E94AD",
    textAlign: "center",
    marginTop: 34,
    paddingHorizontal: 32,
    lineHeight: 21,
  },
  count: { color: "#8E94AD", fontSize: 13, marginBottom: 12 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 16,
    marginBottom: 12,
  },
  quoteText: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 25,
    fontStyle: "italic",
    marginTop: 10,
  },
  authorText: { color: "#BFC4D6", fontSize: 14, marginTop: 10 },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: "#6672E7",
  },
  shareButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
