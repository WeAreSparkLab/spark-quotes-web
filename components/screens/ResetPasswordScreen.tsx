// components/screens/ResetPasswordScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator
} from 'react-native';
import { supabase } from '../../supabaseClient';
import { useRouter } from 'expo-router';
import PasswordInput from '../common/PasswordInput';

type Phase = 'checking' | 'ready' | 'invalid' | 'success';

/**
 * Supabase's password-reset email links back here with the recovery session
 * encoded in the URL hash (this project uses the default implicit flow, not
 * PKCE): `#access_token=...&type=recovery` on success, or
 * `#error=...&error_code=otp_expired&error_description=...` when the link is
 * expired or has already been used.
 *
 * Only the error case is safe to read ourselves. On success, supabase-js's
 * own client-side init starts parsing this same hash the moment the page
 * loads — well before React mounts anything — and *deletes* it from the URL
 * once it succeeds. If our code re-checks the hash after that already
 * happened, there's nothing left to find, and a perfectly valid link would
 * get wrongly reported as invalid. So this only ever checks for the error
 * shape, which supabase-js leaves untouched; the success case is detected
 * separately, from supabase-js itself (see the effect below).
 */
function readRecoveryErrorFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash || window.location.search);

  if (params.get('error') || params.get('error_code')) {
    const description = params.get('error_description');
    return description ? description.replace(/\+/g, ' ') : 'This reset link is no longer valid.';
  }

  return null;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // A genuinely expired/used link is the one case supabase-js leaves for
    // us to detect ourselves (see readRecoveryErrorFromUrl for why).
    const urlError = readRecoveryErrorFromUrl();
    if (urlError) {
      setPhase('invalid');
      setErrorMessage(urlError);
      return;
    }

    // No error in the URL: this is either a fresh, valid recovery link —
    // whose token supabase-js may already have consumed and stripped from
    // the hash by the time we get here, which is expected, not a problem —
    // or the page was reached with no recovery link at all. Either way we
    // wait for supabase-js's own signal rather than re-deciding from the
    // URL ourselves: catch the PASSWORD_RECOVERY event if it hasn't fired
    // yet, and also check directly for a session it may have already
    // established before we finished subscribing (the session is saved
    // synchronously, ahead of the event, which fires a tick later).
    let settled = false;
    const finish = (next: Phase, err?: string) => {
      if (settled) return;
      settled = true;
      if (err) setErrorMessage(err);
      setPhase(next);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') finish('ready');
    });

    // Trade-off: someone already logged in who lands on this URL directly
    // (no recovery link at all) will also see the "set a new password"
    // form, since their existing session passes this same check. That's a
    // harmless UX quirk, not a security issue — updateUser() still only
    // ever changes the password of whoever this session actually belongs
    // to — and it's the price of no longer needing our own racy read of
    // the token supabase-js may have already consumed.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish('ready');
    });

    // Neither the event nor an existing session showed up — genuinely no
    // recovery link was ever presented here.
    const fallback = setTimeout(() => {
      finish('invalid', 'This reset link has expired or already been used.');
    }, 2500);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'success') return;
    const t = setTimeout(() => router.replace('/auth'), 2000);
    return () => clearTimeout(t);
  }, [phase, router]);

  const handleUpdatePassword = async () => {
    setMessage('');

    if (newPassword.length < 8) {
      setMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // The recovery link leaves the browser signed in as this user. Sign
      // out so "redirect to login" actually lands on a login form instead
      // of a still-authenticated session.
      await supabase.auth.signOut();
      setPhase('success');
    } catch (error: any) {
      setMessage(error.message || 'Could not update your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      handleUpdatePassword();
    }
  };

  if (phase === 'checking') {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#6672E7" size="large" />
      </SafeAreaView>
    );
  }

  if (phase === 'invalid') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Link Expired</Text>
          <Text style={styles.subtitle}>{errorMessage}</Text>
        </View>

        <View style={styles.formContainer}>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.replace('/auth?forgot=1')}
          >
            <Text style={styles.authButtonText}>Request a New Link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => router.replace('/auth')}
          >
            <Text style={styles.toggleButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Password Updated</Text>
          <Text style={styles.subtitle}>Taking you to sign in...</Text>
        </View>
        <ActivityIndicator color="#6672E7" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose a New Password</Text>
        <Text style={styles.subtitle}>Enter and confirm your new password below.</Text>
      </View>

      <View style={styles.formContainer}>
        <PasswordInput
          style={styles.input}
          placeholder="New password (min 8 characters)"
          placeholderTextColor="#B0B0B0"
          value={newPassword}
          onChangeText={setNewPassword}
          onKeyPress={handleKeyPress}
        />
        <PasswordInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor="#B0B0B0"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onKeyPress={handleKeyPress}
        />

        {!!message && <Text style={styles.message}>{message}</Text>}

        <TouchableOpacity
          style={styles.authButton}
          onPress={handleUpdatePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.authButtonText}>Update Password</Text>
          )}
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
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
