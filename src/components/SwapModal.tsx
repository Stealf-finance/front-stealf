import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSwap, SwapDirection, SOL_DECIMALS, USDC_DECIMALS } from '../hooks/useSwap';

interface SwapModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SwapModal({ visible, onClose }: SwapModalProps) {
  const [direction, setDirection] = useState<SwapDirection>('SOL_TO_USDC');
  const [amount, setAmount] = useState('');
  const [success, setSuccess] = useState<string | null>(null);

  const { getQuote, executeSwap, reset, quote, isLoadingQuote, isExecuting, error } = useSwap();

  const isSOLtoUSDC = direction === 'SOL_TO_USDC';
  const inputLabel = isSOLtoUSDC ? 'SOL' : 'USDC';
  const outputLabel = isSOLtoUSDC ? 'USDC' : 'SOL';

  const handleToggleDirection = useCallback(() => {
    setDirection(d => d === 'SOL_TO_USDC' ? 'USDC_TO_SOL' : 'SOL_TO_USDC');
    setAmount('');
    reset();
  }, [reset]);

  const handleGetQuote = useCallback(async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    await getQuote(direction, parsed);
  }, [amount, direction, getQuote]);

  const handleExecute = useCallback(async () => {
    if (!quote) return;
    const sig = await executeSwap(quote);
    if (sig) {
      setSuccess(sig);
      setAmount('');
    }
  }, [quote, executeSwap]);

  const handleClose = useCallback(() => {
    setAmount('');
    setSuccess(null);
    reset();
    onClose();
  }, [reset, onClose]);

  const formatOutput = () => {
    if (!quote) return null;
    const decimals = isSOLtoUSDC ? USDC_DECIMALS : SOL_DECIMALS;
    const raw = parseInt(quote.totalOutputAmount, 10);
    const formatted = (raw / Math.pow(10, decimals)).toFixed(isSOLtoUSDC ? 2 : 4);
    return formatted;
  };

  const formatRate = () => {
    if (!quote) return null;
    const inDecimals = isSOLtoUSDC ? SOL_DECIMALS : USDC_DECIMALS;
    const outDecimals = isSOLtoUSDC ? USDC_DECIMALS : SOL_DECIMALS;
    const inAmount = parseInt(quote.totalInputAmount, 10) / Math.pow(10, inDecimals);
    const outAmount = parseInt(quote.totalOutputAmount, 10) / Math.pow(10, outDecimals);
    const rate = outAmount / inAmount;
    return isSOLtoUSDC
      ? `1 SOL ≈ ${rate.toFixed(2)} USDC`
      : `1 USDC ≈ ${rate.toFixed(6)} SOL`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Swap</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {success ? (
            /* Success state */
            <View style={styles.successContainer}>
              <Text style={styles.successEmoji}>✓</Text>
              <Text style={styles.successTitle}>Swap complete</Text>
              <Text style={styles.successSig} numberOfLines={1} ellipsizeMode="middle">
                {success}
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Direction toggle */}
              <View style={styles.directionRow}>
                <View style={styles.tokenBadge}>
                  <Text style={styles.tokenText}>{inputLabel}</Text>
                </View>

                <TouchableOpacity style={styles.toggleBtn} onPress={handleToggleDirection}>
                  <Text style={styles.toggleArrow}>⇄</Text>
                </TouchableOpacity>

                <View style={styles.tokenBadge}>
                  <Text style={styles.tokenText}>{outputLabel}</Text>
                </View>
              </View>

              {/* Amount input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={`Amount in ${inputLabel}`}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={text => {
                    setAmount(text);
                    reset();
                  }}
                />
                <Text style={styles.inputSuffix}>{inputLabel}</Text>
              </View>

              {/* Quote result */}
              {quote && (
                <View style={styles.quoteBox}>
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>You receive</Text>
                    <Text style={styles.quoteValue}>{formatOutput()} {outputLabel}</Text>
                  </View>
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Rate</Text>
                    <Text style={styles.quoteValue}>{formatRate()}</Text>
                  </View>
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Slippage</Text>
                    <Text style={styles.quoteValue}>{(quote.slippageBps / 100).toFixed(2)}%</Text>
                  </View>
                </View>
              )}

              {/* Error */}
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              {/* Action button */}
              {!quote ? (
                <TouchableOpacity
                  style={[styles.actionBtn, (!amount || parseFloat(amount) <= 0) && styles.actionBtnDisabled]}
                  onPress={handleGetQuote}
                  disabled={!amount || parseFloat(amount) <= 0 || isLoadingQuote}
                >
                  {isLoadingQuote ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.actionBtnText}>Get quote</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleExecute}
                  disabled={isExecuting}
                >
                  {isExecuting ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.actionBtnText}>Confirm swap</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Sansation-Regular',
  },
  closeBtn: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  tokenBadge: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tokenText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Sansation-Regular',
  },
  toggleBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleArrow: {
    color: '#ffffff',
    fontSize: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '300',
    fontFamily: 'Sansation-Light',
    paddingVertical: 16,
  },
  inputSuffix: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '500',
  },
  quoteBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quoteLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
  quoteValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Sansation-Regular',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.3,
  },
  actionBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Sansation-Regular',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  successEmoji: {
    fontSize: 48,
    color: '#4CAF50',
  },
  successTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Sansation-Regular',
  },
  successSig: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'Sansation-Regular',
    width: '90%',
    textAlign: 'center',
  },
  doneBtn: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  doneBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Sansation-Regular',
  },
});
