import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Connection, Transaction } from "@solana/web3.js";
import { useTurnkey } from "@turnkey/react-native-wallet-kit";
import * as SecureStore from "expo-secure-store";
import { useAuthenticatedApi } from "../services/clientStealf";
import { socketService } from "../services/socketService";
import { createSeedVaultWallet } from "../services/solanaWalletBridge";
import { useAuth } from "../contexts/AuthContext";
import { useSession } from "../contexts/SessionContext";

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "";
const yieldConnection = new Connection(RPC_ENDPOINT, "confirmed");

// --- Types ---

export type VaultType = "sol_jito" | "sol_marinade" | "usdc_kamino";

export interface BalanceInfo {
  totalDeposited: number;
  currentValue: number;
  yieldEarned: number;
  yieldPercent: number;
}

export interface YieldBalanceResponse {
  sol: BalanceInfo & {
    shares: Array<{
      vaultType: "sol_jito" | "sol_marinade";
      deposited: number;
      currentValue: number;
      yield: number;
    }>;
  };
  usdc: BalanceInfo;
}

export interface APYRates {
  jitoApy: number;
  marinadeApy: number;
  usdcKaminoApy: number;
  lastUpdated: string;
}

export interface YieldDashboard {
  balance: YieldBalanceResponse["sol"];
  apy: APYRates;
  usdc: BalanceInfo;
  history: Array<{
    type: "deposit" | "withdraw";
    amount: number;
    vaultType: VaultType;
    timestamp: string;
    txSignature: string;
  }>;
}

// --- Hooks ---

export function useYieldBalance() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  const query = useQuery<YieldBalanceResponse>({
    queryKey: ["yield-balance"],
    queryFn: () => api.get("/api/yield/balance"),
    staleTime: 10000,
    refetchInterval: 30000,
  });

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["yield-balance"] });
      queryClient.invalidateQueries({ queryKey: ["yield-dashboard"] });
    };

    socketService.on("private-transfer:status-update", handleUpdate);
    return () => {
      socketService.off("private-transfer:status-update", handleUpdate);
    };
  }, [queryClient]);

  return query;
}

export function useYieldAPY() {
  const api = useAuthenticatedApi();

  return useQuery<APYRates>({
    queryKey: ["yield-apy"],
    queryFn: () => api.get("/api/yield/apy"),
    staleTime: 300000,
    refetchInterval: 300000,
  });
}

export function useYieldDashboard() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  const query = useQuery<YieldDashboard>({
    queryKey: ["yield-dashboard"],
    queryFn: () => api.get("/api/yield/dashboard"),
    staleTime: 10000,
    refetchInterval: 30000,
  });

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["yield-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["yield-balance"] });
    };

    socketService.on("private-transfer:status-update", handleUpdate);
    return () => {
      socketService.off("private-transfer:status-update", handleUpdate);
    };
  }, [queryClient]);

  return query;
}

export function useYieldDeposit() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      amount,
      vaultType,
      isPrivate = false,
    }: {
      amount: number;
      vaultType: VaultType;
      isPrivate?: boolean;
    }) => {
      return api.post("/api/yield/deposit", { amount, vaultType, private: isPrivate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yield-balance"] });
      queryClient.invalidateQueries({ queryKey: ["yield-dashboard"] });
    },
  });
}

export function useYieldWithdraw() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      amount,
      vaultType,
      isPrivate = false,
    }: {
      amount: number;
      vaultType: VaultType;
      isPrivate?: boolean;
    }) => {
      return api.post("/api/yield/withdraw", { amount, vaultType, private: isPrivate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yield-balance"] });
      queryClient.invalidateQueries({ queryKey: ["yield-dashboard"] });
    },
  });
}

export function useYieldConfirm() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      signature,
      type,
      vaultType,
      amount,
      isPrivate = false,
    }: {
      signature: string;
      type: "deposit" | "withdraw";
      vaultType: VaultType;
      amount?: number;
      isPrivate?: boolean;
    }) => {
      return api.post("/api/yield/confirm", {
        signature,
        type,
        vaultType,
        amount,
        private: isPrivate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yield-balance"] });
      queryClient.invalidateQueries({ queryKey: ["yield-dashboard"] });
    },
  });
}

