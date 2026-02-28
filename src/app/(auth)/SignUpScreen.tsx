import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Image,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import VerifiedScreen from './VerifiedScreen';
import { useAuthFlow } from '../../hooks/useSignUp';
import { useEmailVerificationPolling } from '../../hooks/useEmailVerificationPolling';

interface SignUpScreenProps {
  onSwitchToSignIn?: () => void;
}

export default function SignUpScreen({ onSwitchToSignIn }: SignUpScreenProps = {}){
  const authFlow = useAuthFlow();

  const [step, setStep] = useState<'email' | 'waiting' | 'verified'>('email');
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preAuthToken, setPreAuthToken] = useState<string | null>(null);

  useEmailVerificationPolling({
    preAuthToken,
    enabled: step === 'waiting',
    onVerified: (data) => {
      setEmail(data.email);
      setPseudo(data.pseudo);
      setStep('verified');
    },
  });

  const onResendMagicLink = async () => {
    const result = await authFlow.handleResendMagicLink({
      email,
      pseudo,
      setLoading,
    });

    if (!result.success) {
      Alert.alert('Error', result.message);
    } else {
      Alert.alert('Success', result.message);
    }
  };

  const onEmailSubmit = async () => {
    const result = await authFlow.handleEmailSubmit({
      email,
      pseudo,
      setStep,
      setLoading,
    });

    if (!result.success) {
      Alert.alert('Error', result.message);
    } else {

      if (result.preAuthToken) {
        setPreAuthToken(result.preAuthToken);
      }
    }
  };

  if (step === 'verified' && email && pseudo) {
    return <VerifiedScreen email={email} pseudo={pseudo} onBack={() => setStep('email')} />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#000000', '#000000']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      >

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
              <Text style={styles.title}>Welcome</Text>
              <Text style={styles.subtitle}>Create your Stealf account</Text>
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
              {step === 'email' ? (
                <>
                  {/* Pseudo Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Pseudo</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your pseudo"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      value={pseudo}
                      onChangeText={setPseudo}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                  </View>

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
                      editable={!loading}
                    />
                  </View>

                  {/* Error Message */}
                  {error && <Text style={styles.errorText}>{error}</Text>}

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={onEmailSubmit}
                    disabled={loading || !email || !pseudo}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.buttonText}>Continue</Text>
                    )}
                  </TouchableOpacity>

                  {/* Sign In Link */}
                  <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={onSwitchToSignIn}>
                      <Text style={styles.footerLink}>Sign In</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {/* Check Email Screen */}
                  <View style={styles.waitingContainer}>
                    <View style={styles.emailIconContainer}>
                      <Text style={styles.emailIcon}>📧</Text>
                    </View>

                    <Text style={styles.waitingTitle}>Check your email</Text>
                    <Text style={styles.waitingSubtitle}>
                      We sent a verify link to{'\n'}
                      <Text style={styles.emailHighlight}>{email}</Text>
                    </Text>

                    <Text style={styles.instructionsText}>
                      Click the link in the email to continue
                    </Text>

                    <TouchableOpacity
                      style={[styles.resendButton, loading && styles.buttonDisabled]}
                      onPress={onResendMagicLink}
                      disabled={loading}
                      activeOpacity={0.7}
                    >
                      {loading ? (
                        <ActivityIndicator color="rgba(240, 235, 220, 0.95)" />
                      ) : (
                        <Text style={styles.resendText}>Resend Magic Link</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.changeEmailButton}
                      onPress={() => setStep('email')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.changeEmailText}>Change Email</Text>
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
  waitingContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emailIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emailIcon: {
    fontSize: 48,
  },
  waitingTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: 'white',
    fontFamily: 'Sansation-Light',
    marginBottom: 16,
    textAlign: 'center',
  },
  waitingSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Sansation-Regular',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailHighlight: {
    color: 'rgba(240, 235, 220, 0.95)',
    fontFamily: 'Sansation-Bold',
  },
  instructionsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Sansation-Regular',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 20,
  },
  resendButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 16,
    minWidth: 200,
  },
  resendText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Sansation-Bold',
  },
  changeEmailButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  changeEmailText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
    color: 'rgba(240, 235, 220, 0.95)',
  },
});
