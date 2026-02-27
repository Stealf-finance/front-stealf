import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useYieldDashboard, useBatchStatus, type VaultType } from "../../hooks/useYield";

import { useYieldSnapshots } from "../../hooks/useYieldSnapshots";
import { useYieldProofFromSnapshots } from "../../hooks/useYieldProofFromSnapshots";
import { useWalletInfos } from "../../hooks/useWalletInfos";
import { useAuth } from "../../contexts/AuthContext";
import DepositWithdrawModal from "./DepositWithdrawModal";
type AssetTab = "sol" | "usdc";

export default function SavingsScreen() {
  const { data: dashboard, isLoading } = useYieldDashboard();
  const { userData } = useAuth();
  const { tokens: walletTokens } = useWalletInfos(userData?.cash_wallet || "");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"deposit" | "withdraw">("deposit");
  const [usdcComingSoonVisible, setUsdcComingSoonVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<AssetTab>("sol");
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const walletSolBalance = walletTokens.find(t => t.tokenMint === null)?.balance ?? 0;
  const walletUsdcBalance = walletTokens.find(t => t.tokenMint === USDC_MINT)?.balance ?? 0;
  const walletAvailable = activeTab === 'sol' ? walletSolBalance : walletUsdcBalance;
  const [privacyMode, setPrivacyMode] = useState(false);
  const [selectedSolVault, setSelectedSolVault] = useState<"sol_jito" | "sol_marinade">("sol_jito");

  // Arcium: batch staking status (denomination staking in progress)
  const { data: batchStatus } = useBatchStatus();

  // Arcium: balance snapshots + proof from snapshots
  const { data: snapshots = [] } = useYieldSnapshots(selectedSolVault);
  const canProve = activeTab === "sol" && snapshots.length >= 2;
  const proofParams = canProve
    ? {
        startIndex: snapshots[0].snapshotIndex,
        endIndex: snapshots[snapshots.length - 1].snapshotIndex,
        thresholdBps: 100,
        vaultType: selectedSolVault,
      }
    : null;
  const {
    data: snapshotProof,
    isFetching: proofFetching,
    refetch: triggerProof,
  } = useYieldProofFromSnapshots(proofParams);




  const solBalance = dashboard?.balance;
  const usdcBalance = dashboard?.usdc;
  const apy = dashboard?.apy;
  const history = dashboard?.history || [];

  // Filter history by active tab
  const filteredHistory = history.filter((item) =>
    activeTab === "usdc"
      ? item.vaultType === "usdc_kamino"
      : item.vaultType !== "usdc_kamino"
  );

  const currentBalance = activeTab === "sol" ? solBalance : usdcBalance;
  const unit = activeTab === "sol" ? "SOL" : "USDC";
  const decimals = activeTab === "sol" ? 3 : 2;

  const openModal = (mode: "deposit" | "withdraw") => {
    if (activeTab === "usdc") {
      setUsdcComingSoonVisible(true);
      return;
    }
    setModalMode(mode);
    setModalVisible(true);
  };

  // Determine vault type for the modal
  const modalVaultType: VaultType =
    activeTab === "usdc" ? "usdc_kamino" : selectedSolVault;

  return (
    <View style={styles.container}>
      {/* Section fixe — ne scroll pas */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Savings</Text>
          <Text style={styles.headerSubtitle}>Earn yield on your assets</Text>
        </View>

        {/* Asset Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "sol" && styles.tabActive]}
            onPress={() => setActiveTab("sol")}
          >
            <Text style={[styles.tabText, activeTab === "sol" && styles.tabTextActive]}>
              SOL
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "usdc" && styles.tabActive]}
            onPress={() => setUsdcComingSoonVisible(true)}
          >
            <Text style={[styles.tabText, activeTab === "usdc" && styles.tabTextActive]}>
              USDC
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.5)" />
          </View>
        ) : (
          <>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Total Value</Text>
              <Text style={styles.balanceAmount}>
                {(currentBalance?.currentValue ?? 0).toFixed(decimals)} {unit}
              </Text>

              <View style={styles.yieldRow}>
                <View style={styles.yieldItem}>
                  <Text style={styles.yieldLabel}>Deposited</Text>
                  <Text style={styles.yieldValue}>
                    {(currentBalance?.totalDeposited ?? 0).toFixed(decimals)} {unit}
                  </Text>
                </View>
                <View style={styles.yieldItem}>
                  <Text style={styles.yieldLabel}>Yield Earned</Text>
                  <Text
                    style={[
                      styles.yieldValue,
                      { color: (currentBalance?.yieldEarned ?? 0) >= 0 ? "#4ADE80" : "#F87171" },
                    ]}
                  >
                    +{(currentBalance?.yieldEarned ?? 0).toFixed(decimals)} {unit}
                  </Text>
                </View>
                <View style={styles.yieldItem}>
                  <Text style={styles.yieldLabel}>Return</Text>
                  <Text
                    style={[
                      styles.yieldValue,
                      { color: (currentBalance?.yieldPercent ?? 0) >= 0 ? "#4ADE80" : "#F87171" },
                    ]}
                  >
                    {(currentBalance?.yieldPercent ?? 0).toFixed(2)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* APY Card / Protocol Selector */}
            <View style={styles.apyCard}>
              {activeTab === "sol" ? (
                <>
                  <Text style={styles.apyCardLabel}>Staking protocol</Text>
                  <View style={styles.protocolRow}>
                    <TouchableOpacity
                      style={[styles.protocolItem, selectedSolVault === "sol_jito" && styles.protocolItemActive]}
                      onPress={() => setSelectedSolVault("sol_jito")}
                      activeOpacity={0.7}
                    >
                      <View style={styles.protocolHeader}>
                        <Text style={[styles.protocolName, selectedSolVault === "sol_jito" && styles.protocolNameActive]}>
                          Jito
                        </Text>
                        {selectedSolVault === "sol_jito" && (
                          <View style={styles.protocolBadge}>
                            <Text style={styles.protocolBadgeText}>active</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.protocolApy, selectedSolVault === "sol_jito" && styles.protocolApyActive]}>
                        {apy?.jitoApy != null ? apy.jitoApy.toFixed(2) : "—"}%
                      </Text>
                      <Text style={styles.protocolSub}>JitoSOL</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.protocolItem, selectedSolVault === "sol_marinade" && styles.protocolItemActive]}
                      onPress={() => setSelectedSolVault("sol_marinade")}
                      activeOpacity={0.7}
                    >
                      <View style={styles.protocolHeader}>
                        <Text style={[styles.protocolName, selectedSolVault === "sol_marinade" && styles.protocolNameActive]}>
                          Marinade
                        </Text>
                        {selectedSolVault === "sol_marinade" && (
                          <View style={styles.protocolBadge}>
                            <Text style={styles.protocolBadgeText}>active</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.protocolApy, selectedSolVault === "sol_marinade" && styles.protocolApyActive]}>
                        {apy?.marinadeApy != null ? apy.marinadeApy.toFixed(2) : "—"}%
                      </Text>
                      <Text style={styles.protocolSub}>mSOL</Text>
                    </TouchableOpacity>
                  </View>

                </>
              ) : (
                <View style={styles.apyRow}>
                  <View style={styles.apyItem}>
                    <Text style={styles.apyProtocol}>Kamino Lending</Text>
                    <Text style={styles.apyRate}>{apy?.usdcKaminoApy != null ? apy.usdcKaminoApy.toFixed(2) : "—"}%</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Batch staking status banner */}
            {batchStatus && batchStatus.status === "pending" && (
              <View style={styles.batchBanner}>
                <ActivityIndicator size="small" color="#4ADE80" />
                <View style={styles.batchBannerText}>
                  <Text style={styles.batchBannerTitle}>Staking in progress</Text>
                  <Text style={styles.batchBannerSub}>
                    Anti-correlation active
                    {batchStatus.estimatedMinutes != null
                      ? ` • ~${batchStatus.estimatedMinutes} min`
                      : ""}
                  </Text>
                </View>
                <Ionicons name="lock-closed" size={16} color="rgba(74,222,128,0.5)" />
              </View>
            )}
            {batchStatus && batchStatus.status === "complete" && (
              <View style={[styles.batchBanner, styles.batchBannerComplete]}>
                <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
                <Text style={styles.batchBannerTitle}>Staking confirmed</Text>
              </View>
            )}

            {/* Proof from snapshots button — SOL only, needs ≥2 snapshots */}
            {canProve && (
              <TouchableOpacity
                style={styles.proveButton}
                onPress={() => triggerProof()}
                activeOpacity={0.7}
                disabled={proofFetching}
              >
                {proofFetching ? (
                  <ActivityIndicator size="small" color="#4ADE80" />
                ) : (
                  <Ionicons name="shield-checkmark-outline" size={16} color="#4ADE80" />
                )}
                <Text style={styles.proveButtonText}>
                  {proofFetching
                    ? "Computing…"
                    : snapshotProof?.available === false
                    ? "Proof unavailable"
                    : snapshotProof?.exceedsThreshold === true
                    ? "Yield proven ✓"
                    : snapshotProof?.exceedsThreshold === false
                    ? "Threshold not reached"
                    : "Prove my yield"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Privacy Toggle */}
            <TouchableOpacity
              style={[styles.privacyBar, privacyMode && styles.privacyBarActive]}
              onPress={() => setPrivacyMode(!privacyMode)}
              activeOpacity={0.7}
            >
              <View style={styles.privacyBarLeft}>
                <Ionicons
                  name={privacyMode ? "shield-checkmark" : "shield-outline"}
                  size={20}
                  color={privacyMode ? "#4ADE80" : "rgba(255,255,255,0.5)"}
                />
                <Text style={[styles.privacyBarTitle, privacyMode && styles.privacyBarTitleActive]}>
                  {privacyMode ? "Private Mode" : "Standard Mode"}
                </Text>
              </View>
              <View style={[styles.privacySwitch, privacyMode && styles.privacySwitchActive]}>
                <View style={[styles.privacySwitchThumb, privacyMode && styles.privacySwitchThumbActive]} />
              </View>
            </TouchableOpacity>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openModal("deposit")}
              >
                <View style={[styles.actionIcon, privacyMode && styles.actionIconPrivate]}>
                  <Ionicons name="arrow-down" size={20} color="#fff" />
                </View>
                <Text style={styles.actionLabel}>Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openModal("withdraw")}
              >
                <View style={[styles.actionIcon, privacyMode && styles.actionIconPrivate]}>
                  <Ionicons name="arrow-up" size={20} color="#fff" />
                </View>
                <Text style={styles.actionLabel}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Section history — scroll indépendant */}
      {!isLoading && (
        <ScrollView
          style={styles.historyScroll}
          contentContainerStyle={styles.historyContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredHistory.length > 0 ? (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>History</Text>
              {filteredHistory.map((item, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <Ionicons
                      name={item.type === "deposit" ? "arrow-down-circle" : "arrow-up-circle"}
                      size={24}
                      color={item.type === "deposit" ? "#4ADE80" : "#F87171"}
                    />
                    <View style={styles.historyText}>
                      <Text style={styles.historyType}>
                        {item.type === "deposit" ? "Deposit" : "Withdrawal"}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(item.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historyAmount}>
                    {item.type === "deposit" ? "+" : "-"}
                    {item.amount.toFixed(decimals)} {unit}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptySubtext}>
                {activeTab === "sol"
                  ? "Deposit SOL to start earning"
                  : "Deposit USDC to start earning"}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <DepositWithdrawModal
        visible={modalVisible}
        mode={modalMode}
        onClose={() => setModalVisible(false)}
        availableBalance={walletAvailable}
        savingsBalance={currentBalance?.currentValue ?? 0}
        vaultType={modalVaultType}
        unit={unit}
        isPrivate={privacyMode}
      />

      {/* USDC yield — coming soon */}
      <Modal
        visible={usdcComingSoonVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUsdcComingSoonVisible(false)}
      >
        <View style={styles.csOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setUsdcComingSoonVisible(false)}
          />
          <View style={styles.csSheet}>
            <View style={styles.csHeader}>
              <Text style={styles.csTitle}>USDC Yield</Text>
              <TouchableOpacity style={styles.csCloseBtn} onPress={() => setUsdcComingSoonVisible(false)} activeOpacity={0.8}>
                <Text style={styles.csCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.csContent}>
              <View style={styles.csIconCircle}>
                <Text style={styles.csIconText}>$</Text>
              </View>
              <View style={styles.csBadge}>
                <Text style={styles.csBadgeText}>Coming soon</Text>
              </View>
              <Text style={styles.csBigTitle}>Private USDC Yield</Text>
              <Text style={styles.csSubtitle}>
                Earn yield on your USDC privately via lending, without revealing your balance on-chain.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // USDC coming soon modal
  csOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  csSheet: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 44,
  },
  csHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  csTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'Sansation-Bold',
  },
  csCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(60,60,60,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  csCloseBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: 'bold',
  },
  csContent: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  csIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  csIconText: {
    fontSize: 32,
    color: '#ffffff',
    fontFamily: 'Sansation-Bold',
  },
  csBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  csBadgeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: 'Sansation-Regular',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  csBigTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'Sansation-Bold',
  },
  csSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontFamily: 'Sansation-Regular',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  // App styles
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 8,
  },
  header: {
    marginBottom: 20,
  },
  privacyBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  privacyBarActive: {
    backgroundColor: "rgba(74,222,128,0.08)",
    borderColor: "rgba(74,222,128,0.25)",
  },
  privacyBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  privacyBarTitle: {
    fontSize: 15,
    fontFamily: "Sansation-Bold",
    color: "rgba(255,255,255,0.6)",
  },
  privacyBarTitleActive: {
    color: "#4ADE80",
  },
  privacyBarSubtext: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.3)",
    marginTop: 1,
  },
  privacySwitch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  privacySwitchActive: {
    backgroundColor: "rgba(74,222,128,0.4)",
  },
  privacySwitchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  privacySwitchThumbActive: {
    alignSelf: "flex-end" as const,
    backgroundColor: "#fff",
  },
  actionIconPrivate: {
    backgroundColor: "rgba(74,222,128,0.15)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
  },
  // Tabs
  tabRow: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  tabText: {
    fontSize: 15,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.4)",
  },
  tabTextActive: {
    color: "#ffffff",
    fontFamily: "Sansation-Bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  balanceCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.5)",
  },
  balanceAmount: {
    fontSize: 36,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
    marginTop: 4,
    marginBottom: 16,
  },
  yieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  yieldItem: {
    flex: 1,
  },
  yieldLabel: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 4,
  },
  yieldValue: {
    fontSize: 14,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },
  apyCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  apyRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  apyItem: {
    alignItems: "center",
  },
  apyProtocol: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 4,
  },
  apyRate: {
    fontSize: 18,
    fontFamily: "Sansation-Bold",
    color: "#4ADE80",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginBottom: 12,
  },
  actionButton: {
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.8)",
  },
  historyScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  historyContent: {
    paddingBottom: 40,
  },
  historySection: {
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyText: {},
  historyType: {
    fontSize: 14,
    fontFamily: "Sansation-Regular",
    color: "#ffffff",
  },
  historyDate: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.4)",
  },
  historyAmount: {
    fontSize: 14,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 8,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Sansation-Bold",
    color: "rgba(255,255,255,0.5)",
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
  },
  // Batch staking banner
  batchBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74,222,128,0.06)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 10,
  },
  batchBannerComplete: {
    backgroundColor: "rgba(74,222,128,0.04)",
    borderColor: "rgba(74,222,128,0.12)",
  },
  batchBannerText: {
    flex: 1,
  },
  batchBannerTitle: {
    fontSize: 13,
    fontFamily: "Sansation-Bold",
    color: "#4ADE80",
  },
  batchBannerSub: {
    fontSize: 11,
    fontFamily: "Sansation-Regular",
    color: "rgba(74,222,128,0.6)",
    marginTop: 1,
  },
  // Protocol selector
  apyCardLabel: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 10,
  },
  protocolRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  protocolItem: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  protocolItemActive: {
    backgroundColor: "rgba(74,222,128,0.06)",
    borderColor: "rgba(74,222,128,0.3)",
  },
  protocolHeader: {
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  protocolName: {
    fontSize: 14,
    fontFamily: "Sansation-Bold",
    color: "rgba(255,255,255,0.5)",
  },
  protocolNameActive: {
    color: "#ffffff",
  },
  protocolBadge: {
    backgroundColor: "rgba(74,222,128,0.15)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  protocolBadgeText: {
    fontSize: 10,
    fontFamily: "Sansation-Bold",
    color: "#4ADE80",
  },
  protocolApy: {
    fontSize: 22,
    fontFamily: "Sansation-Bold",
    color: "rgba(255,255,255,0.3)",
  },
  protocolApyActive: {
    color: "#4ADE80",
  },
  protocolSub: {
    fontSize: 11,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.3)",
    marginTop: 2,
  },
  // Proof-of-yield badge
  proofBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74,222,128,0.05)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  proofBadgeText: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(74,222,128,0.8)",
    flex: 1,
  },
  proveButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: "rgba(74,222,128,0.08)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.25)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  proveButtonText: {
    fontSize: 13,
    fontFamily: "Sansation-Regular",
    color: "#4ADE80",
  },
  solventBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  solventText: {
    fontSize: 11,
    fontFamily: "Sansation-Regular",
    color: "#22c55e",
  },
});
