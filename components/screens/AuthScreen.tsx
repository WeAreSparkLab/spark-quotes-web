// app/AuthScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator
} from 'react-native';
import { supabase } from '../../supabaseClient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ensureProfile } from '../../utils/ensureProfile';
import PasswordInput from '../common/PasswordInput';
import { C, S } from '../../styles/theme';

// Same production domain used throughout the app (see utils/shareApp.ts,
// utils/shareQuote.ts). Supabase needs this exact URL allow-listed under
// Auth > URL Configuration > Redirect URLs, or the email link will bounce.
const RESET_PASSWORD_REDIRECT_URL = 'https://quotes.wearesparklab.com/reset-password';
// Where the "confirm your email" link lands. Must also be allow-listed in
// Supabase (Auth > URL Configuration > Redirect URLs), or Supabase ignores it.
const SIGNUP_REDIRECT_URL = 'https://quotes.wearesparklab.com/';

export default function AuthScreen() {
  const router = useRouter();
  const { forgot } = useLocalSearchParams<{ forgot?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  // Arriving from the reset-password screen's "request a new link" button
  // (/auth?forgot=1) opens straight into the forgot-password form.
  const [showForgotPassword, setShowForgotPassword] = useState(forgot === '1');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleAuth = async () => {
    setLoading(true);
    setMessage('');

    // Validate password length
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        const userId = data.user?.id;
        if (userId) await ensureProfile(supabase, userId);

        setMessage('Signed in successfully!');
        router.replace('/');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          // Without this, the confirmation link falls back to the Supabase
          // project's Site URL, which is shared with the SparkLab site, so
          // new users were landing on SparkLab after confirming.
          options: { emailRedirectTo: SIGNUP_REDIRECT_URL },
        });
        if (error) throw error;

        const userId = data.user?.id;
        if (userId) await ensureProfile(supabase, userId);

        setMessage('Signed up successfully! Please check your email to confirm your account.');
      }
    } catch (error: any) {
      setMessage(error.message || 'An unexpected error occurred. Please try again.');
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      handleAuth();
    }
  };

  const handleResetPassword = async () => {
    setResetLoading(true);
    setResetMessage('');
    try {
      await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: RESET_PASSWORD_REDIRECT_URL,
      });
    } catch (error) {
      // Swallowed on purpose — see the message below.
      console.error('Reset password error:', error);
    } finally {
      // Same message whether the email exists, the send failed, or
      // anything else, so this can't be used to check which emails are
      // registered.
      setResetMessage('If that email has an account, a reset link has been sent.');
      setResetLoading(false);
    }
  };

  const handleResetKeyPress = (e: any) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      handleResetPassword();
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const BackLink = () => (
    <TouchableOpacity onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text style={styles.backText}>{'←'}  Back</Text>
    </TouchableOpacity>
  );

  if (showForgotPassword) {
    return (
      <SafeAreaView style={styles.container}>
        <BackLink />
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a link to reset it.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={C.inkSoft}
            keyboardType="email-address"
            autoCapitalize="none"
            value={resetEmail}
            onChangeText={setResetEmail}
            onKeyPress={handleResetKeyPress}
          />

          {!!resetMessage && <Text style={styles.message}>{resetMessage}</Text>}

          <TouchableOpacity
            style={styles.authButton}
            onPress={handleResetPassword}
            disabled={resetLoading}
          >
            {resetLoading ? (
              <ActivityIndicator color={C.onAccent} />
            ) : (
              <Text style={styles.authButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => {
              setShowForgotPassword(false);
              setResetMessage('');
              setResetEmail('');
            }}
            disabled={resetLoading}
          >
            <Text style={styles.toggleButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackLink />
      <View style={styles.header}>
        <Text style={styles.title}>{isLogin ? 'Welcome Back!' : 'Join Spark Quotes'}</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Sign in to continue' : 'Sign up to get started'}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={C.inkSoft}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          onKeyPress={handleKeyPress}
        />
        <PasswordInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={C.inkSoft}
          value={password}
          onChangeText={setPassword}
          onKeyPress={handleKeyPress}
        />

        {isLogin && (
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => { setShowForgotPassword(true); setMessage(''); }}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        {!!message && <Text style={styles.message}>{message}</Text>}

        <TouchableOpacity
          style={styles.authButton}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={C.onAccent} />
          ) : (
            <Text style={styles.authButtonText}>
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => { setIsLogin(!isLogin); setMessage(''); }}
          disabled={loading}
        >
          <Text style={styles.toggleButtonText}>
            {isLogin
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    marginBottom: 28,
    alignItems: 'center',
    maxWidth: 400,
  },
  title: { ...S.h1, fontSize: 34, lineHeight: 40, textAlign: 'center', marginBottom: 8 },
  subtitle: { ...S.body, fontSize: 15.5, textAlign: 'center' },
  formContainer: {
    ...S.card,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 22,
  },
  input: { ...S.input, marginBottom: 14 },
  message: { ...S.body, color: C.ink, textAlign: 'center', marginBottom: 14, fontWeight: '600' },
  forgotPasswordButton: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 14, paddingVertical: 4 },
  forgotPasswordText: { ...S.link, fontSize: 13.5 },
  authButton: { ...S.btn, ...S.btnPrimary, marginTop: 6 },
  authButtonText: S.btnPrimaryText,
  toggleButton: { marginTop: 18, alignItems: 'center', paddingVertical: 6 },
  toggleButtonText: S.link,
  back: { position: 'absolute', top: 24, left: 20, paddingVertical: 6 },
  backText: { ...S.label, fontSize: 14.5 },
});