import { Animated } from 'react-native';


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