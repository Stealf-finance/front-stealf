import React, { useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
  clamp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const THUMB_SIZE = 52;
const RAIL_PADDING = 4;
const THRESHOLD = 0.8;

interface SlideToConfirmProps {
  onConfirm: () => void;
  loading: boolean;
  label?: string;
}

function hapticLight() {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function SlideToConfirm({ onConfirm, loading, label = 'Slide to confirm' }: SlideToConfirmProps) {
  const translateX = useSharedValue(0);
  const railWidth = useSharedValue(0);
  const confirmed = useSharedValue(false);

  const maxSlide = () => {
    'worklet';
    return Math.max(railWidth.value - THUMB_SIZE - RAIL_PADDING * 2, 0);
  };

  const fireConfirm = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onConfirm();
    // Reset after a short delay if loading didn't kick in (validation error)
    setTimeout(() => {
      if (!loading) {
        confirmed.value = false;
        translateX.value = withSpring(0, { damping: 20, stiffness: 150, overshootClamping: true });
      }
    }, 300);
  }, [onConfirm, loading, confirmed, translateX]);

  const pan = Gesture.Pan()
    .enabled(!loading)
    .onUpdate((e) => {
      'worklet';
      if (confirmed.value) return;
      translateX.value = clamp(e.translationX, 0, maxSlide());
    })
    .onEnd(() => {
      'worklet';
      if (confirmed.value) return;
      const max = maxSlide();
      if (max > 0 && translateX.value / max >= THRESHOLD) {
        confirmed.value = true;
        translateX.value = withSpring(max, { damping: 20, stiffness: 200 }, () => {
          runOnJS(fireConfirm)();
        });
      } else {
        runOnJS(hapticLight)();
        translateX.value = withSpring(0, { damping: 20, stiffness: 150, overshootClamping: true });
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const labelStyle = useAnimatedStyle(() => {
    const max = maxSlide();
    return {
      opacity: max > 0 ? interpolate(translateX.value, [0, max * 0.5], [1, 0], 'clamp') : 1,
    };
  });

  // Reset when loading goes false
  React.useEffect(() => {
    if (!loading && confirmed.value) {
      confirmed.value = false;
      translateX.value = withSpring(0, { damping: 20, stiffness: 150, overshootClamping: true });
    }
  }, [loading]);

  return (
    <View
      style={styles.rail}
      onLayout={(e) => {
        railWidth.value = e.nativeEvent.layout.width;
      }}
    >
      <Animated.Text style={[styles.label, labelStyle]}>
        {label}
      </Animated.Text>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.thumb, thumbStyle]}>
          {loading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Ionicons name="arrow-forward" size={22} color="#000" />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    paddingHorizontal: RAIL_PADDING,
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 16,
    fontFamily: 'Sansation-Regular',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: 'rgba(240, 235, 220, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 22,
    color: '#000',
    fontWeight: 'bold',
  },
});
