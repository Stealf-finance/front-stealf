import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Animated, Easing, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CardScreenProps {
  onClose: () => void;
  cardType: 'stealf' | 'gmpc';
}

export default function CardScreen({ onClose, cardType }: CardScreenProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleClose = () => {
    // Fade out + slide down avant de fermer
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Animated.View style={[styles.container, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }]
    }]}>

        <LinearGradient
          colors={['#000000', '#000000', '#000000']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.background}
        >

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleClose}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* Titre de la carte */}
      <View style={styles.cardTitleContainer}>
        <Text style={styles.cardName}>
          {cardType === 'stealf' ? 'Basic *8903' : 'gMPC Card'}
        </Text>
        <Text style={styles.cardType}>
          {cardType === 'stealf' ? 'Virtual Card' : 'Secure Card'}
        </Text>
      </View>

      {/* Carte à la même position que sur HomeScreen */}
      <View style={styles.cardContainer}>
        <ImageBackground
          source={cardType === 'stealf'
            ? require('../../assets/stealf-card.png')
            : require('../../assets/gMPC-card.png')}
          style={styles.cardImage}
          resizeMode="cover"
          imageStyle={{ borderRadius: 20 }}
        />
      </View>

      {/* Boutons d'action */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Coming Soon', 'Card details will be available soon.')}>
          <View style={styles.actionIconContainer}>
            <Image source={require('../../assets/infos.png')} style={styles.infoIcon} resizeMode="contain" />
          </View>
          <Text style={styles.actionLabel}>Infos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Coming Soon', 'Card freeze will be available soon.')}>
          <View style={styles.actionIconContainer}>
            <Image source={require('../../assets/freeze.png')} style={styles.freezeIcon} resizeMode="contain" />
          </View>
          <Text style={styles.actionLabel}>Freeze</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Coming Soon', 'Card deletion will be available soon.')}>
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>✕</Text>
          </View>
          <Text style={styles.actionLabel}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions Section */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>

        <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.7} onPress={() => Alert.alert('Coming Soon', 'Apple Pay integration will be available soon.')}>
          <View style={styles.quickActionContent}>
            <View style={styles.quickActionIconCircle}>
              <Image
                source={require('../../assets/appleWallet.png')}
                style={styles.quickActionIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.quickActionText}>Add to Apple Pay</Text>
          </View>
          <Text style={styles.quickActionArrow}>›</Text>
        </TouchableOpacity>
      </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  background: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 80,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100001,
  },
  backButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardContainer: {
    position: 'absolute',
    top: 150,
    left: '50%',
    marginLeft: '-37%',
    width: '85%',
    maxWidth: 320,
    height: 200,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  actionsContainer: {
    position: 'absolute',
    top: 380,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(60, 60, 60, 0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  freezeIcon: {
    width: 24,
    height: 24,
    tintColor: '#ffffff',
  },
  infoIcon: {
    width: 24,
    height: 24,
    tintColor: '#ffffff',
  },
  cardTitleContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100000,
  },
  cardName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardType: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  secondCardTitleContainer: {
    position: 'absolute',
    top: 370,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100000,
  },
  secondCardContainer: {
    position: 'absolute',
    top: 420,
    left: '50%',
    marginLeft: '-37%',
    width: '85%',
    maxWidth: 320,
    height: 200,
  },
  quickActionsContainer: {
    position: 'absolute',
    top: 650,
    left: 24,
    right: 24,
  },
  quickActionsTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickActionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionIconText: {
    fontSize: 20,
  },
  quickActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  quickActionArrow: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 24,
    fontWeight: '300',
  },
  quickActionIcon: {
    width: 24,
    height: 24,
  },
});
