import { Animated, Dimensions, Easing } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

/**
 * Slide screen in from bottom (open)
 */
export const animateScreenIn = (
  slideAnim: Animated.Value,
  callback?: () => void
) => {
  slideAnim.setValue(SCREEN_HEIGHT);
  Animated.spring(slideAnim, {
    toValue: 0,
    damping: 22,
    stiffness: 200,
    mass: 0.8,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Slide screen out to bottom (close)
 */
export const animateScreenOut = (
  slideAnim: Animated.Value,
  callback?: () => void
) => {
  Animated.timing(slideAnim, {
    toValue: SCREEN_HEIGHT,
    duration: 250,
    easing: Easing.in(Easing.cubic),
    useNativeDriver: true,
  }).start(callback);
};
