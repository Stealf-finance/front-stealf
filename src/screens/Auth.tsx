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
  Alert,
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

interface AuthScreenProps {
  onBack?: () => void;
  onSuccess?: (userData: any) => void;
}

export default function AuthScreen({ onBack, onSuccess }: AuthScreenProps) {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeUsername, setWelcomeUsername] = useState('');
  const [showLogoAnimation, setShowLogoAnimation] = useState(false);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const welcomeAnimation = useRef(new Animated.Value(0)).current;
  const logoAnimation = useRef(new Animated.Value(0)).current;
  const blurAnimation = useRef(new Animated.Value(0)).current;

  const handleToggle = (value: boolean) => {
    setIsLogin(value);
    setError('');
    setEmail('');
    setUsername('');
    setOtpCode('');
    setShowOtpInput(false);

    Animated.spring(slideAnimation, {
      toValue: value ? 0 : 1,
      friction: 8,
      tension: 65,
      useNativeDriver: true,
    }).start();
  };

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
      // Grid Protocol has different endpoints: /grid/auth for login, /grid/accounts for register
      const endpoint = isLogin ? '/grid/auth' : '/grid/accounts';
      const body = { email };

      const url = `${API_URL}${endpoint}`;
      console.log('Calling API:', url);
      console.log('Request body:', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      console.log('Error detail from server:', data.detail);
      console.log('Error detail type:', typeof data.detail);

      if (!response.ok) {
        if (data.detail && Array.isArray(data.detail)) {
          setError(data.detail[0]?.msg || 'Validation error occurred');
        } else {
          // Get error message from different possible locations in the response
          let errorMessage = data.detail || data.error?.message || data.message || 'An error occurred';
          console.log('Processing error message:', errorMessage);

          // Use the exact server message if it's already clear, otherwise improve it
          if (errorMessage.includes('User already exists with this email')) {
            errorMessage = 'This email is already registered. Please use the Login option instead.';
          } else if (errorMessage.includes('User not found')) {
            errorMessage = 'This email is not registered. Please use the Sign Up option instead.';
          } else if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('exist')) {
            errorMessage = isLogin
              ? 'This email is not registered. Please sign up first.'
              : 'This email is already registered. Please try logging in instead.';
          } else if (errorMessage.toLowerCase().includes('user') && errorMessage.toLowerCase().includes('exist')) {
            errorMessage = isLogin
              ? 'Account not found. Please check your email or sign up.'
              : 'This email is already taken. Please use a different email address.';
          } else if (response.status === 409) {
            errorMessage = 'This email address is already registered. Please use the login option.';
          } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again in a moment.';
          }
          // Keep original message for 400 errors if it's not a generic validation error

          setError(errorMessage);
        }
        return;
      }

      setSessionId(data.session_id);
      setShowOtpInput(true);
      setTimer(600); // Reset timer
    } catch (err) {
      console.error('Error details:', err);
      setError(`Server connection error: ${err.message || 'Please check your internet connection and try again'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setIsLoading(true);

    try {
      // Use different verify endpoints based on login vs register
      const endpoint = isLogin ? '/grid/auth/verify' : '/grid/accounts/verify';
      const url = `${API_URL}${endpoint}`;
      console.log('Calling OTP verification:', url, isLogin ? '(login)' : '(register)');

      const body = isLogin
        ? { session_id: sessionId, otp_code: otpCode }
        : { email, otp_code: otpCode };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.detail && Array.isArray(data.detail)) {
          setError(data.detail[0]?.msg || 'Invalid verification code');
        } else {
          let errorMessage = data.detail || 'Invalid or expired code';

          // Improve OTP error messages
          if (errorMessage.toLowerCase().includes('invalid')) {
            errorMessage = 'Invalid verification code. Please check and try again.';
          } else if (errorMessage.toLowerCase().includes('expired')) {
            errorMessage = 'Verification code has expired. Please request a new one.';
          } else if (errorMessage.toLowerCase().includes('session')) {
            errorMessage = 'Session expired. Please start the process again.';
          } else if (response.status === 400) {
            errorMessage = 'Please enter a valid 6-digit code.';
          } else if (response.status === 429) {
            errorMessage = 'Too many attempts. Please wait before trying again.';
          }

          setError(errorMessage);
        }
        return;
      }

      // Success! Store tokens and user data
      if (data.tokens) {
        console.log('✅ Login successful!', data);

        // Save auth data with refresh token
        await authStorage.saveAuth({
          access_token: data.tokens.access_token,
          refresh_token: data.tokens.refresh_token,
          expires_in: data.tokens.expires_in || 3600, // Default 1 hour
          user: data.user,
        });

        console.log('✅ Auth data saved with refresh token');

        // Show logo animation directly
        setShowLogoAnimation(true);

        // Start logo animation sequence
        Animated.parallel([
          Animated.timing(blurAnimation, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false, // Can't use native driver for blur
          }),
          Animated.sequence([
            Animated.timing(logoAnimation, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.delay(800), // Show logo for a moment
            Animated.timing(logoAnimation, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]).start(async () => {
          // After logo animation completes, save to AuthContext and trigger navigation
          try {
            await login({
              email: data.user?.email,
              username: data.user?.username,
              gridAddress: data.user?.grid_address,
            });

            // Also call onSuccess if provided (for backward compatibility)
            if (onSuccess) {
              onSuccess(data);
            }
          } catch (error) {
            console.error('Error saving user data:', error);
          }
        });
      }
    } catch (err) {
      setError('Server connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    setShowOtpInput(false);
    setOtpCode('');
    handleSubmitEmail();
  };

  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#1a1a1a']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      >
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Image
              source={require('../../assets/logo-transparent.png')}
              style={styles.welcomeLogo}
              resizeMode="contain"
            />
            <Text style={styles.welcomeTitle}>Welcome to Stealf</Text>
            <Text style={styles.welcomeSubtitle}>Your secure privacy-first neobank</Text>
            <Text style={styles.welcomeDescription}>Join thousands who trust us with their financial privacy</Text>
          </View>

          {/* Auth Container */}
          <View style={styles.authWrapper}>
            <View style={styles.authBackground} />
            <View style={styles.authContainer}>

              {/* Toggle Section */}
              <View style={styles.toggleSection}>
                <View style={styles.toggleContainer}>
                  <Animated.View
                    style={[
                      styles.toggleSlider,
                      {
                        transform: [
                          {
                            translateX: slideAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 150],
                            }),
                          },
                        ],
                      },
                    ]}
                  />

                  <TouchableOpacity
                    style={[styles.toggleButtonWrapper, styles.toggleButtonLeft]}
                    onPress={() => handleToggle(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.toggleButton}>
                      <Text style={[
                        styles.toggleButtonText,
                        isLogin && styles.toggleButtonTextActive
                      ]}>
                        Login
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleButtonWrapper, styles.toggleButtonRight]}
                    onPress={() => handleToggle(false)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.toggleButton}>
                      <Text style={[
                        styles.toggleButtonText,
                        !isLogin && styles.toggleButtonTextActive
                      ]}>
                        Sign Up
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {!showOtpInput ? (
                <>
                  {/* Email Input */}
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your email..."
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {/* Username Input (Sign Up only) */}
                  {!isLogin && (
                    <View style={styles.inputSection}>
                      <Text style={styles.inputLabel}>Username</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.input}
                          placeholder="Choose a username..."
                          placeholderTextColor="rgba(255, 255, 255, 0.3)"
                          value={username}
                          onChangeText={setUsername}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>
                  )}

                  {/* Error Message */}
                  {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                  ) : null}

                  {/* Submit Button */}
                  <View style={styles.buttonSection}>
                    <TouchableOpacity
                      style={[styles.submitButton, (!email || (!isLogin && !username)) && styles.submitButtonDisabled]}
                      activeOpacity={0.8}
                      onPress={handleSubmitEmail}
                      disabled={isLoading || !email || (!isLogin && !username)}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={styles.submitButtonText}>
                          {isLogin ? 'Login' : 'Sign Up'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {/* OTP Input */}
                  <View style={styles.otpSection}>
                    <Text style={styles.otpTitle}>Verification Code</Text>
                    <Text style={styles.otpSubtitle}>
                      Enter the 6-digit code sent to {email}
                    </Text>

                    <View style={styles.otpInputContainer}>
                      <TextInput
                        style={styles.otpInput}
                        placeholder="000000"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        value={otpCode}
                        onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>

                    {/* Timer */}
                    <Text style={styles.timerText}>
                      Code expires in {formatTime(timer)}
                    </Text>

                    {/* Error Message */}
                    {error ? (
                      <Text style={styles.errorText}>{error}</Text>
                    ) : null}

                    {/* Verify Button */}
                    <View style={styles.buttonSection}>
                      <TouchableOpacity
                        style={[styles.submitButton, otpCode.length !== 6 && styles.submitButtonDisabled]}
                        activeOpacity={0.8}
                        onPress={handleVerifyOtp}
                        disabled={isLoading || otpCode.length !== 6}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <Text style={styles.submitButtonText}>Verify</Text>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Resend Code */}
                    <TouchableOpacity onPress={handleResendCode} activeOpacity={0.8}>
                      <Text style={styles.resendText}>Resend Code</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Welcome Message Overlay */}
        {showWelcome && (
          <Animated.View
            style={[
              styles.welcomeOverlay,
              {
                opacity: welcomeAnimation,
                transform: [
                  {
                    scale: welcomeAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.welcomeMessageContainer}>
              <Image
                source={require('../../assets/logo-transparent.png')}
                style={styles.welcomeMessageLogo}
                resizeMode="contain"
              />
              <Text style={styles.welcomeMessageTitle}>Welcome, {welcomeUsername}!</Text>
              <Text style={styles.welcomeMessageSubtitle}>You're all set</Text>
            </View>
          </Animated.View>
        )}

        {/* Logo Animation Overlay */}
        {showLogoAnimation && (
          <Animated.View
            style={[
              styles.logoAnimationOverlay,
              {
                opacity: blurAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            <Animated.View
              style={[
                styles.logoAnimationContainer,
                {
                  opacity: logoAnimation,
                  transform: [
                    {
                      scale: logoAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1.2],
                      }),
                    },
                    {
                      translateY: logoAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Image
                source={require('../../assets/logo-transparent.png')}
                style={styles.logoAnimationImage}
                resizeMode="contain"
              />
            </Animated.View>
          </Animated.View>
        )}
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 10,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  logoContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logo: {
    width: 32,
    height: 32,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  welcomeLogo: {
    width: 80,
    height: 80,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  welcomeDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  authWrapper: {
    position: 'relative',
    marginHorizontal: 20,
    marginTop: 20,
    zIndex: 100,
  },
  authBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 2,
  },
  authContainer: {
    padding: 25,
    paddingBottom: 30,
    position: 'relative',
    zIndex: 3,
  },
  toggleSection: {
    marginBottom: 40,
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    position: 'relative',
    width: 300,
  },
  toggleSlider: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '50%',
    borderRadius: 30,
    backgroundColor: 'rgba(150, 150, 150, 0.7)',
  },
  toggleButtonWrapper: {
    flex: 1,
    zIndex: 1,
  },
  toggleButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  toggleButtonLeft: {
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
  },
  toggleButtonRight: {
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
  },
  toggleButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
  },
  toggleButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
  },
  inputSection: {
    marginBottom: 25,
  },
  inputLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Sansation-Regular',
    marginBottom: 12,
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    color: 'white',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
  buttonSection: {
    marginTop: 30,
    marginBottom: 15,
    alignItems: 'center',
  },
  submitButton: {
    borderRadius: 25,
    overflow: 'hidden',
    width: 190,
    paddingVertical: 13,
    paddingHorizontal: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.7)',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    marginTop: 10,
  },
  otpSection: {
    alignItems: 'center',
  },
  otpTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
    marginBottom: 10,
  },
  otpSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    marginBottom: 30,
  },
  otpInputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    width: 200,
  },
  otpInput: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    color: 'white',
    fontSize: 24,
    fontFamily: 'Sansation-Bold',
    textAlign: 'center',
    letterSpacing: 5,
  },
  timerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    marginTop: 15,
  },
  resendText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    textDecorationLine: 'underline',
  },
  // Welcome Message Overlay Styles
  welcomeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 0, 20, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  welcomeMessageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#00ff00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 20,
  },
  welcomeMessageLogo: {
    width: 60,
    height: 60,
    marginBottom: 20,
  },
  welcomeMessageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeMessageSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
  },
  // Logo Animation Overlay Styles
  logoAnimationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgb(0, 0, 0)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  logoAnimationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoAnimationImage: {
    width: 150,
    height: 150,
    tintColor: 'white',
  },
});