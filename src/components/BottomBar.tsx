import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShieldIcon from '../assets/buttons/shield.svg';
import TransferIcon from '../assets/buttons/arrow-up-right-24px.svg';

interface BottomBarProps {
  onShield: () => void;
  onTransfer: () => void;
}

function BottomBar({ onShield, onTransfer }: BottomBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 40,
      paddingBottom: insets.bottom + 20,
      paddingTop: 12,
      flexDirection: 'row',
      gap: 10,
    }}>
      <TouchableOpacity
        onPress={onShield}
        activeOpacity={0.85}
        delayPressIn={100}
        accessibilityRole="button"
        accessibilityLabel="Shield assets"
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
          borderRadius: 20,
          borderCurve: 'continuous',
          paddingVertical: 22,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Text style={{ color: '#000', fontSize: 17, fontFamily: 'Sansation-Bold' }}>Shield</Text>
        <ShieldIcon width={18} height={18} color="#000" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onTransfer}
        activeOpacity={0.85}
        delayPressIn={100}
        accessibilityRole="button"
        accessibilityLabel="Transfer"
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
          borderRadius: 20,
          borderCurve: 'continuous',
          paddingVertical: 22,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Text style={{ color: '#000', fontSize: 17, fontFamily: 'Sansation-Bold' }}>Transfer</Text>
        <TransferIcon width={18} height={18} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

export default BottomBar;
