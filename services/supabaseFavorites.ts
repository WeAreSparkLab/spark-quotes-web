// services/supabaseFavorites.ts
import { supabase } from '../supabaseClient.native';
import { Session } from '@supabase/supabase-js';

// Define the type for a favorite quote entry in your database
interface FavoriteQuoteDB {
  id: string; // The UUID of the favorite entry
  user_id: string;
  quote_id: string; // The ID of the quote itself
  created_at: string;
}

/**
 * Adds a quote to the user's favorites.
 * @param userId The ID of the current user.
 * @param quoteId The ID of the quote to favorite.
 * @returns true if successful, false otherwise.
 */
export async function addFavoriteQuote(userId: string, quoteId: string): Promise<boolean> {
  if (!userId) {
    console.warn("Cannot add favorite: User not logged in.");
    return false;
  }
  
  // Check if the quote is already favorited by the user
  const { data: existingFavorites, error: checkError } = await supabase
    .from('favorite_quotes')
    .select('id')
    .eq('user_id', userId)
    .eq('quote_id', quoteId);

  if (checkError) {
    console.error('Error checking existing favorite:', checkError.message);
    return false;
  }

  if (existingFavorites && existingFavorites.length > 0) {
    console.log('Quote already favorited by this user.');
    return true; // Consider it successful as it's already there
  }

  // Insert the new favorite quote
  const { error } = await supabase
    .from('favorite_quotes')
    .insert({ user_id: userId, quote_id: quoteId });

  if (error) {
    console.error('Error adding favorite quote:', error.message);
    return false;
  }

  console.log(`Quote ${quoteId} added to favorites for user ${userId}.`);
  return true;
}

/**
 * Removes a quote from the user's favorites.
 * @param userId The ID of the current user.
 * @param quoteId The ID of the quote to unfavorite.
 * @returns true if successful, false otherwise.
 */
export async function removeFavoriteQuote(userId: string, quoteId: string): Promise<boolean> {
  if (!userId) {
    console.warn("Cannot remove favorite: User not logged in.");
    return false;
  }

  const { error } = await supabase
    .from('favorite_quotes')
    .delete()
    .eq('user_id', userId)
    .eq('quote_id', quoteId);

  if (error) {
    console.error('Error removing favorite quote:', error.message);
    return false;
  }

  console.log(`Quote ${quoteId} removed from favorites for user ${userId}.`);
  return true;
}

/**
 * Fetches all favorite quote IDs for a given user.
 * @param userId The ID of the current user.
 * @returns An array of favorite quote IDs, or an empty array if none/error.
 */
export async function getFavoriteQuoteIds(userId: string): Promise<string[]> {
  if (!userId) {
    console.warn("Cannot get favorites: User not logged in.");
    return [];
  }

  const { data, error } = await supabase
    .from('favorite_quotes')
    .select('quote_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching favorite quote IDs:', error.message);
    return [];
  }

  return data ? data.map(item => item.quote_id) : [];
}

/**
 * Checks if a specific quote is favorited by the user.
 * @param userId The ID of the current user.
 * @param quoteId The ID of the quote to check.
 * @returns true if favorited, false otherwise.
 */
export async function isQuoteFavorited(userId: string, quoteId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const { data, error } = await supabase
    .from('favorite_quotes')
    .select('id')
    .eq('user_id', userId)
    .eq('quote_id', quoteId)
    .limit(1);

  if (error) {
    console.error('Error checking if quote is favorited:', error.message);
    return false;
  }

  return (data && data.length > 0);
}