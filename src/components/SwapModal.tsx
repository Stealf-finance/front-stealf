import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';

interface SwapModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SwapModal({ visible, onClose }: SwapModalProps) {
  const handleClose = () => onClose();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Swap</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.8}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Coming soon */}
          <View style={styles.comingSoonContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>⇄</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Coming soon</Text>
            </View>
            <Text style={styles.comingSoonTitle}>Private Swap</Text>
            <Text style={styles.comingSoonSubtitle}>
              Swap SOL ↔ USDC privately, without leaving a trace on-chain.
            </Text>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  comingSoonContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconText: {
    fontSize: 28,
    color: '#ffffff',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  comingSoonTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'Sansation-Bold',
  },
  comingSoonSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
});
