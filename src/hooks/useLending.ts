import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Connection, Transaction } from "@solana/web3.js";
import { useTurnkey } from "@turnkey/react-native-wallet-kit";
import { useAuthenticatedApi } from "../services/clientStealf";
import { useAuth } from "../contexts/AuthContext";

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "";

// --- Types ---

export interface LendingPosition {
  collateralSol: number;
  borrowedUsdc: number;
  healthFactor: number; // -1 = pas d'emprunt (infinity en JSON)
  liquidationPrice: number;
  maxBorrowable: number;
  availableToWithdraw: number;
}

export interface LendingRates {
  usdcBorrowApr: number;
  maxLtv: number;
  liquidationThreshold: number;
  solPriceUsd: number;
  isDevnet: boolean;
}

// --- Queries ---

export function useLendingPosition() {
  const api = useAuthenticatedApi();

  return useQuery<LendingPosition>({
    queryKey: ["lending-position"],
    queryFn: () => api.get("/api/lending/position"),
    staleTime: 15000,
    refetchInterval: 30000,
  });
}

export function useLendingRates() {
  const api = useAuthenticatedApi();

  return useQuery<LendingRates>({
    queryKey: ["lending-rates"],
    queryFn: () => api.get("/api/lending/rates"),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

// --- Shared sign + broadcast helper (Turnkey passkey only) ---

async function signAndBroadcastTx(
  txBase64: string,
  userData: any,
  signAndSendTransaction: any,
  wallets: any
): Promise<string> {
  const txBytes = Buffer.from(txBase64, "base64");
  const tx = Transaction.from(txBytes);

  const wallet = wallets?.[0];
  const walletAccount = wallet?.accounts?.find(
    (account: any) => account.address === userData?.cash_wallet
  );
  if (!walletAccount) throw new Error("Wallet account not found");

  const hexTx = Buffer.from(
    tx.serialize({ requireAllSignatures: false, verifySignatures: false })
  ).toString("hex");

  return await signAndSendTransaction({
    walletAccount,
    unsignedTransaction: hexTx,
    transactionType: "TRANSACTION_TYPE_SOLANA",
    rpcUrl: RPC_ENDPOINT,
  });
}

// --- Mutations ---

export function useDepositCollateral() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();
  const { signAndSendTransaction, wallets } = useTurnkey();
  const { userData } = useAuth();

  return useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      const buildResult = await api.post("/api/lending/collateral", { amount });
      const { transaction: txBase64, obligationAddress } = buildResult;

      const txSignature = await signAndBroadcastTx(
        txBase64,
        userData,
        signAndSendTransaction,
        wallets
      );

      const amountLamports = Math.floor(amount * 1_000_000_000);
      await api.post("/api/lending/confirm", {
        signature: txSignature,
        action: "collateral",
        amount: amountLamports,
      });

      return { signature: txSignature, obligationAddress };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lending-position"] });
    },
  });
}

export function useBorrowUsdc() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();
  const { signAndSendTransaction, wallets } = useTurnkey();
  const { userData } = useAuth();

  return useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      const buildResult = await api.post("/api/lending/borrow", { amount });
      const { transaction: txBase64 } = buildResult;

      const txSignature = await signAndBroadcastTx(
        txBase64,
        userData,
        signAndSendTransaction,
        wallets
      );

      const amountBaseUnits = Math.floor(amount * 1_000_000);
      await api.post("/api/lending/confirm", {
        signature: txSignature,
        action: "borrow",
        amount: amountBaseUnits,
      });

      return { signature: txSignature };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lending-position"] });
    },
  });
}

export function useRepayUsdc() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();
  const { signAndSendTransaction, wallets } = useTurnkey();
  const { userData } = useAuth();

  return useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      const buildResult = await api.post("/api/lending/repay", { amount });
      const { transaction: txBase64, amountUsdc } = buildResult;

      const txSignature = await signAndBroadcastTx(
        txBase64,
        userData,
        signAndSendTransaction,
        wallets
      );

      const amountBaseUnits = Math.floor(amountUsdc * 1_000_000);
      await api.post("/api/lending/confirm", {
        signature: txSignature,
        action: "repay",
        amount: amountBaseUnits,
      });

      return { signature: txSignature };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lending-position"] });
    },
  });
}

export function useWithdrawCollateral() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();
  const { signAndSendTransaction, wallets } = useTurnkey();
  const { userData } = useAuth();

  return useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      const buildResult = await api.post("/api/lending/withdraw-collateral", { amount });
      const { transaction: txBase64 } = buildResult;

      const txSignature = await signAndBroadcastTx(
        txBase64,
        userData,
        signAndSendTransaction,
        wallets
      );

      const amountLamports = Math.floor(amount * 1_000_000_000);
      await api.post("/api/lending/confirm", {
        signature: txSignature,
        action: "withdraw",
        amount: amountLamports,
      });

      return { signature: txSignature };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lending-position"] });
    },
  });
}
