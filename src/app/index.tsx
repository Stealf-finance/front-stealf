import { View } from 'react-native';

// This is the initial route — a black screen hidden behind the splash.
// RootNavigator in _layout.tsx handles the redirect to (auth) or (main)
// once auth state is resolved.
export default function IndexGate() {
  return <View style={{ flex: 1, backgroundColor: '#000' }} />;
}
