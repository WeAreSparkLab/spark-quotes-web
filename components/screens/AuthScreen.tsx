// app/AuthScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator
} from 'react-native';
import { supabase } from '../../supabaseClient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ensureProfile } from '../../utils/ensureProfile';

// Same production domain used throughout the app (see utils/shareApp.ts,
// utils/shareQuote.ts). Supabase needs this exact URL allow-listed under
// Auth > URL Configuration > Redirect URLs, or the email link will bounce.
const RESET_PASSWORD_REDIRECT_URL = 'https://quotes.wearesparklab.com/reset-password';

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

  if (showForgotPassword) {
    return (
      <SafeAreaView style={styles.container}>
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
            placeholderTextColor="#B0B0B0"
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
              <ActivityIndicator color="#FFFFFF" />
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
          placeholderTextColor="#B0B0B0"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          onKeyPress={handleKeyPress}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor="#B0B0B0"
          secureTextEntry
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
            <ActivityIndicator color="#FFFFFF" />
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
    backgroundColor: '#0E0F1D', 
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#222034',
    borderRadius: 15,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  input: {
    backgroundColor: '#333045',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 15,
    borderColor: '#4D637D',
    borderWidth: 1,
  },
  message: {
    fontSize: 14,
    color: '#FFD700', // Warning/info color
    textAlign: 'center',
    marginBottom: 15,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 15,
  },
  forgotPasswordText: {
    color: '#6672E7', // Accent color
    fontSize: 13,
    fontWeight: '600',
  },
  authButton: {
    backgroundColor: '#6672E7', // Accent color
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#6672E7', // Accent color
    fontSize: 14,
    fontWeight: '600',
  },
});
