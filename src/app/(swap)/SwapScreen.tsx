/**
 * SwapScreen
 * Main screen for private token swaps via SilentSwap
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/useWalletInfos';
import { useSwapQuote } from '../../hooks/useSwapQuote';
import TokenSelector from '../../components/swap/TokenSelector';
import PrivacyToggle from '../../components/swap/PrivacyToggle';
import SwapConfirmation from './SwapConfirmation';
import SwapHistoryScreen from './SwapHistoryScreen';
import type { TokenInfo } from '../../types/swap';
import { SUPPORTED_TOKENS, getTokenBySymbol } from '../../constants/tokens';

interface SwapScreenProps {
  onBack: () => void;
}

type SwapView = 'main' | 'confirmation' | 'history';

export default function SwapScreen({ onBack }: SwapScreenProps) {
  // View state
  const [currentView, setCurrentView] = useState<SwapView>('main');

  // Swap state
  const [amount, setAmount] = useState('');
  const [sourceToken, setSourceToken] = useState<TokenInfo | null>(
    getTokenBySymbol('SOL') || null
  );
  const [destinationToken, setDestinationToken] = useState<TokenInfo | null>(
    getTokenBySymbol('USDC') || null
  );
  const [privacyEnabled, setPrivacyEnabled] = useState(true);

  // Token selector state
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [showDestSelector, setShowDestSelector] = useState(false);

  // Auth and wallet
  const { userData } = useAuth();
  const privateWalletAddress = userData?.stealf_wallet || '';
  const { balance: solBalance } = useWalletInfos(privateWalletAddress);

  // Quote
  const { quote, isLoading: quoteLoading, error: quoteError } = useSwapQuote({
    sourceToken,
    destinationToken,
    amount,
    privacyEnabled,
    destinationAddress: privateWalletAddress,
  });

  // Fonts
  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
  });

  // Balances (mock for now - would come from token accounts)
  const balances = useMemo(() => {
    const b: Record<string, string> = {};
    SUPPORTED_TOKENS.forEach((token) => {
      if (token.symbol === 'SOL') {
        b[token.mint] = (solBalance || 0).toString();
      } else {
        b[token.mint] = '0';
      }
    });
    return b;
  }, [solBalance]);

  // Validation
  const inputAmount = parseFloat(amount) || 0;
  const sourceBalance = sourceToken ? parseFloat(balances[sourceToken.mint] || '0') : 0;
  const isInsufficientBalance = inputAmount > sourceBalance;
  const isValidAmount = inputAmount > 0 && !isInsufficientBalance;
  const canSwap = isValidAmount && !!quote && !quoteError;

  if (!fontsLoaded) return null;

  // Handlers
  const handleNumberPress = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    setAmount((prev) => prev + num);
  };

  const handleDelete = () => {
    setAmount((prev) => prev.slice(0, -1));
  };

  const handleSwapTokens = () => {
    const temp = sourceToken;
    setSourceToken(destinationToken);
    setDestinationToken(temp);
  };

  const handleContinue = () => {
    if (canSwap) {
      setCurrentView('confirmation');
    }
  };

  const handleSwapSuccess = () => {
    setAmount('');
    setCurrentView('main');
  };

  // Render sub-views
  if (currentView === 'confirmation' && quote && sourceToken && destinationToken) {
    return (
      <SwapConfirmation
        sourceToken={sourceToken}
        destinationToken={destinationToken}
        amount={amount}
        quote={quote}
        privacyEnabled={privacyEnabled}
        destinationAddress={privateWalletAddress}
        onBack={() => setCurrentView('main')}
        onSuccess={handleSwapSuccess}
      />
    );
  }

  if (currentView === 'history') {
    return <SwapHistoryScreen onBack={() => setCurrentView('main')} />;
  }

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
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Exchange</Text>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setCurrentView('history')}
            activeOpacity={0.8}
          >
            <Text style={styles.historyIcon}>📋</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Toggle */}
        <View style={styles.privacyContainer}>
          <PrivacyToggle enabled={privacyEnabled} onChange={setPrivacyEnabled} />
        </View>

        {/* Token Selectors */}
        <View style={styles.tokenSection}>
          {/* Source Token */}
          <View style={styles.tokenRow}>
            <Text style={styles.tokenLabel}>From</Text>
            <TouchableOpacity
              style={styles.tokenButton}
              onPress={() => setShowSourceSelector(true)}
              activeOpacity={0.7}
            >
              {sourceToken?.logoUri ? (
                <Image source={{ uri: sourceToken.logoUri }} style={styles.tokenLogo} />
              ) : (
                <View style={styles.tokenLogoPlaceholder}>
                  <Text style={styles.tokenLogoText}>{sourceToken?.symbol?.[0] || '?'}</Text>
                </View>
              )}
              <Text style={styles.tokenSymbol}>{sourceToken?.symbol || 'Select'}</Text>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>
            <Text style={styles.tokenBalance}>
              Balance: {formatBalance(sourceBalance, sourceToken?.decimals || 9)}
            </Text>
          </View>

          {/* Swap Button */}
          <TouchableOpacity style={styles.swapButton} onPress={handleSwapTokens} activeOpacity={0.7}>
            <Text style={styles.swapIcon}>⇅</Text>
          </TouchableOpacity>

          {/* Destination Token */}
          <View style={styles.tokenRow}>
            <Text style={styles.tokenLabel}>To</Text>
            <TouchableOpacity
              style={styles.tokenButton}
              onPress={() => setShowDestSelector(true)}
              activeOpacity={0.7}
            >
              {destinationToken?.logoUri ? (
                <Image source={{ uri: destinationToken.logoUri }} style={styles.tokenLogo} />
              ) : (
                <View style={styles.tokenLogoPlaceholder}>
                  <Text style={styles.tokenLogoText}>{destinationToken?.symbol?.[0] || '?'}</Text>
                </View>
              )}
              <Text style={styles.tokenSymbol}>{destinationToken?.symbol || 'Select'}</Text>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount Display */}
        <View style={styles.amountContainer}>
          <View style={styles.amountRow}>
            <Text style={[styles.amountText, isInsufficientBalance && styles.amountError]}>
              {amount || '0'}
            </Text>
            <Text style={styles.currencyText}>{sourceToken?.symbol || 'TOKEN'}</Text>
          </View>

          {/* Quote Display */}
          {quoteLoading ? (
            <View style={styles.quoteRow}>
              <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.5)" />
              <Text style={styles.quoteText}>Getting quote...</Text>
            </View>
          ) : quote ? (
            <View style={styles.quoteRow}>
              <Text style={styles.quoteText}>
                ≈ {quote.estimatedOutput} {destinationToken?.symbol}
              </Text>
              <Text style={styles.feeText}>
                Fee: ${quote.totalFeeUsd.toFixed(2)}
              </Text>
            </View>
          ) : quoteError ? (
            <Text style={styles.errorText}>{quoteError.message}</Text>
          ) : null}

          {isInsufficientBalance && (
            <Text style={styles.errorText}>Insufficient balance</Text>
          )}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, !canSwap && styles.continueButtonDisabled]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={!canSwap}
        >
          <Text style={[styles.continueText, !canSwap && styles.continueTextDisabled]}>
            {quoteLoading ? 'Loading...' : 'Swap'}
          </Text>
        </TouchableOpacity>

        {/* Custom Keyboard */}
        <View style={styles.keyboard}>
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', '⌫']].map(
            (row, rowIndex) => (
              <View key={rowIndex} style={styles.keyboardRow}>
                {row.map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={styles.key}
                    onPress={() => (key === '⌫' ? handleDelete() : handleNumberPress(key))}
                  >
                    <Text style={styles.keyText}>{key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
        </View>

        {/* Token Selectors */}
        <TokenSelector
          visible={showSourceSelector}
          onClose={() => setShowSourceSelector(false)}
          onSelect={setSourceToken}
          selectedToken={sourceToken}
          excludeToken={destinationToken}
          balances={balances}
        />

        <TokenSelector
          visible={showDestSelector}
          onClose={() => setShowDestSelector(false)}
          onSelect={setDestinationToken}
          selectedToken={destinationToken}
          excludeToken={sourceToken}
          balances={balances}
        />
      </LinearGradient>
    </View>
  );
}

function formatBalance(balance: number, decimals: number): string {
  if (balance === 0) return '0';
  if (balance < 0.001) return '< 0.001';
  return balance.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(decimals, 4),
  });
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
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIcon: {
    fontSize: 18,
  },
  privacyContainer: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  tokenSection: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  tokenRow: {
    marginBottom: 12,
  },
  tokenLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    fontFamily: 'Sansation-Regular',
  },
  tokenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tokenLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  tokenLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tokenLogoText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  tokenSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  tokenBalance: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 6,
    fontFamily: 'Sansation-Regular',
  },
  swapButton: {
    alignSelf: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  swapIcon: {
    fontSize: 20,
    color: 'white',
  },
  amountContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  amountText: {
    fontSize: 48,
    fontWeight: '300',
    color: 'white',
    letterSpacing: -1,
    fontFamily: 'Sansation-Light',
  },
  amountError: {
    color: '#FF6B6B',
  },
  currencyText: {
    fontSize: 24,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 8,
    fontFamily: 'Sansation-Light',
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quoteText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Sansation-Regular',
  },
  feeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Sansation-Regular',
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
    marginTop: 4,
    fontFamily: 'Sansation-Regular',
  },
  continueButton: {
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    marginHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 16,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(240, 235, 220, 0.3)',
  },
  continueText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Sansation-Bold',
  },
  continueTextDisabled: {
    color: 'rgba(0, 0, 0, 0.4)',
  },
  keyboard: {
    paddingHorizontal: 40,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  key: {
    width: 80,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 28,
    color: 'white',
    fontWeight: '300',
    fontFamily: 'Sansation-Light',
  },
});
