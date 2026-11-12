// components/screens/SubmitQuoteScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import PageHeader from '../common/PageHeader';
import { C, F, S } from '../../styles/theme';
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


  const ok = message.startsWith('Quote submitted');
  const pending = message === 'Submitting quote...';

  return (
    <SafeAreaView style={S.page}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <PageHeader
          title="Share a quote"
          subtitle="Know one that lifts you? Send it in. Every quote is read by a person before it appears in the app."
          onBack={handleGoBack}
        />

        <View style={S.column}>
          {!isLoggedIn && (
            <View style={[S.card, styles.notice]}>
              <Text style={S.body}>
                You'll need to be signed in to send a quote.{' '}
                <Text onPress={() => router.push('/auth')} style={S.link} accessibilityRole="link">Sign in</Text>
              </Text>
            </View>
          )}

          <View style={S.card}>
            <Text style={[S.label, styles.label]} nativeID="q-text">The quote</Text>
            <TextInput
              style={[S.input, styles.multiline]}
              multiline
              maxLength={500}
              placeholder="Type it exactly as it was said"
              placeholderTextColor={C.inkSoft}
              value={quoteText}
              onChangeText={setQuoteText}
              accessibilityLabelledBy="q-text"
              aria-label="The quote"
            />
            <Text style={styles.count}>{quoteText.length}/500</Text>

            <Text style={[S.label, styles.label]} nativeID="q-author">Who said it?</Text>
            <TextInput
              style={S.input}
              maxLength={120}
              placeholder="Their name, or Anonymous if you're not sure"
              placeholderTextColor={C.inkSoft}
              value={quoteAuthor}
              onChangeText={setQuoteAuthor}
              accessibilityLabelledBy="q-author"
              aria-label="Who said it?"
            />
            <Text style={[S.body, styles.hint]}>Please only credit someone if you're confident they said it.</Text>

            <Text style={[S.label, styles.label]}>Topic</Text>
            <View style={styles.chips} role="radiogroup" aria-label="Topic">
              {allCategories.map((cat) => {
                const on = selectedCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    role="radio"
                    aria-checked={on}
                    onPress={() => setSelectedCategory(cat)}
                    style={({ pressed }) => [S.chip, on && S.chipOn, { opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Text style={[S.chipText, on && S.chipTextOn]}>{cat}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {message && !pending ? (
            <Text accessibilityRole="alert" style={[S.body, styles.message, { color: ok ? C.success : C.danger }]}>{message}</Text>
          ) : null}

          <Pressable
            onPress={handleSubmitQuote}
            disabled={isSubmitting}
            accessibilityRole="button"
            style={({ pressed }) => [S.btn, S.btnPrimary, { opacity: isSubmitting ? 0.7 : pressed ? 0.85 : 1 }]}
          >
            {isSubmitting ? <ActivityIndicator color={C.onAccent} /> : <Text style={S.btnPrimaryText}>Send for review</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: C.accentWash, borderColor: 'transparent' },
  label: { marginBottom: 8, marginTop: 14 },
  multiline: { minHeight: 110, textAlignVertical: 'top', fontFamily: F.serif, fontSize: 18, lineHeight: 25 },
  count: { fontFamily: F.sans, fontSize: 12, color: C.inkSoft, alignSelf: 'flex-end', marginTop: 6 },
  hint: { fontSize: 13, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  message: { textAlign: 'center', marginBottom: 12, fontWeight: '600' },
});