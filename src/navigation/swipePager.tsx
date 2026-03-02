import React, { useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

const SPRING = {
  damping: 18,
  stiffness: 160,
  mass: 0.9,
};

interface RevolutPagerProps {
  pages: Array<{
    key: string;
    render: () => React.ReactElement;
  }>;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  translateXShared?: SharedValue<number>;
}

export interface RevolutPagerRef {
  scrollToIndex: (index: number) => void;
}

export const RevolutPager = forwardRef<RevolutPagerRef, RevolutPagerProps>(({
  pages,
  initialIndex = 0,
  onIndexChange,
  translateXShared,
}, ref) => {
  const count = pages.length;
  const translateX = translateXShared || useSharedValue(-initialIndex * width);
  const index = useSharedValue(initialIndex);

  useImperativeHandle(ref, () => ({
    scrollToIndex: (targetIndex: number) => {
      'worklet';
      index.value = targetIndex;
      translateX.value = withSpring(-targetIndex * width, SPRING);

      if (onIndexChange) {
        runOnJS(onIndexChange)(targetIndex);
      }
    },
  }));

  const clamp = (v: number, min: number, max: number) => {
    'worklet';
    return Math.min(Math.max(v, min), max);
  };

  const startX = useSharedValue(0);
  const startIndex = useSharedValue(initialIndex);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-8, 8])
    .onStart(() => {
      startX.value = translateX.value;
      startIndex.value = Math.round(-translateX.value / width);
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      const minX = -(count - 1) * width;

      if (next > 0) {
        translateX.value = next * 0.35;
      } else if (next < minX) {
        translateX.value = minX + (next - minX) * 0.35;
      } else {
        translateX.value = next;
      }
    })
    .onEnd((e) => {
      const dragDelta = translateX.value - startX.value;
      const threshold = width * 0.3;
      let nextIndex: number;

      if (Math.abs(e.velocityX) > 600) {
        nextIndex = e.velocityX > 0 ? startIndex.value - 1 : startIndex.value + 1;
      } else if (dragDelta > threshold) {
        nextIndex = startIndex.value - 1;
      } else if (dragDelta < -threshold) {
        nextIndex = startIndex.value + 1;
      } else {
        nextIndex = startIndex.value;
      }

      nextIndex = clamp(nextIndex, 0, count - 1);

      index.value = nextIndex;
      translateX.value = withSpring(-nextIndex * width, SPRING);

      if (onIndexChange) {
        runOnJS(onIndexChange)(nextIndex);
      }
    });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.container, { width: width * count }, containerStyle]}>
        {pages.map((page, i) => {
          const pageStyle = useAnimatedStyle(() => {
            const progress = Math.abs(
              (translateX.value + i * width) / width
            );

            return {
              opacity: interpolate(
                progress,
                [0, 1],
                [1, 0.92],
                Extrapolate.CLAMP
              ),
              transform: [
                {
                  scale: interpolate(
                    progress,
                    [0, 1],
                    [1, 0.98],
                    Extrapolate.CLAMP
                  ),
                },
              ],
            };
          });

          return (
            <Animated.View
              key={page.key}
              style={[styles.page, pageStyle]}
            >
              {page.render()}
            </Animated.View>
          );
        })}
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: width * 3,
    flex: 1,
  },
  page: {
    width,
    flex: 1,
  },
});
