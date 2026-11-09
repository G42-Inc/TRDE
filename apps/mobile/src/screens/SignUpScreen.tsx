import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useSignUp, useOAuth } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Required for OAuth to work properly
WebBrowser.maybeCompleteAuthSession();

export function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const navigation = useNavigation();

  // OAuth hooks
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });

  // Handle OAuth sign up
  const handleOAuthSignUp = useCallback(async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      const startOAuth = provider === 'google' ? startGoogleOAuth : startAppleOAuth;
      
      const { createdSessionId, setActive: oauthSetActive } = await startOAuth({
        redirectUrl: Linking.createURL('/oauth-callback'),
      });

      if (createdSessionId && oauthSetActive) {
        await oauthSetActive({ session: createdSessionId });
      }
    } catch (err: any) {
      console.error('OAuth error:', err);
      if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) {
        return;
      }
      Alert.alert('Sign Up Error', err?.errors?.[0]?.message || 'Failed to sign up with ' + provider);
    } finally {
      setLoading(false);
    }
  }, [startGoogleOAuth, startAppleOAuth]);

  // Handle email sign up
  const handleEmailSignUp = async () => {
    if (!isLoaded || !signUp) return;

    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      // Create sign up attempt
      await signUp.create({
        emailAddress: email,
        password: password || undefined, // Password might be optional
      });

      // Send verification email
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      
      setPendingVerification(true);
      Alert.alert('Check Your Email', 'We sent you a verification code');
    } catch (error: any) {
      console.error('Sign up error:', error);
      const errorMessage = error.errors?.[0]?.message || error.message || 'Failed to sign up';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle verification code submission
  const handleVerifyCode = async () => {
    if (!isLoaded || !signUp) return;

    if (!code) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        // Navigation handled by App.tsx auth check
      } else {
        Alert.alert('Error', 'Verification incomplete. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.errors?.[0]?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // Verification code screen
  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>TRDE</Text>
        <Text style={styles.subtitle}>Verify your email</Text>
        <Text style={styles.hint}>We sent a code to {email}</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Verification Code"
            placeholderTextColor="#999"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerifyCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              setPendingVerification(false);
              setCode('');
            }}
          >
            <Text style={styles.linkText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TRDE</Text>
      <Text style={styles.subtitle}>Create your account</Text>

      <View style={styles.form}>
        {/* OAuth Buttons */}
        <TouchableOpacity
          style={[styles.oauthButton, styles.googleButton, loading && styles.buttonDisabled]}
          onPress={() => handleOAuthSignUp('google')}
          disabled={loading}
        >
          <Text style={styles.oauthButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.oauthButton, styles.appleButton, loading && styles.buttonDisabled]}
          onPress={() => handleOAuthSignUp('apple')}
          disabled={loading}
        >
          <Text style={[styles.oauthButtonText, styles.appleButtonText]}>Continue with Apple</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email Input */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        {/* Password Input */}
        <TextInput
          style={styles.input}
          placeholder="Password (optional)"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleEmailSignUp}
          disabled={loading || !isLoaded}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('SignIn' as never)}
        >
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  oauthButton: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  oauthButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  appleButtonText: {
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 14,
  },
});
