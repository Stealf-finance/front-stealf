/**
 * TokenSelector
 * Modal component for selecting tokens in swap
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Image,
} from 'react-native';
import type { TokenInfo } from '../../types/swap';
import { SUPPORTED_TOKENS } from '../../constants/tokens';

interface TokenSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (token: TokenInfo) => void;
  selectedToken?: TokenInfo | null;
  balances?: Record<string, string>;
  excludeToken?: TokenInfo | null;
}

export default function TokenSelector({
  visible,
  onClose,
  onSelect,
  selectedToken,
  balances = {},
  excludeToken,
}: TokenSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tokens based on search and exclusion
  const filteredTokens = useMemo(() => {
    let tokens = SUPPORTED_TOKENS;

    // Exclude the other selected token to prevent same-token swap
    if (excludeToken) {
      tokens = tokens.filter((t) => t.mint !== excludeToken.mint);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      tokens = tokens.filter(
        (t) =>
          t.symbol.toLowerCase().includes(query) ||
          t.name.toLowerCase().includes(query)
      );
    }

    // Sort: SOL first, then alphabetically
    return tokens.sort((a, b) => {
      if (a.symbol === 'SOL') return -1;
      if (b.symbol === 'SOL') return 1;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [searchQuery, excludeToken]);

  const handleSelect = (token: TokenInfo) => {
    onSelect(token);
    onClose();
    setSearchQuery('');
  };

  const renderToken = ({ item }: { item: TokenInfo }) => {
    const isSelected = selectedToken?.mint === item.mint;
    const balance = balances[item.mint] || '0';

    return (
      <TouchableOpacity
        style={[styles.tokenItem, isSelected && styles.tokenItemSelected]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.tokenLeft}>
          {item.logoUri ? (
            <Image source={{ uri: item.logoUri }} style={styles.tokenLogo} />
          ) : (
            <View style={styles.tokenLogoPlaceholder}>
              <Text style={styles.tokenLogoText}>{item.symbol[0]}</Text>
            </View>
          )}
          <View style={styles.tokenInfo}>
            <Text style={styles.tokenSymbol}>{item.symbol}</Text>
            <Text style={styles.tokenName}>{item.name}</Text>
          </View>
        </View>
        <View style={styles.tokenRight}>
          <Text style={styles.tokenBalance}>{formatBalance(balance, item.decimals)}</Text>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Select Token</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or symbol"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Token List */}
            <FlatList
              data={filteredTokens}
              renderItem={renderToken}
              keyExtractor={(item) => item.mint}
              style={styles.tokenList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No tokens found</Text>
                </View>
              }
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function formatBalance(balance: string, decimals: number): string {
  const num = parseFloat(balance);
  if (isNaN(num) || num === 0) return '0';
  if (num < 0.001) return '< 0.001';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(decimals, 4),
  });
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'rgba(20, 20, 20, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.5)',
    padding: 8,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tokenList: {
    maxHeight: 400,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  tokenItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  tokenLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tokenLogoText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  tokenName: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  tokenRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenBalance: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  checkmark: {
    fontSize: 16,
    color: '#4CAF50',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
