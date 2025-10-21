import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
}

export default function Header({
  title,
  showBackButton = false,
  onBackPress,
  rightComponent,
}: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {showBackButton && onBackPress && (
          <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        )}
      </View>

      {title && (
        <View style={styles.centerSection}>
          <Text style={styles.title}>{title}</Text>
        </View>
      )}

      <View style={styles.rightSection}>
        {rightComponent}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    zIndex: 10,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '300',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
