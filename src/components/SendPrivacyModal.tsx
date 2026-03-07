import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';

interface SendPrivacyModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectBasicTransfer: () => void;
  onSelectPrivateTransfer: () => void;
  username?: string;
  basicTransferBalance: number;
  privateTransferBalance: number;
}

export default function SendPrivacyModal({
  visible,
  onClose,
  onSelectBasicTransfer,
  onSelectPrivateTransfer,
  username = 'Username',
  basicTransferBalance,
  privateTransferBalance,
}: SendPrivacyModalProps) {
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
            <Text style={styles.title}>Choose your level of privacy</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={onSelectBasicTransfer}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Basic transfer</Text>
                  <Text style={styles.optionDescription}>Standard transaction</Text>
                </View>
                <Text style={styles.optionAmount}>{basicTransferBalance.toFixed(2)} USD</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={onSelectPrivateTransfer}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Private transfer</Text>
                  <Text style={styles.optionDescription}>Privacy Cash balance</Text>
                </View>
                <Text style={styles.optionAmount}>{privateTransferBalance.toFixed(2)} SOL</Text>
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
  optionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
    marginLeft: 12,
  },
});
