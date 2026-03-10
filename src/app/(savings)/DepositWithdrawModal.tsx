import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useYieldDepositAndConfirm, useYieldWithdrawAndConfirm, type VaultType } from "../../hooks/yield/useYield";
import SlideToConfirm from "../../components/SlideToConfirm";
import ComebackIcon from "../../assets/buttons/comeback.svg";

type ModalMode = "deposit" | "withdraw";

interface DepositWithdrawModalProps {
  visible: boolean;
  mode: ModalMode;
  onClose: () => void;
  availableBalance?: number;
  savingsBalance?: number;
  vaultType: VaultType;
  unit: string;
  isPrivate?: boolean;
}

export default function DepositWithdrawModal({
  visible,
  mode,
  onClose,
  availableBalance = 0,
  savingsBalance = 0,
  vaultType,
  unit,
  isPrivate = false,
}: DepositWithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "confirming" | "success">("input");
  const [pointsEarned, setPointsEarned] = useState(0);

  const deposit = useYieldDepositAndConfirm();
  const withdraw = useYieldWithdrawAndConfirm();

  const decimals = unit === "SOL" ? 4 : 2;
  const maxAmount = mode === "deposit" ? availableBalance : savingsBalance;
  const parsedAmount = parseFloat(amount) || 0;
  const isValidAmount = parsedAmount > 0 && parsedAmount <= maxAmount;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  const handleNumberPress = (num: string) => {
    if (num === "." && amount.includes(".")) return;
    if (amount.includes(".") && amount.split(".")[1].length >= decimals) return;
    const digits = amount.replace(".", "");
    if (num !== "." && digits.length >= 8) return;
    setAmount((prev) => prev + num);
  };

  const handleDelete = () => {
    setAmount((prev) => prev.slice(0, -1));
  };

  const handleMax = () => {
    const feeBuffer = unit === "SOL" && mode === "deposit" ? 0.005 : 0;
    const max = Math.max(0, maxAmount - feeBuffer);
    setAmount(max.toFixed(decimals));
  };

  const showSuccessAnimation = () => {
    setStep("success");
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleConfirm = async () => {
    if (!isValidAmount) return;
    setStep("confirming");

    try {
      if (mode === "deposit") {
        const result = await deposit.mutateAsync({ amount: parsedAmount, vaultType, isPrivate });
        setPointsEarned(result.confirmData?.pointsEarned || (isPrivate ? 35 : 20));
      } else {
        const result = await withdraw.mutateAsync({ amount: parsedAmount, vaultType, isPrivate });
        setPointsEarned((result as any).pointsEarned || 10);
      }
      showSuccessAnimation();
    } catch (error: any) {
      __DEV__ && console.error(`${mode} error:`, error);
      setStep("input");
      Alert.alert("Error", error?.message || `Failed to ${mode}. Please try again.`);
    }
  };

  const handleClose = () => {
    setAmount("");
    setStep("input");
    fadeAnim.setValue(0);
    checkScale.setValue(0);
    contentFade.setValue(0);
    onClose();
  };

  const subtitle =
    mode === "deposit"
      ? `Available: ${availableBalance.toFixed(decimals)} ${unit}`
      : `In savings: ${savingsBalance.toFixed(decimals)} ${unit}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={["#000000", "#000000", "#000000"]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.background}
        >
          <StatusBar style="light" />

          {step === "success" ? (
            <Animated.View style={[styles.successScreen, { opacity: fadeAnim }]}>
              <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
                <Text style={styles.checkText}>{"✓"}</Text>
              </Animated.View>

              <Animated.View style={[styles.successInfo, { opacity: contentFade }]}>
                <Text style={styles.successLabel}>
                  {mode === "deposit" ? "Deposited" : "Withdrawn"}
                </Text>
                <Text style={styles.successAmount}>
                  {parsedAmount.toFixed(decimals)} {unit}
                </Text>
                {pointsEarned > 0 && (
                  <View style={styles.pointsBadge}>
                    <Text style={styles.pointsBadgeText}>+{pointsEarned} pts</Text>
                  </View>
                )}
                <Text style={styles.successSub}>
                  {mode === "deposit"
                    ? `Your ${unit} is now earning yield`
                    : `${unit} sent back to your wallet`}
                </Text>
              </Animated.View>

              <Animated.View style={[styles.successActions, { opacity: contentFade }]}>
                <TouchableOpacity style={styles.primaryAction} onPress={handleClose} activeOpacity={0.8}>
                  <Text style={styles.primaryActionText}>Done</Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          ) : (
            <>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleClose} activeOpacity={0.8}>
                  <ComebackIcon width={18} height={18} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                  {mode === "deposit" ? "Deposit" : "Withdraw"}
                </Text>
                <View style={styles.placeholder} />
              </View>

              {/* Amount Display */}
              <View style={styles.amountContainer}>
                <View style={styles.amountRow}>
                  <Text style={[styles.amountText, !amount && styles.amountPlaceholder]}>
                    {amount || "0"}
                  </Text>
                  <Text style={styles.currencyText}>{unit}</Text>
                </View>
                <Text style={styles.balanceText}>{subtitle}</Text>
              </View>

              {/* Max Button */}
              <View style={styles.maxRow}>
                <TouchableOpacity style={styles.maxButton} onPress={handleMax}>
                  <Text style={styles.maxButtonText}>MAX</Text>
                </TouchableOpacity>
              </View>

              {/* Slide to Confirm */}
              <View style={styles.slideContainer}>
                <SlideToConfirm
                  onConfirm={handleConfirm}
                  loading={step === "confirming"}
                  label={`Slide to ${mode}`}
                />
              </View>

              {/* Custom Keyboard */}
              <View style={styles.keyboard}>
                {[
                  ["1", "2", "3"],
                  ["4", "5", "6"],
                  ["7", "8", "9"],
                  [".", "0", "⌫"],
                ].map((row, i) => (
                  <View key={i} style={styles.keyboardRow}>
                    {row.map((key) => (
                      <TouchableOpacity
                        key={key}
                        style={styles.key}
                        onPress={() =>
                          key === "⌫" ? handleDelete() : handleNumberPress(key)
                        }
                      >
                        <Text style={styles.keyText}>{key}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            </>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  background: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(60, 60, 60, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },
  placeholder: {
    width: 40,
  },

  // Amount
  amountContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
  },
  amountText: {
    fontSize: 72,
    fontFamily: "Sansation-Light",
    color: "#ffffff",
    letterSpacing: -2,
  },
  amountPlaceholder: {
    color: "rgba(255,255,255,0.18)",
  },
  currencyText: {
    fontSize: 32,
    fontFamily: "Sansation-Light",
    color: "rgba(255,255,255,0.5)",
    marginLeft: 8,
  },
  balanceText: {
    fontSize: 15,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.5)",
  },

  // Max
  maxRow: {
    alignItems: "center",
    marginBottom: 24,
  },
  maxButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  maxButtonText: {
    fontSize: 14,
    fontFamily: "Sansation-Bold",
    color: "rgba(255,255,255,0.8)",
  },

  // Slide
  slideContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },

  // Keyboard
  keyboard: {
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  keyboardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  key: {
    width: 90,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontSize: 32,
    fontFamily: "Sansation-Light",
    color: "#ffffff",
  },

  // Success
  successScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  checkText: {
    fontSize: 32,
    color: "white",
    fontWeight: "300",
  },
  successInfo: {
    alignItems: "center",
    marginBottom: 60,
  },
  successLabel: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.4)",
    fontFamily: "Sansation-Regular",
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 36,
    color: "white",
    fontFamily: "Sansation-Light",
    fontWeight: "300",
    marginBottom: 12,
  },
  successSub: {
    fontSize: 14,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  pointsBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 16,
  },
  pointsBadgeText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    fontFamily: "Sansation-Bold",
  },
  successActions: {
    width: "100%",
    gap: 12,
  },
  primaryAction: {
    backgroundColor: "rgba(240, 235, 220, 0.95)",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  primaryActionText: {
    fontSize: 16,
    fontFamily: "Sansation-Bold",
    color: "#000",
  },
});
