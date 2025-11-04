import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppBackground from '../../components/common/AppBackground';

interface InfoScreenProps {
  onBack: () => void;
}

export default function InfoScreen({ onBack }: InfoScreenProps) {
  const [spendLimitEnabled, setSpendLimitEnabled] = useState(false);
  const [spendLimit, setSpendLimit] = useState(500);

  return (
    <AppBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Information</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Spend Limit Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={22} color="white" />
            <Text style={styles.sectionTitle}>Spend Limit</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Set a daily spending limit to protect your funds from unauthorized transactions.
          </Text>

          <View style={styles.limitToggle}>
            <View style={styles.limitToggleLeft}>
              <Text style={styles.limitToggleTitle}>Enable Spend Limit</Text>
              <Text style={styles.limitToggleSubtitle}>
                {spendLimitEnabled ? `$${spendLimit}/day` : 'Disabled'}
              </Text>
            </View>
            <Switch
              value={spendLimitEnabled}
              onValueChange={setSpendLimitEnabled}
              trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: 'rgba(255, 255, 255, 0.4)' }}
              thumbColor={spendLimitEnabled ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          {spendLimitEnabled && (
            <View style={styles.limitSliderContainer}>
              <Text style={styles.limitAmountText}>${spendLimit}</Text>
              <View style={styles.limitOptionsContainer}>
                {[100, 250, 500, 1000, 2500].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.limitOption,
                      spendLimit === amount && styles.limitOptionActive
                    ]}
                    onPress={() => setSpendLimit(amount)}
                  >
                    <Text style={[
                      styles.limitOptionText,
                      spendLimit === amount && styles.limitOptionTextActive
                    ]}>
                      ${amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backIcon: {
    fontSize: 24,
    color: 'white',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Sansation-Bold',
  },
  sectionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: 'Sansation-Regular',
  },
  limitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 15,
  },
  limitToggleLeft: {
    flex: 1,
  },
  limitToggleTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Sansation-Bold',
  },
  limitToggleSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
  },
  limitSliderContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  limitAmountText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Sansation-Bold',
  },
  limitOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  limitOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  limitOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  limitOptionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Sansation-Bold',
  },
  limitOptionTextActive: {
    color: 'white',
  },
});
