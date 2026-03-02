import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { usePoints } from '../hooks/usePoints';

interface PointsContextValue {
  points: number;
  showToast: (earned: number) => void;
}

const PointsContext = createContext<PointsContextValue>({
  points: 0,
  showToast: () => {},
});

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const { points } = usePoints();
  const [toastPts, setToastPts] = useState(0);
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((earned: number) => {
    if (earned <= 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    setToastPts(earned);
    setVisible(true);
    opacity.setValue(0);
    translateY.setValue(-20);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start();

    timerRef.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
        setVisible(false);
      });
    }, 2500);
  }, []);

  return (
    <PointsContext.Provider value={{ points, showToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[styles.toast, { opacity, transform: [{ translateY }] }]}
          pointerEvents="none"
        >
          <Text style={styles.toastText}>+{toastPts} pts</Text>
          <View style={styles.toastBadge}>
            <Text style={styles.toastBadgeText}>✦</Text>
          </View>
        </Animated.View>
      )}
    </PointsContext.Provider>
  );
}

export function usePointsContext() {
  return useContext(PointsContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(20, 20, 20, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 9999,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Sansation-Bold',
    fontWeight: '700',
  },
  toastBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastBadgeText: {
    color: '#ffffff',
    fontSize: 11,
  },
});
