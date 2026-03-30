import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSplash } from '../../contexts/SplashContext';
import { useSignIn } from '../../hooks/auth/useSignIn';

export default function SignInScreen() {
  const router = useRouter();
  const { showSplash } = useSplash();
  const { loading, signInWithPasskey } = useSignIn();

  const handleSignIn = async () => {
    showSplash();
    const result = await signInWithPasskey();

    if (!result.success) {
      Alert.alert(result.message || 'Error', result.description || 'An error occurred');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#000000', '#000000']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      >

        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo-transparent.png')}
              style={styles.logo}
              contentFit="contain"
              transition={200}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in with your passkey</Text>

          {/* Sign In Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Sign In with Passkey</Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/sign-up')}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Sansation-Bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Sansation-Regular',
    color: '#ffffff80',
    marginBottom: 48,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderCurve: 'continuous',
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    color: '#ffffff80',
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
    color: '#fff',
  },
});
