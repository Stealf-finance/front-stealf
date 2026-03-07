import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';

interface SendModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSimpleTransaction: () => void;
}

export default function SendModal({
  visible,
  onClose,
  onSelectSimpleTransaction,
}: SendModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Send funds</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={onSelectSimpleTransaction}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Send stablecoins</Text>
                  <Text style={styles.optionDescription}>
                    Send to a wallet address
                  </Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.disabledButton]}
              disabled
              activeOpacity={1}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Send Bank transfer</Text>
                  <Text style={styles.optionDescription}>
                    Send to a bank account
                  </Text>
                </View>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 44,
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
    fontFamily: 'Sansation-Bold',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(60,60,60,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  disabledButton: {
    opacity: 0.5,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 2,
    fontFamily: 'Sansation-Regular',
  },
  optionDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Sansation-Regular',
  },
  arrow: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 12,
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(240, 235, 220, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(240, 235, 220, 0.95)',
    fontFamily: 'Sansation-Regular',
  },
});
