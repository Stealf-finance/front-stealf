import React, { useEffect, useRef } from 'react';
import { View, Animated, Image, StyleSheet } from 'react-native';

interface LoginSuccessAnimationProps {
  visible: boolean;
  onComplete?: () => void;
}

export default function LoginSuccessAnimation({
  visible,
  onComplete
}: LoginSuccessAnimationProps) {
  const logoAnimation = useRef(new Animated.Value(0)).current;
  const blurAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(blurAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.timing(logoAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.delay(800),
          Animated.timing(logoAnimation, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (onComplete) {
          onComplete();
        }
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: blurAnimation,
        },
      ]}
    >
      <Animated.Image
        source={require('../../assets/logo-transparent.png')}
        style={[
          styles.logo,
          {
            opacity: logoAnimation,
            transform: [
              {
                scale: logoAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                }),
              },
            ],
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
  },
});
