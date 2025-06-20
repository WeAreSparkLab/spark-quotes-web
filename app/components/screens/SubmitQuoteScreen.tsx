// components/screens/SubmitQuoteScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from "../common/Ionicons"; 
import { supabase } from '../../supabaseClient'; 
import { allCategories } from "../../data"; 
import AppStyles from "../../styles/AppStyles";

export default function SubmitQuoteScreen() {
  const router = useRouter();
  const [quoteText, setQuoteText] = useState('');
  const [quoteAuthor, setQuoteAuthor] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(allCategories[0] || 'Good Vibes'); // Default category
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitQuote = async () => {
    if (!quoteText || !quoteAuthor) {
      setMessage('Please fill in both the quote text and author.');
      return;
    }

    setIsSubmitting(true);
    setMessage('Submitting quote...');

    try {
        const currentUser = (await supabase.auth.getSession()).data.session?.user;
        const submittedByUserId = currentUser?.id || 'anonymous'; // Get user ID from Supabase Auth

        const { data, error } = await supabase
            .from('quotes_for_review') // table name in Supabase
            .insert([
              {
                text: quoteText,
                author: quoteAuthor,
                category: selectedCategory,
                submitted_by_user_id: submittedByUserId,
                status: 'pending', // Initial status for moderation
              },
            ]);

        if (error) {
            throw error;
        }

        setMessage('Quote submitted successfully for review!');
        setQuoteText('');
        setQuoteAuthor('');
        setTimeout(() => {
            router.back();
        }, 2000);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Submit Your Quote</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <Text style={styles.label}>Quote Text:</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Enter your inspiring quote here..."
          placeholderTextColor="#CCCCCC"
          value={quoteText}
          onChangeText={setQuoteText}
        />

        <Text style={styles.label}>Author:</Text>
        <TextInput
          style={styles.input}
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
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Quote for Review'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0F1D', // Dark background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#222034',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 50,
    marginBottom: 15,
    borderColor: '#4D637D',
    borderWidth: 1,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // Align to start for better flow
    marginBottom: 15,
  },
  categoryButton: {
    backgroundColor: '#4D637D',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedCategoryButton: {
    backgroundColor: '#6672E7', // Accent color
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
    color: '#FFD700', // Warning/info color
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#6672E7',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
