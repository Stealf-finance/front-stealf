import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletInfos } from '../../hooks/useWalletInfos';

interface PrivacyBalanceCardProps {
  onTopUp?: () => void;
  onWithdraw?: () => void;
  onExchange?: () => void;
}

export default function BalanceCardPrivacy({
  onTopUp,
  onWithdraw,
  onExchange
}: PrivacyBalanceCardProps) {

  const { userData } = useAuth();

  const { balance, isLoadingBalance, balanceError } = useWalletInfos(
    userData?.stealf_wallet || ''
  );

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = Math.min(screenWidth * 0.9, 400);
  const cardHeight = 240;

  const totalUSD = balance || 0;
  
  return (
    <View style={styles.container}>
      {/* Main Card - Purple Theme */}
      <BlurView
        intensity={30}
        tint="dark"
        style={[styles.blurContainer, { width: cardWidth, height: cardHeight }]}
      >
        <LinearGradient
          colors={['rgba(30, 20, 45, 0.4)', 'rgba(20, 12, 32, 0.4)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.card, styles.cardWithNotch, { width: cardWidth, height: cardHeight }]}
        >
          {/* Balance Section */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Privacy Balance</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingLeft: 0 }}>
              <Text style={styles.dollarSign}>$</Text>
              {isLoadingBalance ? (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginLeft: 8 }} />
              ) : balanceError ? (
                <Text style={[styles.balanceAmount, { fontSize: 24 }]}>
                  Error
                </Text>
              ) : (
                <Text style={styles.balanceAmount}>
                  {totalUSD.toFixed(2)}
                </Text>
              )}
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
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginTop: 0,
    zIndex: 1,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    paddingTop: 24,
    paddingBottom: 24,
    borderWidth: 0,
    justifyContent: 'center',
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
    marginTop: 0,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  cardWithNotch: {
    borderTopLeftRadius: 0,
  },
});
