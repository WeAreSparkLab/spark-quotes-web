// components/QuoteDisplay.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSupabase } from '../app/_layout';
import { addFavoriteQuote, removeFavoriteQuote, isQuoteFavorited } from '../services/supabaseFavorites';


interface Quote {
  id: string;
  text: string;
  author: string;
}

interface QuoteDisplayProps {
  quote: Quote;
}

export default function QuoteDisplay({ quote }: QuoteDisplayProps) {
  const { userId } = useSupabase();
  const [isFavorited, setIsFavorited] = useState(false);

  // Load initial favorite status
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (userId && quote?.id) {
        const favorited = await isQuoteFavorited(userId, quote.id);
        setIsFavorited(favorited);
      }
    };
    checkFavoriteStatus();
  }, [userId, quote?.id]);

  const handleFavoriteToggle = async () => {
    if (!userId) {
      alert('Please log in to favorite quotes!');
      return;
    }
    if (!quote || !quote.id) {
      console.warn('Cannot favorite: Quote or Quote ID is missing.');
      return;
    }

    let success;
    if (isFavorited) {
      success = await removeFavoriteQuote(userId, quote.id);
      if (success) setIsFavorited(false);
    } else {
      success = await addFavoriteQuote(userId, quote.id);
      if (success) setIsFavorited(true);
    }
    if (!success) {
      alert('Failed to update favorite status.');
    }
  };

  if (!quote) {
    return <View style={styles.container}><Text style={styles.quoteText}>Loading quote...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.quoteText}>"{quote.text}"</Text>
      <Text style={styles.authorText}>- {quote.author}</Text>

      {userId && ( // Only show favorite button if user is logged in
        <TouchableOpacity onPress={handleFavoriteToggle} style={styles.favoriteButton}>
          <Ionicons
            name={isFavorited ? "heart" : "heart-outline"}
            size={30}
            color={isFavorited ? "#E74C3C" : "#9B9B9B"} // Red for favorited, grey for not
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#222034',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 15,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  quoteText: {
    fontSize: 20,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#E0E0E0',
    marginBottom: 10,
  },
  authorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 15,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
});