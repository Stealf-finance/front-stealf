import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useYieldDashboard, useYieldProof, useBatchStatus, type VaultType } from "../../hooks/useYield";
import { useWalletInfos } from "../../hooks/useWalletInfos";
import { useAuth } from "../../contexts/AuthContext";
import { useReserveProof } from "../../hooks/useReserveProof";
import DepositWithdrawModal from "./DepositWithdrawModal";
import type { PageType } from "../../navigation/types";

type AssetTab = "sol" | "usdc";

interface SavingsScreenProps {
  onNavigateToPage: (page: PageType) => void;
  currentPage: PageType;
}

export default function SavingsScreen({
  onNavigateToPage,
  currentPage,
}: SavingsScreenProps) {
  const { data: dashboard, isLoading, refetch } = useYieldDashboard();
  const { userData } = useAuth();
  const { balance: walletBalance } = useWalletInfos(userData?.cash_wallet || "");
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"deposit" | "withdraw">("deposit");
  const [activeTab, setActiveTab] = useState<AssetTab>("sol");
  const [privacyMode, setPrivacyMode] = useState(false);
  const [selectedSolVault, setSelectedSolVault] = useState<"sol_jito" | "sol_marinade">("sol_jito");

  // Arcium: batch staking status (denomination staking in progress)
  const { data: batchStatus } = useBatchStatus();

  // Arcium: proof of reserve (permissionless solvency check)
  const { isSolvent, isLoading: reserveLoading } = useReserveProof();

  // Arcium: proof of yield (only in private SOL mode with a balance)
  // Use dashboard directly since solBalance hasn't been derived yet at hook-call time
  const { data: yieldProof } = useYieldProof(
    selectedSolVault,
    100, // 1% threshold = 100 bps
    privacyMode && activeTab === "sol" && (dashboard?.balance?.totalDeposited ?? 0) > 0
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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
  const decimals = activeTab === "sol" ? 4 : 2;

  const openModal = (mode: "deposit" | "withdraw") => {
    setModalMode(mode);
    setModalVisible(true);
  };

  // Determine vault type for the modal
  const modalVaultType: VaultType =
    activeTab === "usdc" ? "usdc_kamino" : selectedSolVault;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Savings</Text>
          <Text style={styles.headerSubtitle}>Earn yield on your assets</Text>
        </View>
        {/* Reserve proof indicator */}
        {!reserveLoading && isSolvent === false && (
          Alert.alert(
            "Anomalie détectée",
            "Le vault ne passe pas la vérification de réserve. Contactez le support.",
            [{ text: "OK" }]
          ) as any
        )}
        {!reserveLoading && isSolvent === true && (
          <View style={styles.solventBadge}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#22c55e" />
            <Text style={styles.solventText}>Vault vérifié</Text>
          </View>
        )}
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
          onPress={() => setActiveTab("usdc")}
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
                <Text style={styles.apyCardLabel}>Protocole de staking</Text>
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
                          <Text style={styles.protocolBadgeText}>actif</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.protocolApy, selectedSolVault === "sol_jito" && styles.protocolApyActive]}>
                      {apy?.jitoApy ?? "—"}%
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
                          <Text style={styles.protocolBadgeText}>actif</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.protocolApy, selectedSolVault === "sol_marinade" && styles.protocolApyActive]}>
                      {apy?.marinadeApy ?? "—"}%
                    </Text>
                    <Text style={styles.protocolSub}>mSOL</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.apyRow}>
                <View style={styles.apyItem}>
                  <Text style={styles.apyProtocol}>Kamino Lending</Text>
                  <Text style={styles.apyRate}>{apy?.usdcKaminoApy ?? "—"}%</Text>
                </View>
              </View>
            )}
          </View>

          {/* Batch staking status banner (Arcium denomination processing) */}
          {batchStatus && batchStatus.status === "pending" && (
            <View style={styles.batchBanner}>
              <ActivityIndicator size="small" color="#4ADE80" />
              <View style={styles.batchBannerText}>
                <Text style={styles.batchBannerTitle}>Staking en cours</Text>
                <Text style={styles.batchBannerSub}>
                  Anti-corrélation active
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
              <Text style={styles.batchBannerTitle}>Staking confirmé</Text>
            </View>
          )}

          {/* Arcium Proof-of-Yield badge (private SOL mode only) */}
          {privacyMode && activeTab === "sol" && yieldProof && (
            <View style={styles.proofBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#4ADE80" />
              <Text style={styles.proofBadgeText}>
                {yieldProof.exceedsThreshold
                  ? `Rendement ≥ ${(yieldProof.thresholdBps / 100).toFixed(0)}% vérifié via MPC`
                  : `Preuve de rendement en attente`}
              </Text>
            </View>
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
              <View>
                <Text style={[styles.privacyBarTitle, privacyMode && styles.privacyBarTitleActive]}>
                  {privacyMode ? "Private Mode" : "Standard Mode"}
                </Text>
                <Text style={styles.privacyBarSubtext}>
                  {privacyMode
                    ? "Arcium chiffré • Privacy Pool routé"
                    : "Activer pour chiffrer via Arcium MPC"}
                </Text>
              </View>
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

          {/* History */}
          {filteredHistory.length > 0 && (
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
          )}

          {filteredHistory.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>No savings yet</Text>
              <Text style={styles.emptySubtext}>
                {activeTab === "sol"
                  ? "Deposit SOL to start earning ~7.5% APY via Jito"
                  : "Deposit USDC to start earning yield via Kamino"}
              </Text>
            </View>
          )}
        </>
      )}

      <DepositWithdrawModal
        visible={modalVisible}
        mode={modalMode}
        onClose={() => setModalVisible(false)}
        availableBalance={walletBalance ?? 0}
        savingsBalance={currentBalance?.currentValue ?? 0}
        vaultType={modalVaultType}
        unit={unit}
        isPrivate={privacyMode}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 40,
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
    marginBottom: 32,
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
  historySection: {
    marginTop: 8,
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
    paddingTop: 48,
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
