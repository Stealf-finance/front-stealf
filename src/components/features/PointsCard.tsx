import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ACTION_LABELS: Record<string, string> = {
  stealth_transfer: 'Stealth transaction',
  claim_stealth: 'Stealth transaction',
  yield_deposit: 'Yield deposit',
  yield_withdraw: 'Yield withdraw',
  daily_bonus: 'Daily bonus',
};

interface HistoryEntry {
  action: string;
  points: number;
  createdAt: string;
}

interface PointsCardProps {
  points: number;
  history: HistoryEntry[];
}

export default function PointsCard({ points, history }: PointsCardProps) {
  const recent = history.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>Rewards</Text>
          <View style={styles.totalRow}>
            <Text style={styles.pointsValue}>{points.toLocaleString()}</Text>
            <Text style={styles.pointsUnit}> pts</Text>
          </View>
        </View>
        <View style={styles.starBadge}>
          <Text style={styles.starText}>✦</Text>
        </View>
      </View>

      {recent.length > 0 && (
        <View style={styles.history}>
          {recent.map((entry, i) => (
            <View key={i} style={styles.historyRow}>
              <Text style={styles.historyLabel}>{ACTION_LABELS[entry.action] ?? entry.action}</Text>
              <Text style={styles.historyPts}>+{entry.points}</Text>
            </View>
          ))}
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    marginBottom: 4,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pointsValue: {
    color: '#ffffff',
    fontSize: 32,
    fontFamily: 'Sansation-Light',
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  pointsUnit: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 16,
    fontFamily: 'Sansation-Regular',
  },
  starBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: -2,
  },
  history: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
    paddingTop: 12,
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
  },
  historyPts: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'Sansation-Bold',
    fontWeight: '600',
  },
});
