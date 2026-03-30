import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

type Props = {
  children: React.ReactNode;
  isReady: boolean;
};

export function AnimatedSplash({ children, isReady }: Props) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isReady) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        SplashScreen.hideAsync();
      });
    }
  }, [isReady, fadeAnim]);

  if (!isReady) {
    return null;
  }

  return (
    <View style={styles.container}>
      {children}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.splash,
          { opacity: fadeAnim },
        ]}
        pointerEvents="none"
      >
        <Image
          source={require('../assets/logo/splash.png')}
          style={styles.image}
          contentFit="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splash: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '90%',
    height: '90%',
  },
});