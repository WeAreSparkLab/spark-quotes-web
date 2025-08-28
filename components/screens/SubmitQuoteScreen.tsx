// components/screens/SubmitQuoteScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabaseClient';
import { allCategories } from "../../data/data";

export default function SubmitQuoteScreen() {
  const router = useRouter();
  const [quoteText, setQuoteText] = useState('');
  const [quoteAuthor, setQuoteAuthor] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(allCategories[0] || 'Good Vibes');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) setIsLoggedIn(!!session?.user);
    })();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleSubmitQuote = async () => {
    const text = quoteText.trim();
    const author = quoteAuthor.trim();

    if (!text || !author) {
      setMessage('Please fill in both the quote text and author.');
      return;
    }

    setIsSubmitting(true);
    setMessage('Submitting quote...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsSubmitting(false);
        Alert.alert(
          'Sign in required',
          'You need an account to submit a quote.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In / Create Account', onPress: () => router.push('/auth') }
          ]
        )
        return;
      }

      const { data, error } = await supabase.functions.invoke('submit-quote', {
        body: {
          text: text.slice(0, 500),
          author: author.slice(0, 120),
          category: selectedCategory,
        },
      });

      if (error || data?.error) {
        const msg = error?.message || data?.error || 'Failed to submit quote.';
        if (msg.includes('Too many')) {
          setMessage('Too many submissions. Please try again in about 10 minutes.');
        } else {
          setMessage(`Failed to submit quote: ${msg}`);
        }
        return;
      }

      setMessage('Quote submitted successfully for review!');
      setQuoteText('');
      setQuoteAuthor('');
      setTimeout(handleGoBack, 1500);
    } catch (err: any) {
      const msg = err?.message || String(err);
      setMessage(
        msg.includes('429') || msg.includes('Too many')
          ? 'Too many submissions. Please try again in about 10 minutes.'
          : `Failed to submit quote: ${msg}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={{ color: '#FFFFFF' }}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Submit Your Quote</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        {!isLoggedIn && (
          <Text style={styles.bannerText}>
            You’re not signed in.{' '}
            <Text onPress={() => router.push('/auth')} style={styles.bannerLink}>
              Sign in to submit
            </Text>
            .
          </Text>
        )}

        <Text style={styles.label}>Quote Text:</Text>
        <TextInput
          style={[styles.input, { minHeight: 100 }]} // Taller input for the quote
          multiline
          placeholder="Enter your inspiring quote here..."
          placeholderTextColor="#CCCCCC"
          value={quoteText}
          onChangeText={setQuoteText}
        />

        <Text style={styles.label}>Author:</Text>
        <TextInput
          style={styles.input} // Standard height for the author
          placeholder="Who said it? (e.g., Anonymous)"
          placeholderTextColor="#CCCCCC"
          value={quoteAuthor}
          onChangeText={setQuoteAuthor}
        />

        <Text style={styles.label}>Category:</Text>
        <View style={styles.categoryPicker}>
          {allCategories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                selectedCategory === cat && styles.selectedCategoryButton,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === cat && styles.selectedCategoryButtonText,
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitQuote}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              Submit Quote for Review
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0F1D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20, 
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  formContainer: {
    paddingHorizontal: 20, 
    paddingBottom: 20,
  },
  bannerText: { 
    color: '#FFD700', 
    textAlign: 'center', 
    marginBottom: 10 
  },
  bannerLink: { 
    color: '#8EA0FF', 
    textDecorationLine: 'underline' 
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#E0E0E0', 
    marginBottom: 6, 
    marginTop: 12 
  },
  input: {
    backgroundColor: '#222034',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 40,
    marginBottom: 12,
    borderColor: '#4D637D',
    borderWidth: 1,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  categoryButton: {
    backgroundColor: '#4D637D',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedCategoryButton: {
    backgroundColor: '#6672E7',
    borderColor: '#6672E7',
  },
  categoryButtonText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCategoryButtonText: {
    color: '#FFFFFF',
  },
  message: {
    fontSize: 14,
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: '#6672E7',
    borderRadius: 10, 
    padding: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16, 
    fontWeight: 'bold',
  },
});
