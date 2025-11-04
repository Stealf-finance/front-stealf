import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import AppBackground from '../../components/common/AppBackground';
import {
  isBiometricAvailable,
  getBiometricType,
  enableBiometric,
} from '../../services/biometricService';

interface BiometricSetupScreenProps {
  onComplete: (enabled: boolean) => void;
  userToken: string;
}

export default function BiometricSetupScreen({
  onComplete,
  userToken,
}: BiometricSetupScreenProps) {
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
  });

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const available = await isBiometricAvailable();
    setIsAvailable(available);

    if (available) {
      const type = await getBiometricType();
      setBiometricType(type);
    }
  };

  const handleEnableBiometric = async () => {
    const success = await enableBiometric(userToken);
    onComplete(success);
  };

  const handleSkip = () => {
    onComplete(false);
  };

  if (!fontsLoaded) {
    return null;
  }

  if (!isAvailable) {
    // Si pas disponible, skip automatiquement
    onComplete(false);
    return null;
  }

  const getIconName = () => {
    if (biometricType === 'Face ID') return 'scan';
    if (biometricType === 'Touch ID') return 'finger-print';
    return 'shield-checkmark';
  };

  return (
    <AppBackground>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={getIconName()} size={80} color="white" />
        </View>

        <Text style={styles.title}>
          Enable {biometricType || 'Biometric'} Authentication
        </Text>

        <Text style={styles.description}>
          Quickly and securely access your wallet using {biometricType || 'biometric authentication'}
        </Text>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Fast access to your wallet</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Enhanced security</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>No need to remember passwords</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.enableButton}
          onPress={handleEnableBiometric}
          activeOpacity={0.8}
        >
          <Text style={styles.enableButtonText}>Enable {biometricType}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.8}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Sansation-Bold',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    fontFamily: 'Sansation-Regular',
  },
  featureList: {
    width: '100%',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Sansation-Regular',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  enableButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  enableButtonText: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Bold',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontFamily: 'Sansation-Regular',
  },
});
