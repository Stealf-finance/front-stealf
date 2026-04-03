import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useWalletInfos } from "../../hooks/wallet/useWalletInfos";
import { useAuth } from "../../contexts/AuthContext";
import { useYieldBalance, useYieldStats, useInvalidateYieldBalance } from "../../services/yield/balance";
import DepositWithdrawModal from "./deposit-withdraw";

import DepositIcon from '../../assets/buttons/deposit.svg';
import SendIcon from '../../assets/buttons/send.svg';

const MPC_DELAY_MS = 15_000;

export default function SavingsScreen() {
  const router = useRouter();
  const { userData } = useAuth();
  const { tokens: walletTokens } = useWalletInfos(userData?.stealf_wallet || "");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"deposit" | "withdraw">("deposit");

  const walletSolBalance = walletTokens.find(t => t.tokenMint === null)?.balance ?? 0;

  const { data: yieldStats } = useYieldStats();

  const { data: yieldBalance, isLoading: balanceLoading, isFetching: balanceFetching } = useYieldBalance();
  const invalidateYieldBalance = useInvalidateYieldBalance();
  const [balanceRefreshing, setBalanceRefreshing] = useState(false);

  const handleActionSuccess = useCallback(() => {
    setBalanceRefreshing(true);
    setTimeout(() => {
      invalidateYieldBalance();
      setBalanceRefreshing(false);
    }, MPC_DELAY_MS);
  }, [invalidateYieldBalance]);

  const openModal = (mode: "deposit" | "withdraw") => {
    setModalMode(mode);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#000000', '#000000']}
        style={{ flex: 1 }}
      >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Grabber */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 16 }}
        >
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.8)' }} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Jito SOL</Text>
          <Text style={styles.headerSubtitle}>Earn yield, stay private</Text>
        </View>

        {/* Yield Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>APY</Text>
            <Text style={styles.statValue}>
              {yieldStats?.apy != null ? `${yieldStats.apy.toFixed(2)}%` : "—"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>JitoSOL / SOL</Text>
            <Text style={styles.statValue}>
              {yieldStats?.rate != null ? yieldStats.rate.toFixed(4) : "—"}
            </Text>
          </View>
        </View>

        {/* Yield Balance */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Yield Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>
              {yieldBalance != null ? `${yieldBalance.toFixed(4)} SOL` : "—"}
            </Text>
            {(balanceLoading || balanceFetching || balanceRefreshing) && (
              <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" style={{ marginLeft: 12 }} />
            )}
          </View>
          {balanceRefreshing && (
            <Text style={styles.refreshingText}>Updating balance...</Text>
          )}
        </View>


        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openModal("deposit")}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <DepositIcon />
            </View>
            <Text style={styles.actionLabel}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openModal("withdraw")}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <SendIcon />
            </View>
            <Text style={styles.actionLabel}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.networkNotice}>
          The network can be slow — a deposit may take up to 2 min.
        </Text>
      </ScrollView>
      </LinearGradient>

      <DepositWithdrawModal
        visible={modalVisible}
        mode={modalMode}
        onClose={() => setModalVisible(false)}
        onSuccess={handleActionSuccess}
        availableBalance={walletSolBalance}
        savingsBalance={yieldBalance ?? 0}
        unit="SOL"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.4)",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.35)",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },

  // Balance
  balanceSection: {
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 13,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceAmount: {
    fontSize: 42,
    fontFamily: "Sansation-Light",
    color: "#ffffff",
    letterSpacing: -1,
  },
  refreshingText: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.3)",
    marginTop: 4,
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 48,
    marginBottom: 32,
  },
  actionButton: {
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.6)",
  },

  networkNotice: {
    fontSize: 16,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
    textAlign: "center",
    marginTop: 24,
  },
});
