import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface SegmentedControlProps {
  tabs: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export default function SegmentedControl({ tabs, activeIndex, onChange }: SegmentedControlProps) {
  const tabLayouts = React.useRef<{ x: number; width: number }[]>([]);
  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);

  const onTabLayout = useCallback(
    (index: number, e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      tabLayouts.current[index] = { x, width };
      if (index === activeIndex) {
        pillX.value = x;
        pillWidth.value = width;
      }
    },
    [activeIndex],
  );

  const handlePress = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      const layout = tabLayouts.current[index];
      if (!layout) return;
      const timingConfig = { duration: 250, easing: Easing.out(Easing.cubic) };
      pillX.value = withTiming(layout.x, timingConfig);
      pillWidth.value = withTiming(layout.width, timingConfig);
      onChange(index);
    },
    [activeIndex, onChange],
  );

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillWidth.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pill, pillStyle]} />
      {tabs.map((tab, i) => (
        <TouchableOpacity
          key={tab}
          style={styles.tab}
          activeOpacity={0.7}
          onPress={() => handlePress(i)}
          onLayout={(e) => onTabLayout(i, e)}
        >
          <Text
            style={[
              styles.label,
              i === activeIndex ? styles.labelActive : styles.labelInactive,
            ]}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 6,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  label: {
    fontSize: 20,
    fontFamily: 'Sansation-Regular',
  },
  labelActive: {
    color: '#000000',
    fontFamily: 'Sansation-Bold',
  },
  labelInactive: {
    color: 'rgba(187, 187, 187, 0.25)',
  },
});
