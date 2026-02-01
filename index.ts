import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// CRITICAL: Polyfill ExpoSecureStore BEFORE any other imports
// This fixes the Grid SDK compatibility issue with expo-secure-store
if (typeof global !== 'undefined') {
  try {
    const { requireNativeModule } = require('expo-modules-core');
    const originalRequireNativeModule = requireNativeModule;

    // Override requireNativeModule to wrap ExpoSecureStore with .default property
    require('expo-modules-core').requireNativeModule = function(moduleName) {
      const module = originalRequireNativeModule(moduleName);

      if (moduleName === 'ExpoSecureStore') {
        // Grid SDK expects ExpoSecureStore.default.setValueWithKeyAsync
        // But the native module exposes ExpoSecureStore.setValueWithKeyAsync directly
        // This wrapper adds the .default property for compatibility
        return {
          ...module,
          default: {
            setValueWithKeyAsync: module.setValueWithKeyAsync,
            getValueWithKeyAsync: module.getValueWithKeyAsync,
            deleteValueWithKeyAsync: module.deleteValueWithKeyAsync,
            ...module,
          },
        };
      }

      return module;
    };
  } catch (error) {
    console.warn('Failed to apply ExpoSecureStore polyfill:', error);
  }
}

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
