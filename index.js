// Load polyfills BEFORE expo-router scans the app directory
// This ensures Buffer, crypto.subtle, etc. are available
// when module-level code in screens executes
import './polyfills';
import 'react-native-gesture-handler';

// Now load expo-router entry
import 'expo-router/entry';
