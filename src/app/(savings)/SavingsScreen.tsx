import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ComebackIcon from '../../assets/buttons/comeback.svg';
import { useYieldDashboard, useBatchStatus } from "../../hooks/yield/useYield";
import { useWalletInfos } from "../../hooks/wallet/useWalletInfos";
import { useAuth } from "../../contexts/AuthContext";
import DepositWithdrawModal from "./DepositWithdrawModal";

import DepositIcon from '../../assets/buttons/deposit.svg';
import SendIcon from '../../assets/buttons/send.svg';

interface SavingsScreenProps {
  onBack?: () => void;
}

export default function SavingsScreen({ onBack }: SavingsScreenProps) {
  const { data: dashboard, isLoading } = useYieldDashboard();
  const { userData } = useAuth();
  const { tokens: walletTokens } = useWalletInfos(userData?.cash_wallet || "");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"deposit" | "withdraw">("deposit");

  const walletSolBalance = walletTokens.find(t => t.tokenMint === null)?.balance ?? 0;
  const { data: batchStatus } = useBatchStatus();

  const solBalance = dashboard?.balance;
  const apy = dashboard?.apy;
  const history = dashboard?.history || [];
  const filteredHistory = history.filter((item) => item.vaultType !== "usdc_kamino");

  const openModal = (mode: "deposit" | "withdraw") => {
    setModalMode(mode);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <ComebackIcon width={18} height={18} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Grow</Text>
          <Text style={styles.headerSubtitle}>Earn yield on your SOL</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.5)" />
          </View>
        ) : (
          <>
            {/* Balance */}
            <View style={styles.balanceSection}>
              <Text style={styles.balanceLabel}>Total Value</Text>
              <Text style={styles.balanceAmount}>
                {(solBalance?.currentValue ?? 0).toFixed(3)} SOL
              </Text>
            </View>

            {/* Yield stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Deposited</Text>
                <Text style={styles.statValue}>
                  {(solBalance?.totalDeposited ?? 0).toFixed(3)}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Yield</Text>
                <Text style={[styles.statValue, styles.statValueHighlight]}>
                  +{(solBalance?.yieldEarned ?? 0).toFixed(3)}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Return</Text>
                <Text style={[styles.statValue, styles.statValueHighlight]}>
                  {(solBalance?.yieldPercent ?? 0).toFixed(2)}%
                </Text>
              </View>
            </View>

            {/* Protocol — Jito */}
            <Text style={styles.sectionLabel}>Protocol</Text>
            <View style={styles.protocolCard}>
              <View style={styles.protocolTop}>
                <Text style={styles.protocolName}>Jito</Text>
                <Text style={styles.protocolSub}>JitoSOL</Text>
              </View>
              <Text style={styles.protocolApy}>
                {apy?.jitoApy != null ? apy.jitoApy.toFixed(2) : "—"}% APY
              </Text>
            </View>

            {/* Batch staking status */}
            {batchStatus && batchStatus.status === "pending" && (
              <View style={styles.batchBanner}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.batchTitle}>Staking in progress</Text>
                  <Text style={styles.batchSub}>
                    Anti-correlation active
                    {batchStatus.estimatedMinutes != null
                      ? ` · ~${batchStatus.estimatedMinutes} min`
                      : ""}
                  </Text>
                </View>
              </View>
            )}
            {batchStatus && batchStatus.status === "complete" && (
              <View style={styles.batchBanner}>
                <Ionicons name="checkmark-circle" size={18} color="rgba(255,255,255,0.7)" />
                <Text style={styles.batchTitle}>Staking confirmed</Text>
              </View>
            )}

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

            {/* History */}
            {filteredHistory.length > 0 ? (
              <View style={styles.historySection}>
                <Text style={styles.sectionLabel}>History</Text>
                {filteredHistory.map((item, index) => (
                  <View key={index} style={styles.historyItem}>
                    <View style={styles.historyLeft}>
                      <View style={styles.historyDot}>
                        <Ionicons
                          name={item.type === "deposit" ? "arrow-down" : "arrow-up"}
                          size={14}
                          color="rgba(255,255,255,0.6)"
                        />
                      </View>
                      <View>
                        <Text style={styles.historyType}>
                          {item.type === "deposit" ? "Deposit" : "Withdrawal"}
                        </Text>
                        <Text style={styles.historyDate}>
                          {new Date(item.timestamp).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyAmount}>
                      {item.type === "deposit" ? "+" : "-"}{item.amount.toFixed(3)} SOL
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Deposit SOL to start earning</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <DepositWithdrawModal
        visible={modalVisible}
        mode={modalMode}
        onClose={() => setModalVisible(false)}
        availableBalance={walletSolBalance}
        savingsBalance={solBalance?.currentValue ?? 0}
        vaultType="sol_jito"
        unit="SOL"
        isPrivate={true}
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
  loadingContainer: {
    paddingTop: 100,
    alignItems: "center",
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
  balanceAmount: {
    fontSize: 42,
    fontFamily: "Sansation-Light",
    color: "#ffffff",
    letterSpacing: -1,
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
    fontSize: 15,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },
  statValueHighlight: {
    color: "rgba(255,255,255,0.8)",
  },

  // Section label
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.35)",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Protocol
  protocolCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 20,
  },
  protocolTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  protocolName: {
    fontSize: 15,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },
  protocolApy: {
    fontSize: 24,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },
  protocolSub: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.35)",
  },

  // Batch banner
  batchBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 12,
  },
  batchTitle: {
    fontSize: 13,
    fontFamily: "Sansation-Bold",
    color: "rgba(255,255,255,0.8)",
  },
  batchSub: {
    fontSize: 11,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
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

  // History
  historySection: {
    marginTop: 4,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  historyType: {
    fontSize: 14,
    fontFamily: "Sansation-Regular",
    color: "#ffffff",
  },
  historyDate: {
    fontSize: 11,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.3)",
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 14,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },

  // Empty
  emptyState: {
    alignItems: "center",
    paddingTop: 24,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.25)",
  },
});
