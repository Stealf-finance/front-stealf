import { Animated } from 'react-native';

export const animatePageTransition = (
  fadeAnim: Animated.Value,
  slideAnim: Animated.Value,
  direction: 'left' | 'right',
  onComplete: () => void
) => {
  onComplete();
};

export const animateScreenTransition = (
  fadeAnim: Animated.Value,
  slideAnim: Animated.Value,
  onComplete: () => void
) => {
  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }),
    Animated.timing(slideAnim, {
      toValue: 50,
      duration: 200,
      useNativeDriver: true,
    }),
  ]).start(() => {
    onComplete();
    slideAnim.setValue(-50);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  });
};

export const animateSlideIn = (
  fadeAnim: Animated.Value,
  slideAnim: Animated.Value,
  fromValue: number = 100
) => {
  slideAnim.setValue(fromValue);
  fadeAnim.setValue(0);

  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }),
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }),
  ]).start();
};

export const animateSlideOut = (
  fadeAnim: Animated.Value,
  slideAnim: Animated.Value,
  toValue: number = 100,
  onComplete: () => void
) => {
  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }),
    Animated.timing(slideAnim, {
      toValue: toValue,
      duration: 200,
      useNativeDriver: true,
    }),
  ]).start(onComplete);
};
