import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useSignIn, useOAuth } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, G, Defs, ClipPath, Rect } from 'react-native-svg';
import { colors, typography, spacing, borderRadius, shadows } from '../design/theme';
import { lightHaptic, mediumHaptic } from '../lib/haptics';

// Required for OAuth to work properly
WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

// Google Logo SVG
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

// Apple Logo SVG
function AppleLogo({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </Svg>
  );
}

export function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const navigation = useNavigation();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // OAuth hooks for different providers
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });

  // Handle OAuth sign in
  const handleOAuthSignIn = useCallback(async (provider: 'google' | 'apple') => {
    try {
      lightHaptic();
      setLoading(true);
      const startOAuth = provider === 'google' ? startGoogleOAuth : startAppleOAuth;
      
      const { createdSessionId, setActive: oauthSetActive } = await startOAuth({
        redirectUrl: Linking.createURL('/oauth-callback'),
      });

      if (createdSessionId && oauthSetActive) {
        mediumHaptic();
        await oauthSetActive({ session: createdSessionId });
      }
    } catch (err: any) {
      console.error('OAuth error:', err);
      if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) {
        return;
      }
      Alert.alert('Sign In Error', err?.errors?.[0]?.message || 'Failed to sign in with ' + provider);
    } finally {
      setLoading(false);
    }
  }, [startGoogleOAuth, startAppleOAuth]);

  // Handle email/password sign in
  const handleEmailSignIn = async () => {
    if (!isLoaded || !signIn) return;

    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    lightHaptic();
    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email,
      });

      const firstFactor = result.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'password' || 
                    factor.strategy === 'email_code' ||
                    factor.strategy === 'email_link'
      );

      if (!firstFactor) {
        Alert.alert('Error', 'No supported sign-in method available. Please try OAuth.');
        return;
      }

      if (firstFactor.strategy === 'password') {
        if (!password) {
          setShowPassword(true);
          Alert.alert('Password Required', 'Please enter your password');
          setLoading(false);
          return;
        }

        const completeResult = await signIn.attemptFirstFactor({
          strategy: 'password',
          password,
        });

        if (completeResult.status === 'complete') {
          mediumHaptic();
          await setActive({ session: completeResult.createdSessionId });
        } else {
          Alert.alert('Error', 'Sign in incomplete. Please try again.');
        }
      } else if (firstFactor.strategy === 'email_code') {
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: firstFactor.emailAddressId,
        });
        setPendingVerification(true);
        Alert.alert('Check Your Email', 'We sent you a verification code');
      } else if (firstFactor.strategy === 'email_link') {
        await signIn.prepareFirstFactor({
          strategy: 'email_link',
          emailAddressId: firstFactor.emailAddressId,
          redirectUrl: Linking.createURL('/sign-in-callback'),
        });
        Alert.alert('Check Your Email', 'We sent you a sign-in link');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      const errorMessage = error.errors?.[0]?.message || error.message || 'Failed to sign in';
      
      if (errorMessage.includes('password')) {
        setShowPassword(true);
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle verification code submission
  const handleVerifyCode = async () => {
    if (!isLoaded || !signIn) return;

    if (!code) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    lightHaptic();
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      });

      if (result.status === 'complete') {
        mediumHaptic();
        await setActive({ session: result.createdSessionId });
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
        <LinearGradient
          colors={['#000000', '#0A0A0A', '#111111']}
          style={StyleSheet.absoluteFill}
        />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoMark}>
              <Text style={styles.logoLetter}>T</Text>
            </View>
            <Text style={styles.logoText}>TRDE</Text>
          </View>

          <Text style={styles.title}>Enter verification code</Text>
          <Text style={styles.subtitle}>We sent a code to {email}</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Verification Code"
                placeholderTextColor={colors.dark.textTertiary}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.accent.main, colors.accent.dark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                lightHaptic();
                setPendingVerification(false);
                setCode('');
              }}
            >
              <Text style={styles.linkText}>Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0A0A0A', '#111111']}
        style={StyleSheet.absoluteFill}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Animated.View 
          style={[
            styles.logoContainer,
            { 
              opacity: fadeAnim,
              transform: [{ scale: logoScale }]
            }
          ]}
        >
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>T</Text>
          </View>
          <Text style={styles.logoText}>TRDE</Text>
          <Text style={styles.tagline}>Trade smarter. Journal better.</Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.form,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* OAuth Buttons */}
          <TouchableOpacity
            style={[styles.oauthButton, loading && styles.buttonDisabled]}
            onPress={() => handleOAuthSignIn('google')}
            disabled={loading}
            activeOpacity={0.8}
          >
            <GoogleLogo size={20} />
            <Text style={styles.oauthButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.oauthButton, styles.appleButton, loading && styles.buttonDisabled]}
            onPress={() => handleOAuthSignIn('apple')}
            disabled={loading}
            activeOpacity={0.8}
          >
            <AppleLogo size={20} color="#FFFFFF" />
            <Text style={[styles.oauthButtonText, styles.appleButtonText]}>Continue with Apple</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.dark.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Password Input */}
          {showPassword && (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.dark.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleEmailSignIn}
            disabled={loading || !isLoaded}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.accent.main, colors.accent.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {showPassword ? 'Sign In' : 'Continue'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              lightHaptic();
              navigation.navigate('SignUp' as never);
            }}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkTextHighlight}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.accent.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  logoLetter: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -1,
  },
  logoText: {
    ...typography.h1,
    color: colors.dark.text,
    letterSpacing: 4,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.bodySmall,
    color: colors.dark.textTertiary,
    letterSpacing: 0.5,
  },
  title: {
    ...typography.h2,
    color: colors.dark.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.dark.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 360,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  input: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    backgroundColor: colors.dark.surface,
    color: colors.dark.text,
  },
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
    ...shadows.md,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  oauthButton: {
    width: '100%',
    height: 56,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.surface,
    gap: spacing.sm,
  },
  appleButton: {
    backgroundColor: colors.dark.text,
    borderColor: colors.dark.text,
  },
  oauthButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.text,
  },
  appleButtonText: {
    color: '#000',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.dark.border,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    color: colors.dark.textTertiary,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  linkButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  linkText: {
    color: colors.dark.textSecondary,
    fontSize: 14,
  },
  linkTextHighlight: {
    color: colors.accent.main,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  footerText: {
    ...typography.caption,
    color: colors.dark.textTertiary,
    textAlign: 'center',
  },
});
