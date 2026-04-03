import React, { useReducer, useCallback } from 'react';
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
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSplash } from '../contexts/SplashContext';
import VerifiedScreen from '../components/Verified';
import { useAuthFlow } from '../hooks/auth/useSignUp';
import { useEmailVerificationPolling } from '../hooks/auth/useEmailVerificationPolling';

interface SignUpState {
  step: 'email' | 'waiting' | 'verified';
  email: string;
  pseudo: string;
  inviteCode: string;
  loading: boolean;
  error: string;
  preAuthToken: string | null;
}

type SignUpAction =
  | { type: 'SET_FIELD'; field: keyof SignUpState; value: any }
  | { type: 'SET_STEP'; step: SignUpState['step'] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SET_PRE_AUTH_TOKEN'; token: string | null };

const initialState: SignUpState = {
  step: 'email',
  email: '',
  pseudo: '',
  inviteCode: '',
  loading: false,
  error: '',
  preAuthToken: null,
};

function signUpReducer(state: SignUpState, action: SignUpAction): SignUpState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_PRE_AUTH_TOKEN':
      return { ...state, preAuthToken: action.token };
    default:
      return state;
  }
}

export default function SignUpScreen(){
  const router = useRouter();
  const { showSplash } = useSplash();
  const insets = useSafeAreaInsets();
  const authFlow = useAuthFlow();

  const [state, dispatch] = useReducer(signUpReducer, initialState);
  const { step, email, pseudo, inviteCode, loading, error, preAuthToken } = state;

  const setStep = useCallback((s: SignUpState['step']) => dispatch({ type: 'SET_STEP', step: s }), []);
  const setLoading = useCallback((l: boolean) => dispatch({ type: 'SET_LOADING', loading: l }), []);
  const setEmail = useCallback((v: string) => dispatch({ type: 'SET_FIELD', field: 'email', value: v }), []);
  const setPseudo = useCallback((v: string) => dispatch({ type: 'SET_FIELD', field: 'pseudo', value: v }), []);
  const setInviteCode = useCallback((v: string) => dispatch({ type: 'SET_FIELD', field: 'inviteCode', value: v }), []);

  useEmailVerificationPolling({
    preAuthToken,
    enabled: step === 'waiting',
    onVerified: (data) => {
      dispatch({ type: 'SET_FIELD', field: 'email', value: data.email });
      dispatch({ type: 'SET_FIELD', field: 'pseudo', value: data.pseudo });
      dispatch({ type: 'SET_STEP', step: 'verified' });
    },
  });

  const onResendMagicLink = async () => {
    const result = await authFlow.handleResendMagicLink({
      email,
      pseudo,
      setLoading,
      preAuthToken: preAuthToken || undefined,
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
      inviteCode,
      setStep,
      setLoading,
    });

    if (!result.success) {
      Alert.alert('Error', result.message);
    } else {

      if (result.preAuthToken) {
        dispatch({ type: 'SET_PRE_AUTH_TOKEN', token: result.preAuthToken });
      }
    }
  };

  if (step === 'verified' && email && pseudo) {
    return <VerifiedScreen email={email} pseudo={pseudo} preAuthToken={preAuthToken} onBack={() => dispatch({ type: 'SET_STEP', step: 'email' })} onAuthStart={() => showSplash()} />;
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
            contentContainerStyle={[styles.scrollContainer, { paddingTop: insets.top + 60 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Image source={require('../assets/logo/logo-transparent.png')} style={styles.logo} transition={200} />
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
                      accessibilityLabel="Pseudo"
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
                      accessibilityLabel="Email"
                    />
                  </View>

                  {/* Invite Code Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Invite Code</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your invite code"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      value={inviteCode}
                      onChangeText={setInviteCode}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      editable={!loading}
                      accessibilityLabel="Invite code"
                    />
                  </View>

                  {/* Error Message */}
                  {error && <Text style={styles.errorText}>{error}</Text>}

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={onEmailSubmit}
                    disabled={loading || !email || !pseudo || !inviteCode}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Continue"
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
                    <TouchableOpacity onPress={() => router.replace('/sign-in')} accessibilityRole="button" accessibilityLabel="Sign in">
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
                      accessibilityRole="button"
                      accessibilityLabel="Resend magic link"
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
                      accessibilityRole="button"
                      accessibilityLabel="Change email"
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
    borderCurve: 'continuous',
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
    borderCurve: 'continuous',
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
    borderCurve: 'continuous',
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
    borderCurve: 'continuous',
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
