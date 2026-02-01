import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';

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
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Choose your level of privacy</Text>
              <Text style={styles.subtitle}>{username}</Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {/* Basic Transfer Option */}
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

              {/* Private Transfer Option */}
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

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
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
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    fontFamily: 'Sansation-Regular',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Sansation-Regular',
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
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
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Sansation-Regular',
  },
});