// --- Combined Sign + Confirm Hooks ---

/**
 * Full deposit flow: build tx → sign → broadcast → confirm backend.
 * Non-custodial: backend builds, user signs via Turnkey/MWA.
 */
export function useYieldDepositAndConfirm() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();
  const { signAndSendTransaction, wallets } = useTurnkey();
  const { isWalletAuth, userData } = useAuth();
  const { setMWAInProgress } = useSession();

  return useMutation({
    mutationFn: async ({
      amount,
      vaultType,
      isPrivate = false,
    }: {
      amount: number;
      vaultType: VaultType;
      isPrivate?: boolean;
    }) => {
      // Step 1: Get unsigned transaction from backend
      const buildResult = await api.post("/api/yield/deposit", {
        amount,
        vaultType,
        private: isPrivate,
      });

      const txBase64: string = buildResult.transaction;
      const txBytes = Buffer.from(txBase64, "base64");
      const tx = Transaction.from(txBytes);

      let txSignature: string;

      if (isWalletAuth) {
        const isSeekerWallet =
          userData?.cash_wallet === userData?.stealf_wallet ||
          userData?.authMethod === "wallet";

        if (isSeekerWallet) {
          // MWA Seed Vault path — pass raw bytes, bridge handles deserialization
          const authToken = await SecureStore.getItemAsync("mwa_auth_token");
          if (!authToken) throw new Error("MWA auth token not found");

          const bridge = createSeedVaultWallet(
            userData!.stealf_wallet || userData!.cash_wallet!,
            authToken
          );
          setMWAInProgress(true);
          try {
            console.log("[Yield] Sending raw tx bytes to MWA bridge...");
            const signedBytes = await bridge.signTransaction(
              new Uint8Array(txBytes)
            );
            console.log("[Yield] MWA signed, broadcasting...", signedBytes.length, "bytes");
            txSignature = await yieldConnection.sendRawTransaction(
              Buffer.from(signedBytes),
              { skipPreflight: true, preflightCommitment: "confirmed" }
            );
            console.log("[Yield] Broadcast success:", txSignature);
          } catch (err: any) {
            console.error("[Yield] MWA sign/send error:", err?.message || err);
            throw err;
          } finally {
            setMWAInProgress(false);
          }
        } else {
          // Turnkey backend sign-and-send
          const hexTx = Buffer.from(
            tx.serialize({
              requireAllSignatures: false,
              verifySignatures: false,
            })
          ).toString("hex");
          const result = await api.post("/api/wallet/sign-and-send", {
            unsignedTransaction: hexTx,
          });
          txSignature = result.txSignature;
        }
      } else {
        // Passkey auth: Turnkey SDK
        const wallet = wallets?.[0];
        const walletAccount = wallet?.accounts?.find(
          (account: any) => account.address === userData?.cash_wallet
        );
        if (!walletAccount) throw new Error("Wallet account not found");

        const hexTx = Buffer.from(
          tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          })
        ).toString("hex");

        txSignature = await signAndSendTransaction({
          walletAccount,
          unsignedTransaction: hexTx,
          transactionType: "TRANSACTION_TYPE_SOLANA",
          rpcUrl: RPC_ENDPOINT,
        });
      }

      // Step 3: Confirm with backend (returns denomination breakdown for private deposits)
      const confirmData = await api.post("/api/yield/confirm", {
        signature: txSignature,
        type: "deposit",
        vaultType,
        amount,
        private: isPrivate,
      });

      return { signature: txSignature, confirmData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yield-balance"] });
      queryClient.invalidateQueries({ queryKey: ["yield-dashboard"] });
    },
  });
}

/**
 * Full withdrawal flow: backend builds + signs tx → frontend broadcasts → confirm.
 * Backend authority already signed the withdraw tx — frontend just broadcasts.
 */
