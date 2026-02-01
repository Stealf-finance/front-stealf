import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';

interface AddFundsPrivacyModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPrivateCash: () => void;
  onSelectSimpleDeposit: () => void;
}

export default function AddFundsPrivacyModal({
  visible,
  onClose,
  onSelectPrivateCash,
  onSelectSimpleDeposit,
}: AddFundsPrivacyModalProps) {
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
              <Text style={styles.title}>Deposit</Text>
              <Text style={styles.subtitle}>Choose your preferred method</Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {/* Deposit Private Cash */}
              <TouchableOpacity
                style={styles.optionButton}
                onPress={onSelectPrivateCash}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Deposit private cash</Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </View>
              </TouchableOpacity>

              {/* Simple Deposit */}
              <TouchableOpacity
                style={styles.optionButton}
                onPress={onSelectSimpleDeposit}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Simple deposit</Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
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
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
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
  },
  optionDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
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
  },
});
