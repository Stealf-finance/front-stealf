import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatsCardProps {
  totalUsers: number;
  totalTransactions: number;
  dailyLogins: number;
  isLoading: boolean;
}

export default function StatsCard({ totalUsers, totalTransactions, dailyLogins, isLoading }: StatsCardProps) {
  const display = (val: number) => (isLoading ? '—' : val.toLocaleString());

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Community</Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.value}>{display(totalUsers)}</Text>
          <Text style={styles.statLabel}>members</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.value}>{display(totalTransactions)}</Text>
          <Text style={styles.statLabel}>transactions</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.value}>{display(dailyLogins)}</Text>
          <Text style={styles.statLabel}>active today</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'Sansation-Light',
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontFamily: 'Sansation-Regular',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
});
