/**
 * StealthReceiveModal — Modal pour recevoir des paiements stealth.
 *
 * Affiche la meta-adresse, un QR code et un bouton "Copier".
 * Requirements : 1.6, 6.3
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useStealthAddress } from '../hooks/useStealthAddress';

interface StealthReceiveModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function StealthReceiveModal({ visible, onClose }: StealthReceiveModalProps) {
  const { metaAddress, isLoading, error } = useStealthAddress();

  const handleCopy = async () => {
    if (!metaAddress) return;
    await Clipboard.setStringAsync(metaAddress);
    Alert.alert('Copied', 'Meta-address copied to clipboard');
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.container} activeOpacity={1} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Receive (Stealth)</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <Text style={styles.loadingText}>Initializing stealth keys...</Text>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : metaAddress ? (
              <>
                {/* QR Code */}
                <View style={styles.qrContainer}>
                  <QRCode
                    value={metaAddress}
                    size={200}
                    color="#FFFFFF"
                    backgroundColor="#000000"
                  />
                </View>

                {/* Subtitle */}
                <Text style={styles.subtitle}>
                  Share this meta-address to receive private stealth payments
                </Text>

                {/* Meta-address display */}
                <View style={styles.addressBox}>
                  <Text style={styles.addressText} numberOfLines={3} selectable>
                    {metaAddress}
                  </Text>
                </View>

                {/* Copy button */}
                <TouchableOpacity style={styles.copyButton} onPress={handleCopy} activeOpacity={0.8}>
                  <Text style={styles.copyButtonText}>Copy meta-address</Text>
                </TouchableOpacity>

                {/* Privacy note */}
                <Text style={styles.privacyNote}>
                  🔒 Each payment is sent to a unique address derived from your meta-address. The sender cannot see your main wallet.
                </Text>
              </>
            ) : null}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Sansation-Bold',
  },
  closeBtn: {
    padding: 4,
  },
  closeIcon: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Sansation-Regular',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Sansation-Regular',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#000',
    borderRadius: 12,
    marginBottom: 20,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Sansation-Regular',
    lineHeight: 20,
  },
  addressBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 16,
  },
  addressText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    lineHeight: 20,
  },
  copyButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Sansation-Bold',
  },
  privacyNote: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'Sansation-Regular',
    lineHeight: 18,
  },
});
