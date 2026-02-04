import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseAppStateOptions {
  onForeground?: () => void;
  onBackground?: () => void;
}

/**
 * Hook to listen to AppState changes
 * Calls onForeground when app comes to foreground
 * Calls onBackground when app goes to background
 */
export function useAppState({ onForeground, onBackground }: UseAppStateOptions) {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      // App coming to foreground
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        onForeground?.();
      }

      // App going to background
      if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        onBackground?.();
      }

      appState.current = nextAppState;
    },
    [onForeground, onBackground]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  return {
    currentState: appState.current,
  };
}
