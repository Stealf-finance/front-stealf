/**
 * PrivacyToggle
 * Toggle switch for enabling/disabling privacy mode in swaps
 * Shows warning when privacy is disabled
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  Pressable,
} from 'react-native';

interface PrivacyToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export default function PrivacyToggle({ enabled, onChange }: PrivacyToggleProps) {
  const [showWarning, setShowWarning] = useState(false);

  const handleToggle = (value: boolean) => {
    if (!value) {
      // Show warning before disabling privacy
      setShowWarning(true);
    } else {
      onChange(true);
    }
  };

  const confirmDisablePrivacy = () => {
    setShowWarning(false);
    onChange(false);
  };

  const cancelDisablePrivacy = () => {
    setShowWarning(false);
    // Keep privacy enabled
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.labelContainer}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🛡️</Text>
          </View>
          <View>
            <Text style={styles.label}>Private</Text>
            <Text style={styles.description}>
              {enabled ? 'Transaction is private' : 'Transaction is public'}
            </Text>
          </View>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{
            false: 'rgba(255, 255, 255, 0.1)',
            true: 'rgba(76, 175, 80, 0.5)',
          }}
          thumbColor={enabled ? '#4CAF50' : 'rgba(255, 255, 255, 0.6)'}
          ios_backgroundColor="rgba(255, 255, 255, 0.1)"
        />
      </View>

      {/* Warning Modal */}
      <Modal
        visible={showWarning}
        transparent
        animationType="fade"
        onRequestClose={cancelDisablePrivacy}
      >
        <Pressable style={styles.modalOverlay} onPress={cancelDisablePrivacy}>
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.warningIconContainer}>
              <Text style={styles.warningIcon}>⚠️</Text>
            </View>

            <Text style={styles.warningTitle}>Disable Privacy?</Text>

            <Text style={styles.warningText}>
              Without privacy mode, your swap transaction will be visible on-chain.
              Anyone can see:
            </Text>

            <View style={styles.warningList}>
              <Text style={styles.warningListItem}>• Your wallet address</Text>
              <Text style={styles.warningListItem}>• The tokens you're swapping</Text>
              <Text style={styles.warningListItem}>• The amounts involved</Text>
              <Text style={styles.warningListItem}>• Transaction timing</Text>
            </View>

            <Text style={styles.warningNote}>
              Privacy mode routes your swap through Avalanche for enhanced anonymity.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelDisablePrivacy}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Keep Private</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmDisablePrivacy}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Disable Privacy</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  description: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'rgba(30, 30, 30, 0.98)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  warningIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 48,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  warningList: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningListItem: {
    fontSize: 13,
    color: 'rgba(255, 193, 7, 0.9)',
    marginBottom: 6,
  },
  warningNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
