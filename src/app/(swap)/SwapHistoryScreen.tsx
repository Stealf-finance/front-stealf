/**
 * SwapHistoryScreen
 * Display swap history stored locally
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { useSwapHistory, buildExplorerUrl } from '../../hooks/useSwapHistory';
import type { SwapHistoryEntry } from '../../types/swap';

interface SwapHistoryScreenProps {
  onBack: () => void;
}

export default function SwapHistoryScreen({ onBack }: SwapHistoryScreenProps) {
  const { history, isLoading, clearHistory } = useSwapHistory();

  const [fontsLoaded] = useFonts({
    'Sansation-Regular': require('../../assets/font/Sansation/Sansation-Regular.ttf'),
    'Sansation-Bold': require('../../assets/font/Sansation/Sansation-Bold.ttf'),
    'Sansation-Light': require('../../assets/font/Sansation/Sansation-Light.ttf'),
  });

  if (!fontsLoaded) return null;

  const handleOpenExplorer = (transactionId: string) => {
    if (transactionId) {
      const url = buildExplorerUrl(transactionId);
      Linking.openURL(url);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const renderSwapItem = ({ item }: { item: SwapHistoryEntry }) => {
    const isCompleted = item.status === 'completed';

    return (
      <TouchableOpacity
        style={styles.swapItem}
        onPress={() => handleOpenExplorer(item.transactionId)}
        activeOpacity={0.7}
        disabled={!item.transactionId}
      >
        <View style={styles.swapLeft}>
          <View style={styles.tokenIcons}>
            {item.sourceToken.logoUri ? (
              <Image source={{ uri: item.sourceToken.logoUri }} style={styles.tokenIcon} />
            ) : (
              <View style={styles.tokenIconPlaceholder}>
                <Text style={styles.tokenIconText}>{item.sourceToken.symbol[0]}</Text>
              </View>
            )}
            <View style={styles.arrowBadge}>
              <Text style={styles.arrowText}>→</Text>
            </View>
            {item.destinationToken.logoUri ? (
              <Image
                source={{ uri: item.destinationToken.logoUri }}
                style={[styles.tokenIcon, styles.tokenIconRight]}
              />
            ) : (
              <View style={[styles.tokenIconPlaceholder, styles.tokenIconRight]}>
                <Text style={styles.tokenIconText}>{item.destinationToken.symbol[0]}</Text>
              </View>
            )}
          </View>
          <View style={styles.swapInfo}>
            <Text style={styles.swapPair}>
              {item.sourceToken.symbol} → {item.destinationToken.symbol}
            </Text>
            <Text style={styles.swapDetails}>
              {item.inputAmount} → {item.outputAmount}
            </Text>
          </View>
        </View>

        <View style={styles.swapRight}>
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusBadge, isCompleted ? styles.statusSuccess : styles.statusFailed]}>
              <Text style={[styles.statusText, isCompleted ? styles.statusTextSuccess : styles.statusTextFailed]}>
                {isCompleted ? '✓' : '✗'}
              </Text>
            </View>
            {item.privacyEnabled && (
              <View style={styles.privacyBadge}>
                <Text style={styles.privacyText}>🛡️</Text>
              </View>
            )}
          </View>
          <Text style={styles.swapTime}>{formatDate(item.timestamp)}</Text>
        </View>
      </TouchableOpacity>
    );
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
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Swap History</Text>
          {history.length > 0 ? (
            <TouchableOpacity style={styles.clearButton} onPress={clearHistory} activeOpacity={0.8}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="rgba(255, 255, 255, 0.5)" />
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📜</Text>
            <Text style={styles.emptyTitle}>No swaps yet</Text>
            <Text style={styles.emptySubtitle}>
              Your swap history will appear here after you complete a swap
            </Text>
          </View>
        ) : (
          <FlatList
            data={history}
            renderItem={renderSwapItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <Text style={styles.privacyNoticeText}>
            🔒 History is stored locally on your device only
          </Text>
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
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontFamily: 'Sansation-Regular',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
    fontFamily: 'Sansation-Bold',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Sansation-Regular',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  swapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  swapLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tokenIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  tokenIconPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenIconText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  tokenIconRight: {
    marginLeft: -8,
  },
  arrowBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: -6,
    zIndex: 1,
  },
  arrowText: {
    fontSize: 10,
    color: 'white',
  },
  swapInfo: {
    flex: 1,
  },
  swapPair: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  swapDetails: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
    fontFamily: 'Sansation-Regular',
  },
  swapRight: {
    alignItems: 'flex-end',
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusSuccess: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  statusFailed: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: '#4CAF50',
  },
  statusTextFailed: {
    color: '#FF6B6B',
  },
  privacyBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyText: {
    fontSize: 10,
  },
  swapTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Sansation-Regular',
  },
  privacyNotice: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  privacyNoticeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
    fontFamily: 'Sansation-Regular',
  },
});
