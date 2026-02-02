import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, StatusBar } from "react-native";

type Props = {
  logo: React.ReactNode;         // <Image .../> ou <Svg .../>
  visible?: boolean;             // affiche/masque le loader
  durationInMs?: number;         // vitesse d'arrivée
  fadeOutTrigger?: boolean;      // déclenche la sortie (quand data loaded)
  onFadeOutEnd?: () => void;
};

export function WelcomeLoader({
  logo,
  visible = true,
  durationInMs = 520,
  fadeOutTrigger = false,
  onFadeOutEnd,
}: Props) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Reset
    scale.setValue(0.6);
    opacity.setValue(0);

    // Pop-in
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
  }, [visible, durationInMs, opacity, scale]);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        {logo}
      </Animated.View>
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
});
