/**
 * SwapConfirmation
 * Confirmation screen with biometric auth and swap execution
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSwap } from '../../hooks/useSwap';
import type { TokenInfo, SwapQuote, SwapStep } from '../../types/swap';

interface SwapConfirmationProps {
  sourceToken: TokenInfo;
  destinationToken: TokenInfo;
  amount: string;
  quote: SwapQuote;
  privacyEnabled: boolean;
  destinationAddress: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function SwapConfirmation({
  sourceToken,
  destinationToken,
  amount,
  quote,
  privacyEnabled,
  destinationAddress,
  onBack,
  onSuccess,
}: SwapConfirmationProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  const { executeSwap, isExecuting, currentStep, error } = useSwap();

  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
  });

  if (!fontsLoaded) return null;

  const handleConfirm = async () => {
    setIsAuthenticating(true);

    try {
      // Authenticate with biometrics
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const authResult = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm Swap',
          fallbackLabel: 'Use PIN',
          cancelLabel: 'Cancel',
        });

        if (!authResult.success) {
          setIsAuthenticating(false);
          return;
        }
      }

      setIsAuthenticating(false);

      // Execute swap
      const result = await executeSwap({
        sourceToken,
        destinationToken,
        amount,
        quote,
        privacyEnabled,
        destinationAddress,
      });

      if (result.success) {
        setTransactionId(result.transactionId);
        setExplorerUrl(result.explorerUrl);
        setShowSuccess(true);
      }
    } catch (err) {
      console.error('[SwapConfirmation] Error:', err);
      setIsAuthenticating(false);
    }
  };

  const handleOpenExplorer = () => {
    if (explorerUrl) {
      Linking.openURL(explorerUrl);
    }
  };

  const handleClose = () => {
    setShowSuccess(false);
    onSuccess();
  };

  const getStepLabel = (step: SwapStep | null): string => {
    switch (step) {
      case 'PREPARING':
        return 'Preparing transaction...';
      case 'SIGNING':
        return 'Signing transaction...';
      case 'SUBMITTING':
        return 'Submitting to network...';
      case 'BRIDGING':
        return 'Privacy bridge in progress...';
      case 'COMPLETING':
        return 'Finalizing swap...';
      default:
        return 'Processing...';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#050008', '#0a0510', '#0f0a18']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.background}
      >
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.8}
            disabled={isExecuting}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Swap</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Swap Summary */}
        <View style={styles.summaryContainer}>
          {/* From */}
          <View style={styles.tokenCard}>
            <Text style={styles.cardLabel}>You pay</Text>
            <View style={styles.tokenRow}>
              {sourceToken.logoUri ? (
                <Image source={{ uri: sourceToken.logoUri }} style={styles.tokenLogo} />
              ) : (
                <View style={styles.tokenLogoPlaceholder}>
                  <Text style={styles.tokenLogoText}>{sourceToken.symbol[0]}</Text>
                </View>
              )}
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenAmount}>{amount}</Text>
                <Text style={styles.tokenSymbol}>{sourceToken.symbol}</Text>
              </View>
            </View>
          </View>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <Text style={styles.arrowIcon}>↓</Text>
          </View>

          {/* To */}
          <View style={styles.tokenCard}>
            <Text style={styles.cardLabel}>You receive</Text>
            <View style={styles.tokenRow}>
              {destinationToken.logoUri ? (
                <Image source={{ uri: destinationToken.logoUri }} style={styles.tokenLogo} />
              ) : (
                <View style={styles.tokenLogoPlaceholder}>
                  <Text style={styles.tokenLogoText}>{destinationToken.symbol[0]}</Text>
                </View>
              )}
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenAmount}>{quote.estimatedOutput}</Text>
                <Text style={styles.tokenSymbol}>{destinationToken.symbol}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Destination</Text>
            <Text style={styles.detailValue}>
              {destinationAddress.slice(0, 6)}...{destinationAddress.slice(-4)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Privacy Mode</Text>
            <Text style={[styles.detailValue, privacyEnabled && styles.privacyEnabled]}>
              {privacyEnabled ? '🛡️ Enabled' : 'Disabled'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service Fee</Text>
            <Text style={styles.detailValue}>${quote.serviceFeeUsd.toFixed(2)}</Text>
          </View>
          {quote.bridgeFeeUsd > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bridge Fee</Text>
              <Text style={styles.detailValue}>${quote.bridgeFeeUsd.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Fees</Text>
            <Text style={styles.totalValue}>${quote.totalFeeUsd.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Est. Duration</Text>
            <Text style={styles.detailValue}>~{quote.route.estimatedDuration}s</Text>
          </View>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error.message}</Text>
            {error.recoverable && (
              <Text style={styles.retryText}>Tap "Swap" to try again</Text>
            )}
          </View>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmButton, isExecuting && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.8}
          disabled={isExecuting || isAuthenticating}
        >
          {isExecuting || isAuthenticating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={styles.loadingText}>
                {isAuthenticating ? 'Authenticating...' : getStepLabel(currentStep)}
              </Text>
            </View>
          ) : (
            <Text style={styles.confirmText}>Swap</Text>
          )}
        </TouchableOpacity>

        {/* Cancel link */}
        {!isExecuting && (
          <TouchableOpacity style={styles.cancelLink} onPress={onBack}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {/* Success Modal */}
        <Modal visible={showSuccess} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={handleClose}>
            <Pressable style={styles.successModal} onPress={(e) => e.stopPropagation()}>
              <View style={styles.successIcon}>
                <Text style={styles.successEmoji}>✅</Text>
              </View>
              <Text style={styles.successTitle}>Swap Complete!</Text>
              <Text style={styles.successAmount}>
                {quote.estimatedOutput} {destinationToken.symbol}
              </Text>
              <Text style={styles.successSubtitle}>has been sent to your private wallet</Text>

              {explorerUrl && (
                <TouchableOpacity style={styles.explorerButton} onPress={handleOpenExplorer}>
                  <Text style={styles.explorerText}>View on Explorer</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  placeholder: {
    width: 40,
  },
  summaryContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  tokenCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 12,
    fontFamily: 'Sansation-Regular',
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  tokenLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tokenLogoText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenAmount: {
    fontSize: 28,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  tokenSymbol: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
    fontFamily: 'Sansation-Regular',
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  arrowIcon: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  detailsContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Sansation-Regular',
  },
  detailValue: {
    fontSize: 14,
    color: 'white',
    fontFamily: 'Sansation-Regular',
  },
  privacyEnabled: {
    color: '#4CAF50',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  errorContainer: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    fontFamily: 'Sansation-Regular',
  },
  retryText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'Sansation-Regular',
  },
  confirmButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    marginHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 24,
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(240, 235, 220, 0.5)',
  },
  confirmText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 15,
    color: '#000',
    fontFamily: 'Sansation-Regular',
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  cancelText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Sansation-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModal: {
    backgroundColor: 'rgba(30, 30, 30, 0.98)',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  successIcon: {
    marginBottom: 16,
  },
  successEmoji: {
    fontSize: 64,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    fontFamily: 'Sansation-Bold',
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '600',
    color: '#4CAF50',
    fontFamily: 'Sansation-Bold',
  },
  successSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    fontFamily: 'Sansation-Regular',
  },
  explorerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  explorerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Sansation-Regular',
  },
  doneButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
});
