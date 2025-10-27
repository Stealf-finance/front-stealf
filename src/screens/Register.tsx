import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { API_URL } from '../config/config';
import { useAuth } from '../contexts/AuthContext';
import { authStorage } from '../services/authStorage';
import { GridClient } from '@sqds/grid/native';
import * as SecureStore from 'expo-secure-store';

interface RegisterScreenProps {
  onBack?: () => void;
  onSuccess?: (userData: any) => void;
  onSwitchToLogin?: () => void;
}

export default function RegisterScreen({ onBack, onSuccess, onSwitchToLogin }: RegisterScreenProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [showLogoAnimation, setShowLogoAnimation] = useState(false);
  const logoAnimation = useRef(new Animated.Value(0)).current;
  const blurAnimation = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showOtpInput && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpInput, timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitEmail = async () => {
    setError('');
    setIsLoading(true);

    try {
      const url = `${API_URL}/grid/accounts`;
      console.log('Calling API:', url);
      console.log('Request body:', { email });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        console.log('❌ Request failed:', JSON.stringify(data, null, 2));

        let errorMessage = 'An error occurred';

        // Gestion des erreurs GRID SDK
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
          const errorDetail = data.details[0];

          // Cas spécifique: compte déjà existant
          if (errorDetail.code === 'grid_account_already_exists_for_user') {
            errorMessage = 'This email is already registered. Please use the Login option instead.';
          } else if (errorDetail.suggestion) {
            errorMessage = errorDetail.message;
          } else {
            errorMessage = errorDetail.message || 'Validation error occurred';
          }
        } else if (data.detail && Array.isArray(data.detail)) {
          errorMessage = data.detail[0]?.msg || 'Validation error occurred';
        } else {
          const rawError = data.error?.message || data.error || data.detail || data.message;

          if (rawError && typeof rawError === 'string') {
            if (rawError.toLowerCase().includes('already exists')) {
              errorMessage = 'This email is already registered. Please try logging in instead.';
            } else if (response.status === 409) {
              errorMessage = 'This email address is already registered.';
            } else if (response.status >= 500) {
              errorMessage = 'Server error. Please try again in a moment.';
            } else {
              errorMessage = rawError;
            }
          }
        }

        console.log('✋ Error message shown to user:', errorMessage);
        setError(errorMessage);
        return;
      }

      // Sauvegarder les données pour la vérification OTP
      await SecureStore.setItemAsync('auth_email', email);
      await SecureStore.setItemAsync('auth_user_data', JSON.stringify(data));

      setShowOtpInput(true);
      setTimer(600);
    } catch (err: any) {
      console.error('Error details:', err);
      setError(`Server connection error: ${err.message || 'Please check your internet connection'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setIsLoading(true);

    try {
      const savedEmail = await SecureStore.getItemAsync('auth_email');
      const savedUserDataStr = await SecureStore.getItemAsync('auth_user_data');

      if (!savedEmail || !savedUserDataStr) {
        setError('Session expired. Please start over.');
        setShowOtpInput(false);
        setIsLoading(false);
        return;
      }

      const savedUserData = JSON.parse(savedUserDataStr);

      console.log('✅ Generating session secrets for OTP verification...');
      const gridClient = new GridClient({
        environment: 'sandbox',
        baseUrl: API_URL
      });

      const sessionSecrets = await gridClient.generateSessionSecrets();
      console.log('✅ Session secrets generated');

      const url = `${API_URL}/grid/accounts/verify`;
      console.log('Calling OTP verification:', url);

      const body = {
        otpCode: otpCode,
        sessionSecrets: sessionSecrets,
        user: savedUserData
      };

      console.log('Request body:', JSON.stringify({ ...body, sessionSecrets: '[REDACTED]' }, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('📥 OTP verification response status:', response.status);
      const data = await response.json();
      console.log('📥 OTP verification response data:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.log('❌ OTP verification failed:', data);
        let errorMessage = data.detail || data.error || 'Invalid or expired code';

        if (errorMessage.toLowerCase().includes('invalid')) {
          errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (errorMessage.toLowerCase().includes('expired')) {
          errorMessage = 'Verification code has expired. Please request a new one.';
        }

        setError(errorMessage);
        return;
      }

      // Extraire les tokens de la structure GRID SDK
      const privySession = data.authentication?.[0]?.session?.Privy;
      const accessToken = privySession?.privy_access_token || privySession?.token;
      const refreshToken = privySession?.refresh_token;

      console.log('🔍 Extracted tokens:', { accessToken: accessToken ? 'PRESENT' : 'MISSING', refreshToken: refreshToken ? 'PRESENT' : 'MISSING' });

      if (accessToken) {
        console.log('✅ Registration successful!');

        await SecureStore.deleteItemAsync('auth_email');
        await SecureStore.deleteItemAsync('auth_user_data');

        // Save session secrets for transaction signing
        await SecureStore.setItemAsync('session_secrets', JSON.stringify(sessionSecrets));
        console.log('✅ Session secrets saved');

        const userData = {
          grid_user_id: data.grid_user_id,
          email: savedEmail,
          grid_address: data.address,
          policies: data.policies,
          authentication: data.authentication,
        };

        await authStorage.saveAuth({
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expires_in: 3600,
          user: userData,
        });

        console.log('✅ Auth data saved');

        setShowLogoAnimation(true);

        Animated.parallel([
          Animated.timing(blurAnimation, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.timing(logoAnimation, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.delay(800),
            Animated.timing(logoAnimation, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]).start(async () => {
          try {
            console.log('🔄 Calling AuthContext.login()...');
            await login({
              email: savedEmail,
              username: savedEmail?.split('@')[0],
              gridAddress: data.address,
            });
            console.log('✅ AuthContext.login() completed');

            if (onSuccess) {
              onSuccess(data);
            }
          } catch (error) {
            console.error('❌ Error saving user data:', error);
          }
        });
      } else {
        console.log('⚠️ No access token in response');
        setError('Authentication failed - no access token received');
      }
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError('Server connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    setShowOtpInput(false);
    setOtpCode('');
    setTimer(600);
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#1a1a1a']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      >
        <StatusBar style="light" />

        {/* Logo Animation Overlay */}
        {showLogoAnimation && (
          <Animated.View
            style={[
              styles.logoOverlay,
              {
                opacity: blurAnimation,
              },
            ]}
          >
            <Animated.Image
              source={require('../../assets/logo-transparent.png')}
              style={[
                styles.logoImage,
                {
                  opacity: logoAnimation,
                  transform: [
                    {
                      scale: logoAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
          </Animated.View>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Image source={require('../../assets/logo-transparent.png')} style={styles.logo} />
              <Text style={styles.title}>Sign Up</Text>
              <Text style={styles.subtitle}>Create your account</Text>
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
              {!showOtpInput ? (
                <>
                  {/* Email Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                  </View>

                  {/* Error Message */}
                  {error && <Text style={styles.errorText}>{error}</Text>}

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleSubmitEmail}
                    disabled={isLoading || !email}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.buttonText}>Continue</Text>
                    )}
                  </TouchableOpacity>

                  {/* Switch to Login */}
                  <View style={styles.switchContainer}>
                    <Text style={styles.switchText}>Already have an account? </Text>
                    <TouchableOpacity onPress={onSwitchToLogin} activeOpacity={0.7}>
                      <Text style={styles.switchLink}>Log In</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {/* OTP Input */}
                  <View style={styles.otpContainer}>
                    <Text style={styles.otpTitle}>Enter Verification Code</Text>
                    <Text style={styles.otpSubtitle}>
                      We sent a code to {email}
                    </Text>

                    <TextInput
                      style={styles.otpInput}
                      placeholder="000000"
                      placeholderTextColor="rgba(255, 255, 255, 0.2)"
                      value={otpCode}
                      onChangeText={setOtpCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                      editable={!isLoading}
                    />

                    <Text style={styles.timerText}>
                      Time remaining: {formatTime(timer)}
                    </Text>

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <TouchableOpacity
                      style={[styles.button, isLoading && styles.buttonDisabled]}
                      onPress={handleVerifyOtp}
                      disabled={isLoading || otpCode.length !== 6}
                      activeOpacity={0.8}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#000" />
                      ) : (
                        <Text style={styles.buttonText}>Verify</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={handleResendCode}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.resendText}>Resend Code</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 120,
    paddingBottom: 40,
    justifyContent: 'flex-end',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 24,
    borderRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: 'white',
    fontFamily: 'Sansation-Light',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Sansation-Regular',
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    fontFamily: 'Sansation-Regular',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: 'white',
    fontFamily: 'Sansation-Regular',
  },
  button: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 8,
    fontFamily: 'Sansation-Regular',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
  switchLink: {
    color: 'rgba(240, 235, 220, 0.95)',
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
  },
  otpContainer: {
    width: '100%',
  },
  otpTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: 'white',
    fontFamily: 'Sansation-Light',
    marginBottom: 12,
    textAlign: 'center',
  },
  otpSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Sansation-Regular',
    marginBottom: 32,
    textAlign: 'center',
  },
  otpInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    fontSize: 32,
    color: 'white',
    fontFamily: 'Sansation-Bold',
    textAlign: 'center',
    letterSpacing: 8,
    width: '100%',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Sansation-Regular',
    marginBottom: 8,
    textAlign: 'center',
  },
  resendButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignSelf: 'center',
  },
  resendText: {
    color: 'rgba(240, 235, 220, 0.95)',
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
  },
  logoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 30,
  },
});
