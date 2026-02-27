import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import {
  useLendingPosition,
  useLendingRates,
  useDepositCollateral,
  useBorrowUsdc,
  useRepayUsdc,
  useWithdrawCollateral,
  type LendingPosition,
  type LendingRates,
} from "../../hooks/useLending";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "";

function useSolPrice() {
  return useQuery<number>({
    queryKey: ["sol-price-borrow"],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/api/lending/sol-price`);
      if (!r.ok) throw new Error(`SOL price fetch failed: ${r.status}`);
      const d = await r.json();
      return (d?.solPriceUsd as number) ?? 0;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 3,
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen =
  | "landing"           // pas de position — landing + explication
  | "amount"            // combien d'USDC tu veux ?
  | "step_collateral"   // étape 1/2 — déposer le SOL
  | "step_borrow"       // étape 2/2 — recevoir l'USDC
  | "manage"            // position active — gérer le prêt
  | "repay"             // rembourser
  | "success";          // confirmation finale

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hfColor(hf: number): string {
  if (hf < 0) return "#4ADE80";
  if (hf >= 2) return "#4ADE80";
  if (hf >= 1.3) return "#F59E0B";
  return "#EF4444";
}

function hfLabel(hf: number): string {
  if (hf < 0) return "Safe";
  if (hf >= 2) return "Safe";
  if (hf >= 1.3) return "Watch out";
  return "At risk";
}

function hfFormat(hf: number): string {
  if (hf < 0) return "∞";
  return hf.toFixed(2);
}

// Calcule le SOL requis pour emprunter `usdcAmount` à 70% LTV (marge de sécurité)
function requiredCollateral(usdcAmount: number, solPrice: number): number {
  if (solPrice <= 0) return 0;
  return usdcAmount / (solPrice * 0.70);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LendingScreen() {
  const { data: position, isLoading: positionLoading } = useLendingPosition();
  const { data: rates } = useLendingRates();
  const { data: solPriceLive } = useSolPrice();

  const depositMutation = useDepositCollateral();
  const borrowMutation = useBorrowUsdc();
  const repayMutation = useRepayUsdc();
  const withdrawMutation = useWithdrawCollateral();

  const [screen, setScreen] = useState<Screen>("landing");
  const [usdcWanted, setUsdcWanted] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [devnetError, setDevnetError] = useState(false);

  const isLoading =
    depositMutation.isPending ||
    borrowMutation.isPending ||
    repayMutation.isPending ||
    withdrawMutation.isPending;

  const emptyPos: LendingPosition = {
    collateralSol: 0,
    borrowedUsdc: 0,
    healthFactor: -1,
    liquidationPrice: 0,
    maxBorrowable: 0,
    availableToWithdraw: 0,
  };
  const defaultRates: LendingRates = {
    usdcBorrowApr: 8.0,
    maxLtv: 0.75,
    liquidationThreshold: 0.85,
    solPriceUsd: 0,
    isDevnet: false,
  };

  const pos = position ?? emptyPos;
  const rts = rates ?? defaultRates;
  const hasPosition = pos.collateralSol > 0;
  const isDevnet = rts.isDevnet === true;
  // Prix SOL : fetch direct Jupiter (fiable) en priorité, fallback sur rates cache
  const solPrice = solPriceLive || rts.solPriceUsd || 0;

  const parsedUsdc = parseFloat(usdcWanted) || 0;
  const solNeeded = requiredCollateral(parsedUsdc, solPrice);
  // Preview health factor for the amount screen
  const previewHf =
    parsedUsdc > 0 && solPrice > 0
      ? (solNeeded * solPrice * 0.85) / parsedUsdc
      : -1;
  const previewLiqPrice =
    parsedUsdc > 0 && solNeeded > 0 ? parsedUsdc / (solNeeded * 0.85) : 0;

  // Determine landing screen: if position exists → manage
  const activeScreen = screen === "landing" && hasPosition ? "manage" : screen;

  async function handleDepositCollateral() {
    setDevnetError(false);
    if (solNeeded < 0.1) {
      Alert.alert("Error", "SOL price not loaded yet. Please wait a moment.");
      return;
    }
    try {
      await depositMutation.mutateAsync({ amount: solNeeded });
      setScreen("step_borrow");
    } catch (err: any) {
      const msg: string = err?.message || String(err);
      if (msg.toLowerCase().includes("devnet") || err?.status === 503) {
        setDevnetError(true);
      } else {
        Alert.alert("Error", msg);
      }
    }
  }

  async function handleBorrow() {
    setDevnetError(false);
    try {
      await borrowMutation.mutateAsync({ amount: parsedUsdc });
      setSuccessMsg(`You received ${parsedUsdc.toFixed(2)} USDC`);
      setScreen("success");
      setUsdcWanted("");
    } catch (err: any) {
      const msg: string = err?.message || String(err);
      if (msg.toLowerCase().includes("devnet") || err?.status === 503) {
        setDevnetError(true);
      } else {
        Alert.alert("Error", msg);
      }
    }
  }

  async function handleRepay() {
    setDevnetError(false);
    const amt = parseFloat(repayAmount) || 0;
    if (amt <= 0) { Alert.alert("Enter an amount"); return; }
    try {
      await repayMutation.mutateAsync({ amount: amt });
      setSuccessMsg(`Repaid ${amt.toFixed(2)} USDC`);
      setRepayAmount("");
      setScreen("success");
    } catch (err: any) {
      const msg: string = err?.message || String(err);
      if (msg.toLowerCase().includes("devnet") || err?.status === 503) {
        setDevnetError(true);
      } else {
        Alert.alert("Error", msg);
      }
    }
  }

  async function handleWithdraw() {
    setDevnetError(false);
    try {
      await withdrawMutation.mutateAsync({ amount: pos.availableToWithdraw });
      setSuccessMsg(`Withdrew ${pos.availableToWithdraw.toFixed(3)} SOL`);
      setScreen("success");
    } catch (err: any) {
      const msg: string = err?.message || String(err);
      if (msg.toLowerCase().includes("devnet") || err?.status === 503) {
        setDevnetError(true);
      } else {
        Alert.alert("Error", msg);
      }
    }
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  function renderDevnetBanner() {
    if (!isDevnet && !devnetError) return null;
    return (
      <View style={styles.devnetBanner}>
        <Ionicons name="warning-outline" size={14} color="#F59E0B" />
        <Text style={styles.devnetText}>Borrow not available on devnet — mainnet only</Text>
      </View>
    );
  }

  function renderHeader(title: string, subtitle?: string, onBack?: () => void) {
    return (
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
    );
  }

  // ─── LANDING ──────────────────────────────────────────────────────────────

  if (activeScreen === "landing") {
    return (
      <View style={styles.container}>
        <View style={styles.fixedSection}>
          {renderHeader("Borrow", "Get USDC without selling your SOL")}
          {renderDevnetBanner()}
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Explication */}
          <View style={styles.explainCard}>
            <View style={styles.explainRow}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
              <View style={styles.explainText}>
                <Text style={styles.explainTitle}>Lock SOL as guarantee</Text>
                <Text style={styles.explainSub}>Your SOL stays on-chain. Kamino holds it while you borrow.</Text>
              </View>
            </View>
            <View style={styles.explainDivider} />
            <View style={styles.explainRow}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
              <View style={styles.explainText}>
                <Text style={styles.explainTitle}>Receive USDC instantly</Text>
                <Text style={styles.explainSub}>USDC lands in your Cash wallet. Spend it with your card or transfer it.</Text>
              </View>
            </View>
            <View style={styles.explainDivider} />
            <View style={styles.explainRow}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
              <View style={styles.explainText}>
                <Text style={styles.explainTitle}>Repay to get your SOL back</Text>
                <Text style={styles.explainSub}>Repay the USDC loan anytime. Your SOL is unlocked immediately.</Text>
              </View>
            </View>
          </View>

          {/* Rates */}
          <View style={styles.ratesCard}>
            <Text style={styles.ratesCardLabel}>via Kamino</Text>
            <View style={styles.ratesRow}>
              <View style={styles.rateItem}>
                <Text style={styles.rateValue}>{rts.usdcBorrowApr.toFixed(2)}%</Text>
                <Text style={styles.rateLabel}>Borrow APR</Text>
              </View>
              <View style={styles.rateItem}>
                <Text style={styles.rateValue}>{(rts.maxLtv * 100).toFixed(0)}%</Text>
                <Text style={styles.rateLabel}>Max LTV</Text>
              </View>
              <View style={styles.rateItem}>
                <Text style={styles.rateValue}>{(rts.liquidationThreshold * 100).toFixed(0)}%</Text>
                <Text style={styles.rateLabel}>Liq. threshold</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setScreen("amount")}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
            <Ionicons name="arrow-forward" size={18} color="#000" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── AMOUNT ───────────────────────────────────────────────────────────────

  if (activeScreen === "amount") {
    const canContinue = parsedUsdc >= 1 && solPrice > 0 && solNeeded >= 0.1;
    return (
      <View style={styles.container}>
        <View style={styles.fixedSection}>
          {renderHeader(
            "How much USDC do you need?",
            undefined,
            () => setScreen("landing")
          )}
          {renderDevnetBanner()}
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Input */}
          <View style={styles.amountCard}>
            <View style={styles.amountInputRow}>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="decimal-pad"
                value={usdcWanted}
                onChangeText={setUsdcWanted}
                autoFocus
              />
              <Text style={styles.amountUnit}>USDC</Text>
            </View>
          </View>

          {/* Preview calculations */}
          {parsedUsdc > 0 && solPrice > 0 && (
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>SOL collateral needed</Text>
                <Text style={styles.previewValue}>{solNeeded.toFixed(3)} SOL</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Health factor</Text>
                <Text style={[styles.previewValue, { color: hfColor(previewHf) }]}>
                  {hfFormat(previewHf)} — {hfLabel(previewHf)}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Liquidation if SOL drops to</Text>
                <Text style={styles.previewValue}>${previewLiqPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Borrow rate</Text>
                <Text style={styles.previewValue}>{rts.usdcBorrowApr.toFixed(2)}% APR</Text>
              </View>
            </View>
          )}

          {parsedUsdc > 0 && solPrice <= 0 && (
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Loading SOL price…</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
            onPress={() => setScreen("step_collateral")}
            disabled={!canContinue}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, !canContinue && { color: "rgba(0,0,0,0.4)" }]}>
              Next
            </Text>
            <Ionicons name="arrow-forward" size={18} color={canContinue ? "#000" : "rgba(0,0,0,0.4)"} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── STEP 1 — COLLATERAL ──────────────────────────────────────────────────

  if (activeScreen === "step_collateral") {
    return (
      <View style={styles.container}>
        <View style={styles.fixedSection}>
          {renderHeader("Step 1 of 2", "Lock SOL as guarantee", () => setScreen("amount"))}
          {renderDevnetBanner()}
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepCard}>
            <View style={styles.stepAmountBlock}>
              <Text style={styles.stepAmount}>{solNeeded.toFixed(3)}</Text>
              <Text style={styles.stepAmountUnit}>SOL</Text>
            </View>
            <Text style={styles.stepExplain}>
              This SOL will be locked in Kamino as your loan guarantee.
              You get it back the moment you repay.
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.infoText}>
              Funds go directly on-chain — Stealf never holds your SOL.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            onPress={handleDepositCollateral}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Sign & lock SOL</Text>
                <Ionicons name="lock-closed" size={16} color="#000" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── STEP 2 — BORROW ──────────────────────────────────────────────────────

  if (activeScreen === "step_borrow") {
    return (
      <View style={styles.container}>
        <View style={styles.fixedSection}>
          {renderHeader("Step 2 of 2", "Receive your USDC")}
          {renderDevnetBanner()}
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepCard}>
            <View style={styles.stepAmountBlock}>
              <Text style={styles.stepAmount}>{parsedUsdc.toFixed(2)}</Text>
              <Text style={styles.stepAmountUnit}>USDC</Text>
            </View>
            <Text style={styles.stepExplain}>
              USDC will arrive in your Cash wallet instantly.
              You can spend it with your card or transfer it freely.
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.infoText}>
              Repay at any time to unlock your SOL. Interest accrues daily at {rts.usdcBorrowApr.toFixed(2)}% APR.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            onPress={handleBorrow}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Sign & receive USDC</Text>
                <Ionicons name="arrow-down" size={16} color="#000" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── MANAGE ───────────────────────────────────────────────────────────────

  if (activeScreen === "manage") {
    const fullyRepaid = pos.borrowedUsdc === 0;
    return (
      <View style={styles.container}>
        <View style={styles.fixedSection}>
          {renderHeader("Your loan")}
          {renderDevnetBanner()}

          {/* Health factor card */}
          <View style={styles.positionCard}>
            <View style={styles.hfRow}>
              <View>
                <Text style={styles.positionLabel}>Health factor</Text>
                <Text style={[styles.healthFactorValue, { color: hfColor(pos.healthFactor) }]}>
                  {hfFormat(pos.healthFactor)}
                  <Text style={[styles.hfStatus, { color: hfColor(pos.healthFactor) }]}>
                    {"  "}{hfLabel(pos.healthFactor)}
                  </Text>
                </Text>
              </View>
              {pos.borrowedUsdc > 0 && (
                <View style={[styles.hfBadge, { borderColor: hfColor(pos.healthFactor) + "40", backgroundColor: hfColor(pos.healthFactor) + "12" }]}>
                  <Text style={[styles.hfBadgeText, { color: hfColor(pos.healthFactor) }]}>
                    Liq. ${pos.liquidationPrice.toFixed(0)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Collateral</Text>
                <Text style={styles.statValue}>{pos.collateralSol.toFixed(3)}</Text>
                <Text style={styles.statUnit}>SOL</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Borrowed</Text>
                <Text style={styles.statValue}>{pos.borrowedUsdc.toFixed(2)}</Text>
                <Text style={styles.statUnit}>USDC</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Available</Text>
                <Text style={styles.statValue}>{pos.maxBorrowable.toFixed(2)}</Text>
                <Text style={styles.statUnit}>USDC more</Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Repay */}
          {pos.borrowedUsdc > 0 && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => { setRepayAmount(""); setScreen("repay"); }}
              activeOpacity={0.8}
            >
              <View style={styles.actionCardLeft}>
                <View style={styles.actionCardIcon}>
                  <Ionicons name="arrow-up" size={20} color="#fff" />
                </View>
                <View>
                  <Text style={styles.actionCardTitle}>Repay loan</Text>
                  <Text style={styles.actionCardSub}>{pos.borrowedUsdc.toFixed(2)} USDC outstanding</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          )}

          {/* Borrow more */}
          {pos.maxBorrowable > 0 && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => { setUsdcWanted(""); setScreen("amount"); }}
              activeOpacity={0.8}
            >
              <View style={styles.actionCardLeft}>
                <View style={styles.actionCardIcon}>
                  <Ionicons name="trending-up" size={20} color="#fff" />
                </View>
                <View>
                  <Text style={styles.actionCardTitle}>Borrow more</Text>
                  <Text style={styles.actionCardSub}>Up to {pos.maxBorrowable.toFixed(2)} USDC available</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          )}

          {/* Withdraw (only if fully repaid) */}
          {fullyRepaid && pos.availableToWithdraw > 0 && (
            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardGreen]}
              onPress={handleWithdraw}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <View style={styles.actionCardLeft}>
                <View style={[styles.actionCardIcon, { backgroundColor: "rgba(74,222,128,0.15)", borderColor: "rgba(74,222,128,0.3)" }]}>
                  <Ionicons name="exit-outline" size={20} color="#4ADE80" />
                </View>
                <View>
                  <Text style={[styles.actionCardTitle, { color: "#4ADE80" }]}>Withdraw SOL</Text>
                  <Text style={styles.actionCardSub}>{pos.availableToWithdraw.toFixed(3)} SOL unlocked</Text>
                </View>
              </View>
              {isLoading
                ? <ActivityIndicator color="#4ADE80" size="small" />
                : <Ionicons name="chevron-forward" size={18} color="rgba(74,222,128,0.4)" />
              }
            </TouchableOpacity>
          )}

          {!fullyRepaid && pos.availableToWithdraw === 0 && (
            <View style={styles.lockedNote}>
              <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.25)" />
              <Text style={styles.lockedNoteText}>
                Repay your loan to unlock your SOL collateral
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── REPAY ────────────────────────────────────────────────────────────────

  if (activeScreen === "repay") {
    const parsedRepay = parseFloat(repayAmount) || 0;
    const isFullRepay = parsedRepay >= pos.borrowedUsdc;
    return (
      <View style={styles.container}>
        <View style={styles.fixedSection}>
          {renderHeader("Repay loan", undefined, () => setScreen("manage"))}
          {renderDevnetBanner()}
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.amountCard}>
            <View style={styles.amountInputRow}>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="decimal-pad"
                value={repayAmount}
                onChangeText={setRepayAmount}
                autoFocus
              />
              <Text style={styles.amountUnit}>USDC</Text>
            </View>
            <TouchableOpacity
              onPress={() => setRepayAmount(pos.borrowedUsdc.toFixed(2))}
              activeOpacity={0.7}
            >
              <Text style={styles.maxButton}>
                MAX {pos.borrowedUsdc.toFixed(2)} USDC
              </Text>
            </TouchableOpacity>
          </View>

          {parsedRepay > 0 && (
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Remaining after repay</Text>
                <Text style={styles.previewValue}>
                  {Math.max(0, pos.borrowedUsdc - parsedRepay).toFixed(2)} USDC
                </Text>
              </View>
              {isFullRepay && (
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: "#4ADE80" }]}>
                    ✓ Full repay — your SOL will be unlocked
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, (parsedRepay <= 0 || isLoading) && styles.primaryButtonDisabled]}
            onPress={handleRepay}
            disabled={parsedRepay <= 0 || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={[styles.primaryButtonText, parsedRepay <= 0 && { color: "rgba(0,0,0,0.4)" }]}>
                Repay {parsedRepay > 0 ? `${parsedRepay.toFixed(2)} USDC` : ""}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── SUCCESS ──────────────────────────────────────────────────────────────

  if (activeScreen === "success") {
    return (
      <View style={styles.container}>
        <View style={[styles.fixedSection, styles.successContainer]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#4ADE80" />
          </View>
          <Text style={styles.successTitle}>Done!</Text>
          <Text style={styles.successMsg}>{successMsg}</Text>
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 32 }]}
            onPress={() => setScreen("manage")}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>See my loan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading fallback
  return (
    <View style={styles.container}>
      <View style={styles.fixedSection}>
        {renderHeader("Borrow")}
      </View>
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="rgba(255,255,255,0.5)" />
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  fixedSection: {
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 8,
  },
  header: {
    marginBottom: 20,
  },
  backBtn: {
    marginBottom: 8,
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
  devnetBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  devnetText: {
    fontSize: 13,
    fontFamily: "Sansation-Regular",
    color: "#F59E0B",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 12,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Landing ──
  explainCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  explainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  explainDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  stepBadgeText: {
    fontSize: 13,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },
  explainText: {
    flex: 1,
  },
  explainTitle: {
    fontSize: 14,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
    marginBottom: 3,
  },
  explainSub: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.45)",
    lineHeight: 18,
  },

  // ── Rates ──
  ratesCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
  },
  ratesCardLabel: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 10,
  },
  ratesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  rateItem: {
    alignItems: "center",
  },
  rateValue: {
    fontSize: 18,
    fontFamily: "Sansation-Bold",
    color: "#4ADE80",
    marginBottom: 2,
  },
  rateLabel: {
    fontSize: 11,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.4)",
  },

  // ── Primary button ──
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 16,
  },
  primaryButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: "Sansation-Bold",
    color: "#000000",
  },

  // ── Amount input ──
  amountCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  amountInput: {
    fontSize: 48,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
    minWidth: 80,
    textAlign: "right",
  },
  amountUnit: {
    fontSize: 22,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.5)",
    paddingTop: 8,
  },
  maxButton: {
    fontSize: 13,
    fontFamily: "Sansation-Bold",
    color: "rgba(255,255,255,0.4)",
  },

  // ── Preview ──
  previewCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 13,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.45)",
    flex: 1,
  },
  previewValue: {
    fontSize: 13,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },

  // ── Step screens ──
  stepCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  stepAmountBlock: {
    alignItems: "center",
  },
  stepAmount: {
    fontSize: 48,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },
  stepAmountUnit: {
    fontSize: 20,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  stepExplain: {
    fontSize: 14,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.35)",
    lineHeight: 18,
  },

  // ── Position card ──
  positionCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 4,
  },
  positionLabel: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 4,
  },
  hfRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  healthFactorValue: {
    fontSize: 32,
    fontFamily: "Sansation-Bold",
  },
  hfStatus: {
    fontSize: 15,
    fontFamily: "Sansation-Regular",
  },
  hfBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  hfBadgeText: {
    fontSize: 12,
    fontFamily: "Sansation-Bold",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },
  statUnit: {
    fontSize: 10,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
  },

  // ── Action cards (manage) ──
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  actionCardGreen: {
    borderColor: "rgba(74,222,128,0.2)",
    backgroundColor: "rgba(74,222,128,0.04)",
  },
  actionCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  actionCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  actionCardTitle: {
    fontSize: 15,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },
  actionCardSub: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  lockedNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  lockedNoteText: {
    fontSize: 12,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.25)",
  },

  // ── Success ──
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 120,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 32,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  successMsg: {
    fontSize: 16,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.5)",
  },
});
