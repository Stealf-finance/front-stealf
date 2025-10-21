import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Path, Rect } from 'react-native-svg';
import { useFonts } from 'expo-font';
import { useWallet, useBalance } from '../../hooks';
import { priceService } from '../../services';

interface BalanceCardProps {
  onWithdraw?: () => void;
  onTopUp?: () => void;
  onExchange?: () => void;
}

export default function BalanceCard({ onWithdraw, onTopUp, onExchange }: BalanceCardProps) {
  const { walletAddress, loading: walletLoading } = useWallet();
  const { balance, loading, error } = useBalance(walletAddress);
  const [solPrice, setSolPrice] = useState<number>(100); // Default fallback
  const [priceLoading, setPriceLoading] = useState(true);

  // Load fonts
  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../../assets/font/Sansation/Sansation-Regular.ttf'),
  });

  // Fetch real SOL price
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setPriceLoading(true);
        const price = await priceService.getSOLPrice();
        setSolPrice(price);
      } catch (err) {
        console.error('Failed to fetch SOL price:', err);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchPrice();

    // Refresh price every minute
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Debug logs
  useEffect(() => {
    console.log('🔍 BalanceCard - walletAddress:', walletAddress);
    console.log('🔍 BalanceCard - walletLoading:', walletLoading);
    console.log('🔍 BalanceCard - balance:', balance);
    console.log('🔍 BalanceCard - error:', error);
    console.log('💰 BalanceCard - SOL price:', solPrice);
  }, [walletAddress, walletLoading, balance, error, solPrice]);

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = Math.min(screenWidth * 0.9, 400);
  const notchWidth = 80;
  const notchHeight = 50;
  const cardHeight = 240;

  // Calculer le total en USD avec le prix réel
  const calculateTotalUSD = () => {
    if (!balance) return 0;
    let total = 0;

    // SOL balance using real price
    total += balance.sol * solPrice;

    // Token balances
    balance.tokens.forEach((token) => {
      if (token.symbol === 'USDC' || token.symbol === 'USDT') {
        // Stablecoins = 1:1 USD
        total += token.uiAmount;
      } else if (token.symbol === 'SOL') {
        // SOL tokens using real price
        total += token.uiAmount * solPrice;
      }
    });

    return total;
  };

  const totalUSD = calculateTotalUSD();

  // Show loading while fetching wallet or balance
  if ((walletLoading || loading) && !balance) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, { width: cardWidth, height: cardHeight, backgroundColor: 'rgba(40, 40, 40, 0.8)', justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: 10 }}>
            {walletLoading ? 'Loading wallet...' : 'Loading balance...'}
          </Text>
        </View>
      </View>
    );
  }

  // Show error if no wallet address
  if (!walletAddress && !walletLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, { width: cardWidth, height: cardHeight, backgroundColor: 'rgba(40, 40, 40, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
          <Text style={{ color: '#ff6b6b', fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>⚠️ Wallet Error</Text>
          <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 13, textAlign: 'center' }}>
            Unable to load wallet address. Please try logging out and back in.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Card with Notch */}
      <View style={{ position: 'relative' }}>
        <MaskedView
          style={{ width: cardWidth, height: cardHeight }}
          maskElement={
            <Svg width={cardWidth} height={cardHeight}>
              {/* Zone de la carte avec encoche arrondie et coins arrondis */}
              <Path
                d={`M 0 24
                   Q 0 0 24 0
                   L ${(cardWidth - notchWidth) / 2 - 8} 0
                   Q ${(cardWidth - notchWidth) / 2} 0 ${(cardWidth - notchWidth) / 2 + 4} 4
                   Q ${cardWidth / 2} ${notchHeight} ${(cardWidth + notchWidth) / 2 - 4} 4
                   Q ${(cardWidth + notchWidth) / 2} 0 ${(cardWidth + notchWidth) / 2 + 8} 0
                   L ${cardWidth - 24} 0
                   Q ${cardWidth} 0 ${cardWidth} 24
                   L ${cardWidth} ${cardHeight - 24}
                   Q ${cardWidth} ${cardHeight} ${cardWidth - 24} ${cardHeight}
                   L 24 ${cardHeight}
                   Q 0 ${cardHeight} 0 ${cardHeight - 24}
                   Z`}
                fill="white"
              />
            </Svg>
          }
        >
          <LinearGradient
            colors={['rgba(40, 40, 40, 1)', 'rgba(20, 20, 20, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.card, { width: cardWidth, height: cardHeight }]}
          >
        {/* Balance Section */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.dollarSign}>$</Text>
            <Text style={styles.balanceAmount}>{totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        </View>

        {/* Action Buttons - Apple Card Style */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={onTopUp}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIconContainer}>
              <Text style={styles.buttonIcon}>+</Text>
            </View>
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={onWithdraw}
            activeOpacity={0.8}
          >
            <Text style={styles.sendButtonIcon}>↑</Text>
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>

          <View style={styles.moreButtonWrapper}>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={onExchange}
              activeOpacity={0.8}
            >
              <View style={styles.moreIconContainer}>
                <Text style={styles.moreIcon}>•••</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
          </LinearGradient>
        </MaskedView>

        {/* Flèche dans l'encoche - EN DEHORS du MaskedView */}
        <View style={{ position: 'absolute', top: -5, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <Svg width={18} height={10}>
            <Path
              d={`M 9 0 L 3 8 M 9 0 L 15 8`}
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginTop: -10,
    zIndex: 2,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    paddingTop: 32,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  balanceSection: {
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingLeft: 8,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 1,
    fontFamily: 'Sansation-Regular',
  },
  dollarSign: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'normal',
    marginRight: 4,
    fontFamily: 'Sansation-Regular',
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 52,
    fontWeight: 'normal',
    marginBottom: 12,
    fontFamily: 'Sansation-Regular',
  },
  balanceChange: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Sansation-Regular',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
    marginTop: 12,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(180, 180, 180, 0.3)',
    paddingVertical: 26,
    paddingHorizontal: 22,
    paddingLeft: 18,
    borderRadius: 38,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    minWidth: 140,
    justifyContent: 'flex-start',
  },
  buttonIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Regular',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Sansation-Regular',
  },
  sendButtonIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Sansation-Regular',
  },
  moreButtonWrapper: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(100, 100, 100, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIcon: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    fontFamily: 'Sansation-Regular',
  },
});
