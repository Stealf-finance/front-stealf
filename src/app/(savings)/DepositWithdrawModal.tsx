import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useYieldDepositAndConfirm, useYieldWithdrawAndConfirm, type VaultType } from "../../hooks/useYield";

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
  const [step, setStep] = useState<"input" | "confirming" | "success" | "error">("input");
  const [pointsEarned, setPointsEarned] = useState(0);

  const deposit = useYieldDepositAndConfirm();
  const withdraw = useYieldWithdrawAndConfirm();

  const maxAmount = mode === "deposit" ? availableBalance : savingsBalance;
  const parsedAmount = parseFloat(amount) || 0;
  const isValidAmount = parsedAmount > 0 && parsedAmount <= maxAmount;

  const handleNumberPress = (num: string) => {
    if (num === "." && amount.includes(".")) return;
    // Limit decimal places
    if (amount.includes(".") && amount.split(".")[1].length >= decimals) return;
    setAmount((prev) => prev + num);
  };

  const handleDelete = () => {
    setAmount((prev) => prev.slice(0, -1));
  };

  const decimals = unit === "SOL" ? 4 : 2;

  const handleMax = () => {
    // Leave a small amount for fees on SOL deposit
    const feeBuffer = unit === "SOL" && mode === "deposit" ? 0.005 : 0;
    const max = Math.max(0, maxAmount - feeBuffer);
    setAmount(max.toFixed(decimals));
  };

  const handleConfirm = async () => {
    if (!isValidAmount) {
      Alert.alert("Error", "Invalid amount");
      return;
    }

    setStep("confirming");

    try {
      if (mode === "deposit") {
        const result = await deposit.mutateAsync({ amount: parsedAmount, vaultType, isPrivate });
        setPointsEarned(result.confirmData?.pointsEarned || (isPrivate ? 35 : 20));
      } else {
        const result = await withdraw.mutateAsync({ amount: parsedAmount, vaultType, isPrivate });
        setPointsEarned((result as any).pointsEarned || 10);
      }
      setStep("success");
    } catch (error: any) {
      console.error(`${mode} error:`, error);
      setStep("input");
      Alert.alert(
        "Error",
        error?.message || `Failed to ${mode}. Please try again.`
      );
    }
  };

  const handleClose = () => {
    setAmount("");
    setStep("input");
    onClose();
  };

  const title = `${isPrivate ? "Private " : ""}${mode === "deposit" ? "Deposit" : "Withdraw"} ${unit}`;
  const subtitle =
    mode === "deposit"
      ? `Available: ${availableBalance.toFixed(decimals)} ${unit}`
      : `Savings: ${savingsBalance.toFixed(decimals)} ${unit}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.8}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 28 }} />
        </View>

        {step === "success" ? (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#4ADE80" />
            </View>
            <Text style={styles.successTitle}>
              {mode === "deposit" ? "Deposit confirmed" : "Withdrawal confirmed"}
            </Text>
            <Text style={styles.successAmount}>
              {parsedAmount.toFixed(decimals)} {unit}
            </Text>
            {pointsEarned > 0 && (
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>+{pointsEarned} pts ✦</Text>
              </View>
            )}
            <Text style={styles.successSubtext}>
              {mode === "deposit"
                ? `Your ${unit} is now earning yield`
                : `${unit} sent to your wallet`}
            </Text>

            <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : step === "confirming" ? (
          <View style={styles.confirmingContainer}>
            <ActivityIndicator size="large" color={isPrivate ? "#4ADE80" : "#fff"} />
            <Text style={styles.confirmingText}>
              {mode === "deposit" ? "Depositing..." : "Withdrawing..."}
            </Text>
            <Text style={styles.confirmingSubtext}>
              {mode === "deposit"
                ? "Please confirm the transaction in your wallet"
                : "Processing your withdrawal..."}
            </Text>
          </View>
        ) : (
          <>
            {/* Amount Display */}
            <View style={styles.amountContainer}>
              <View style={styles.amountRow}>
                <Text style={[styles.amountText, !amount && styles.amountPlaceholder]}>{amount || "0"}</Text>
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

            {/* Confirm Button */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                !isValidAmount && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!isValidAmount}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.confirmButtonText,
                  !isValidAmount && styles.confirmButtonTextDisabled,
                ]}
              >
                {mode === "deposit" ? "Deposit" : "Withdraw"}
              </Text>
            </TouchableOpacity>

            {/* Custom Keyboard */}
            <View style={styles.keyboard}>
              {[
                ["1", "2", "3"],
                ["4", "5", "6"],
                ["7", "8", "9"],
                [".", "0", "⌫"],
              ].map((row, rowIndex) => (
                <View key={rowIndex} style={styles.keyboardRow}>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },
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
  maxRow: {
    alignItems: "center",
    marginBottom: 20,
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
  confirmButton: {
    backgroundColor: "rgba(240, 235, 220, 0.95)",
    marginHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 25,
  },
  confirmButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  confirmButtonText: {
    fontSize: 17,
    fontFamily: "Sansation-Bold",
    color: "#000",
  },
  confirmButtonTextDisabled: {
    color: "rgba(255,255,255,0.3)",
  },
  keyboard: {
    paddingHorizontal: 40,
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
  // Success state
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 36,
    fontFamily: "Sansation-Bold",
    color: "#4ADE80",
    marginBottom: 12,
  },
  successSubtext: {
    fontSize: 14,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginBottom: 40,
  },
  pointsBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  pointsBadgeText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: 'Sansation-Bold',
    fontWeight: '700',
  },
  doneButton: {
    backgroundColor: "rgba(240, 235, 220, 0.95)",
    paddingHorizontal: 60,
    paddingVertical: 16,
    borderRadius: 30,
  },
  doneButtonText: {
    fontSize: 17,
    fontFamily: "Sansation-Bold",
    color: "#000",
  },
  // Confirming state
  confirmingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  confirmingText: {
    fontSize: 20,
    fontFamily: "Sansation-Bold",
    color: "#ffffff",
  },
  confirmingSubtext: {
    fontSize: 14,
    fontFamily: "Sansation-Regular",
    color: "rgba(255,255,255,0.5)",
  },
});
