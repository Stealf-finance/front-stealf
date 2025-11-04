import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFonts } from 'expo-font';
import AppBackground from '../../components/common/AppBackground';
import LoginSuccessAnimation from '../../components/auth/LoginSuccessAnimation';
import { useRegister } from '../../hooks/auth/useRegister';

interface RegisterScreenProps {
  onBack?: () => void;
  onSuccess?: (userData: any) => void;
  onSwitchToLogin?: () => void;
}

export default function RegisterScreen({ onBack, onSuccess, onSwitchToLogin }: RegisterScreenProps) {
  const {
    email,
    setEmail,
    otpCode,
    setOtpCode,
    showOtpInput,
    isLoading,
    error,
    timer,
    showLogoAnimation,
    handleSubmitEmail,
    handleVerifyOtp,
    handleResendCode,
    handleAnimationComplete,
  } = useRegister(onSuccess);

  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <AppBackground>
        <LoginSuccessAnimation
          visible={showLogoAnimation}
          onComplete={handleAnimationComplete}
        />

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
      </AppBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
});
