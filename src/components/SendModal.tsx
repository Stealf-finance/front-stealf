import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
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
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Send funds</Text>
              <Text style={styles.subtitle}>Choose your method</Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {/* Simple Transaction */}
              <TouchableOpacity
                style={styles.optionButton}
                onPress={onSelectSimpleTransaction}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Simple transaction</Text>
                    <Text style={styles.optionDescription}>
                      Send to a wallet address
                    </Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </View>
              </TouchableOpacity>

              {/* Bank Transfer - Coming Soon */}
              <TouchableOpacity
                style={[styles.optionButton, styles.disabledButton]}
                disabled
                activeOpacity={1}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Bank transfer</Text>
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