/**
 * CrossChainReceiveModal
 *
 * Modal for receiving funds from other chains (Ethereum, Arbitrum, Base, etc.) to Solana
 * via Rhino.fi bridge - with integrated WebView
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';

interface CrossChainReceiveModalProps {
  visible: boolean;
  onClose: () => void;
  recipientAddress: string;
  userEmail?: string;
}

// Supported chains with their display info
const SUPPORTED_CHAINS = [
  { id: 'ETHEREUM', name: 'Ethereum', color: '#627EEA', tokens: ['ETH', 'USDC', 'USDT'] },
  { id: 'ARBITRUM_ONE', name: 'Arbitrum', color: '#28A0F0', tokens: ['ETH', 'USDC', 'USDT'] },
  { id: 'BASE', name: 'Base', color: '#0052FF', tokens: ['ETH', 'USDC'] },
  { id: 'POLYGON', name: 'Polygon', color: '#8247E5', tokens: ['MATIC', 'USDC', 'USDT'] },
  { id: 'OPTIMISM', name: 'Optimism', color: '#FF0420', tokens: ['ETH', 'USDC', 'USDT'] },
];

export default function CrossChainReceiveModal({
  visible,
  onClose,
  recipientAddress,
}: CrossChainReceiveModalProps) {
  const [copied, setCopied] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setCopied(false);
      setShowWebView(false);
      setWebViewUrl('');
      setIsLoading(true);
    }
  }, [visible]);

  // Copy address to clipboard
  const handleCopyAddress = async () => {
    await Clipboard.setStringAsync(recipientAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Rhino.fi widget URL with pre-fill parameters
  const RHINO_API_KEY = 'PUBLIC-b60e4c60-aee2-46e1-bccc-adeaace0f6fd';

  // Open bridge in WebView with specific chain
  const handleOpenChainBridge = (chainId: string) => {
    const widgetUrl = `https://widget.rhino.fi/?apiKey=${RHINO_API_KEY}&chainIn=${chainId}&chainOut=SOLANA&token=USDC&recipient=${recipientAddress}&mode=dark`;
    setWebViewUrl(widgetUrl);
    setShowWebView(true);
    setIsLoading(true);
  };

  // Open general bridge
  const handleOpenBridge = () => {
    const widgetUrl = `https://widget.rhino.fi/?apiKey=${RHINO_API_KEY}&chainOut=SOLANA&token=USDC&recipient=${recipientAddress}&mode=dark`;
    setWebViewUrl(widgetUrl);
    setShowWebView(true);
    setIsLoading(true);
  };

  // Go back from WebView to chain selection
  const handleBackFromWebView = () => {
    setShowWebView(false);
    setWebViewUrl('');
  };

  // Render WebView screen
  if (showWebView) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={handleBackFromWebView}
      >
        <SafeAreaView style={styles.webViewContainer} edges={['top', 'bottom']}>
          {/* WebView Header */}
          <View style={styles.webViewHeader}>
            <View style={styles.headerPlaceholder} />
            <Text style={styles.webViewTitle}>Bridge</Text>
            <TouchableOpacity style={styles.closeWebViewButton} onPress={onClose}>
              <Text style={styles.closeWebViewButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>Loading bridge...</Text>
            </View>
          )}

          {/* WebView */}
          <WebView
            ref={webViewRef}
            source={{ uri: webViewUrl }}
            style={styles.webView}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            allowsBackForwardNavigationGestures={true}
          />

          {/* Info bar */}
          <View style={styles.infoBar}>
            <Text style={styles.infoBarText}>
              Connect your wallet and complete the bridge
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // Render chain selection screen
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Cross-Chain Bridge</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Bridge funds from other chains to your Solana wallet
          </Text>

          {/* Destination Address */}
          <View style={styles.addressSection}>
            <Text style={styles.addressLabel}>Your Solana Address</Text>
            <TouchableOpacity style={styles.addressBox} onPress={handleCopyAddress}>
              <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
                {recipientAddress}
              </Text>
              <Text style={styles.copyText}>{copied ? '✓ Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          {/* Chain Selection */}
          <Text style={styles.sectionTitle}>Select Source Chain</Text>
          <View style={styles.chainGrid}>
            {SUPPORTED_CHAINS.map((chain) => (
              <TouchableOpacity
                key={chain.id}
                style={[styles.chainButton, { borderLeftColor: chain.color }]}
                onPress={() => handleOpenChainBridge(chain.id)}
              >
                <Text style={styles.chainName}>{chain.name}</Text>
                <Text style={styles.chainTokens}>{chain.tokens.join(', ')}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* General Bridge Button */}
          <TouchableOpacity style={styles.bridgeButton} onPress={handleOpenBridge}>
            <Text style={styles.bridgeButtonText}>All Chains</Text>
          </TouchableOpacity>

          {/* Info */}
          <Text style={styles.infoText}>
            The bridge will open inside the app. Connect your wallet to complete the transfer.
          </Text>

          {/* Close Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: 'white',
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 24,
  },
  addressSection: {
    marginBottom: 24,
  },
  addressLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
  },
  addressBox: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
  },
  addressText: {
    fontSize: 14,
    color: 'white',
    fontFamily: 'monospace',
    flex: 1,
    marginRight: 12,
  },
  copyText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  chainGrid: {
    gap: 12,
    marginBottom: 24,
  },
  chainButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chainName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  chainTokens: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  bridgeButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  bridgeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  // WebView styles
  webViewContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  webViewTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeWebViewButton: {
    padding: 8,
  },
  closeWebViewButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '300',
  },
  headerPlaceholder: {
    width: 40,
  },
  webView: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 50,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
    fontSize: 14,
  },
  infoBar: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoBarText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    textAlign: 'center',
  },
});
