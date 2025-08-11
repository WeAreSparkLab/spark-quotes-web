// components/screens/SubmitQuoteScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
// FIX: Import the more powerful SafeAreaView from this library to fix layout issues
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "../../components/common/Ionicons";
import { supabase } from '../../supabaseClient';
import { allCategories } from "../../data/data";

export default function SubmitQuoteScreen() {
  const router = useRouter();
  const [quoteText, setQuoteText] = useState('');
  const [quoteAuthor, setQuoteAuthor] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(allCategories[0] || 'Good Vibes');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleSubmitQuote = async () => {
    if (!quoteText || !quoteAuthor) {
      setMessage('Please fill in both the quote text and author.');
      return;
    }

    setIsSubmitting(true);
    setMessage('Submitting quote...');

    try {
      const currentUser = (await supabase.auth.getSession()).data.session?.user;
      const submittedByUserId = currentUser?.id || 'anonymous';

      const { error } = await supabase
        .from('quotes_for_review')
        .insert([
          {
            text: quoteText,
            author: quoteAuthor,
            category: selectedCategory,
            submitted_by_user_id: submittedByUserId,
            status: 'pending',
          },
        ]);

      if (error) {
        throw error;
      }

      setMessage('Quote submitted successfully for review!');
      setQuoteText('');
      setQuoteAuthor('');
      setTimeout(handleGoBack, 2000);

    } catch (error: any) {
      console.error("Error submitting quote:", error);
      setMessage(`Failed to submit quote: ${error.message || error.toString()}`);
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
    paddingTop: 20, // Reduced padding
    paddingBottom: 10, // Reduced padding
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 22, // Slightly smaller title
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  formContainer: {
    paddingHorizontal: 20, // Keep horizontal padding
    paddingBottom: 20, // Add some bottom padding
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 6, // Reduced margin
    marginTop: 12, // Reduced margin
  },
  input: {
    backgroundColor: '#222034',
    borderRadius: 8,
    padding: 12, // Reduced padding
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 40, // Set a base min height
    marginBottom: 12, // Reduced margin
    borderColor: '#4D637D',
    borderWidth: 1,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 12, // Reduced margin
  },
  categoryButton: {
    backgroundColor: '#4D637D',
    borderRadius: 8, // Slightly smaller radius
    paddingVertical: 8, // Reduced padding
    paddingHorizontal: 12, // Reduced padding
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
    marginTop: 8, // Reduced margin
    marginBottom: 8, // Reduced margin
  },
  submitButton: {
    backgroundColor: '#6672E7',
    borderRadius: 10, // Slightly smaller radius
    padding: 12, // Reduced padding
    alignItems: 'center',
    marginTop: 15, // Reduced margin
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16, // Slightly smaller text
    fontWeight: 'bold',
  },
});
