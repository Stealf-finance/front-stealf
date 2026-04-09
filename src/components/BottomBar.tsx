import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CardIcon from '../assets/buttons/credit-card-24px.svg';
import TransferIcon from '../assets/buttons/arrow-up-right-24px.svg';

interface BottomBarProps {
  onTransfer: () => void;
}

function BottomBar({ onTransfer }: BottomBarProps) {
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
        onPress={() => Alert.alert('Coming Soon', 'Card will be available soon.')}
        activeOpacity={0.85}
        delayPressIn={100}
        accessibilityRole="button"
        accessibilityLabel="Card"
        style={{
          flex: 1,
          backgroundColor: '#f1ece1',
          borderRadius: 20,
          borderCurve: 'continuous',
          paddingVertical: 18,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 60,
        }}
      >
        <Text style={{ color: '#000', fontSize: 17, fontFamily: 'Sansation-Bold' }}>Card</Text>
        <CardIcon width={18} height={18} color="#000" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onTransfer}
        activeOpacity={0.85}
        delayPressIn={100}
        accessibilityRole="button"
        accessibilityLabel="Transfer"
        style={{
          flex: 1,
          backgroundColor: '#f1ece1',
          borderRadius: 20,
          borderCurve: 'continuous',
          paddingVertical: 18,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 40,
        }}
      >
        <Text style={{ color: '#000', fontSize: 17, fontFamily: 'Sansation-Bold' }}>Transfer</Text>
        <TransferIcon width={18} height={18} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

export default BottomBar;