export function useYieldWithdrawAndConfirm() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      amount,
      vaultType,
      isPrivate = false,
    }: {
      amount: number;
      vaultType: VaultType;
      isPrivate?: boolean;
    }) => {
      // Step 1: Backend builds + signs the withdrawal tx
      const buildResult = await api.post("/api/yield/withdraw", {
        amount,
        vaultType,
        private: isPrivate,
      });

      // Private SOL withdraw: backend handled everything (vault → authority → user)
      // No transaction to broadcast — just return the result
      if (isPrivate && vaultType !== "usdc_kamino" && buildResult.success) {
        return { signature: buildResult.txSignature || "private" };
      }

      const txBase64: string = buildResult.transaction;
      const txBytes = Buffer.from(txBase64, "base64");

      // Step 2: Just broadcast (authority already signed on backend)
      const txSignature = await yieldConnection.sendRawTransaction(txBytes, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      // Wait for confirmation
      await yieldConnection.confirmTransaction(txSignature, "confirmed");

      // Step 3: Confirm with backend to update ledger
      await api.post("/api/yield/confirm", {
        signature: txSignature,
        type: "withdraw",
        vaultType,
        amount,
        private: isPrivate,
      });

      return { signature: txSignature };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yield-balance"] });
      queryClient.invalidateQueries({ queryKey: ["yield-dashboard"] });
    },
  });
}

// --- Arcium Proof of Yield ---

interface YieldProofResponse {
  exceedsThreshold: boolean;
  thresholdBps: number;
  vaultType: VaultType;
}

/**
 * Hook to query Arcium MPC proof of yield.
 * Returns whether the user's yield exceeds a given threshold
 * WITHOUT revealing the actual balance or yield amount.
 *
 * UI should display results as:
 *   "Votre rendement dépasse X%" (never show exact amounts)
 *   "Dépôt en cours de traitement" (during batch staking)
 */
export function useYieldProof(
  vaultType: VaultType,
  thresholdBps: number,
  enabled = true
) {
  const api = useAuthenticatedApi();

  return useQuery<YieldProofResponse>({
    queryKey: ["yield-proof", vaultType, thresholdBps],
    queryFn: () =>
      api.get(
        `/api/yield/proof?vaultType=${vaultType}&thresholdBps=${thresholdBps}`
      ),
    enabled: enabled && thresholdBps > 0,
    staleTime: 60000, // 1 minute cache — MPC calls are expensive
    refetchInterval: false, // Don't auto-refetch — user-triggered only
    retry: 1,
  });
}

/**
 * Hook to listen for batch staking status updates via Socket.io.
 * Returns the current batch status for display in the savings screen.
 */
export function useBatchStatus() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleBatchPending = (data: any) => {
      queryClient.setQueryData(["batch-status"], {
        status: "pending",
        estimatedMinutes: Math.round(data.estimatedExecutionMs / 60000),
      });
    };

    const handleBatchComplete = () => {
      queryClient.setQueryData(["batch-status"], { status: "complete" });
      queryClient.invalidateQueries({ queryKey: ["yield-balance"] });
      queryClient.invalidateQueries({ queryKey: ["yield-dashboard"] });
      // Clear batch status after 5 seconds
      setTimeout(() => {
        queryClient.setQueryData(["batch-status"], null);
      }, 5000);
    };

    const handleBatchError = () => {
      queryClient.setQueryData(["batch-status"], { status: "delayed" });
    };

    socketService.on("yield:batch:pending", handleBatchPending);
    socketService.on("yield:batch:complete", handleBatchComplete);
    socketService.on("yield:batch:error", handleBatchError);

    return () => {
      socketService.off("yield:batch:pending", handleBatchPending);
      socketService.off("yield:batch:complete", handleBatchComplete);
      socketService.off("yield:batch:error", handleBatchError);
    };
  }, [queryClient]);

  return useQuery<{ status: string; estimatedMinutes?: number } | null>({
    queryKey: ["batch-status"],
    queryFn: () => null,
    staleTime: Infinity,
  });
}
