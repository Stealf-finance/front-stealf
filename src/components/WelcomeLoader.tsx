import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, StatusBar } from "react-native";

type Props = {
  logo: React.ReactNode;
  visible?: boolean;
  startOpaque?: boolean;
  durationInMs?: number;
  fadeOutTrigger?: boolean;
  onFadeOutEnd?: () => void;
};

export function WelcomeLoader({
  logo,
  visible = true,
  startOpaque = false,
  durationInMs = 520,
  fadeOutTrigger = false,
  onFadeOutEnd,
}: Props) {
  const scale = useRef(new Animated.Value(startOpaque ? 1 : 0.6)).current;
  const opacity = useRef(new Animated.Value(startOpaque ? 1 : 0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  // Spinner rotation loop
  useEffect(() => {
    if (!visible) return;

    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();

    return () => loop.stop();
  }, [visible, spin]);

  useEffect(() => {
    if (!visible || startOpaque) return;

    scale.setValue(0.6);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: Math.max(180, Math.floor(durationInMs * 0.6)),
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: Math.max(200, Math.floor(durationInMs * 0.65)),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: Math.max(140, Math.floor(durationInMs * 0.35)),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [visible, startOpaque, durationInMs, opacity, scale]);

  useEffect(() => {
    if (!fadeOutTrigger) return;

    Animated.timing(opacity, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onFadeOutEnd?.();
    });
  }, [fadeOutTrigger, opacity, onFadeOutEnd]);

  if (!visible) return null;

  const spinRotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        {logo}
      </Animated.View>

      <Animated.View
        style={[
          styles.spinner,
          {
            opacity,
            transform: [{ rotate: spinRotation }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    marginTop: 32,
  },
});
