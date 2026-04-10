import { useState, useCallback } from "react";
import type { Address } from "@solana/kit";
import { useTurnkey } from "@turnkey/react-native-wallet-kit";

import { parseUmbraError, UmbraError, type UmbraOp } from "../../services/umbra/errors";
import { clearUmbraClient, clearCashClient } from "../../services/umbra/client";
import { clearRegistration, ensureRegistered } from "../../services/umbra/registration";
import { clearBurntUtxos } from "../../services/umbra/burntUtxos";
import { umbraClearSeed } from "../../services/umbra/seed";

import { deposit, depositFromCash } from "../../services/umbra/operations/deposit";
import { withdraw } from "../../services/umbra/operations/withdraw";
import { sendPrivate, selfShield } from "../../services/umbra/operations/transfer";
import { claimReceived, claimSelfToPublic } from "../../services/umbra/operations/claim";

// Re-exports kept for backwards compat with existing consumers.
export { UmbraError };
export type { UmbraErrorCode } from "../../services/umbra/errors";
export { umbraClearSeed };
export { fetchEncryptedBalances } from "../../services/umbra/queries/balances";
export {
  fetchPendingClaims,
  fetchPendingClaimsForCash,
} from "../../services/umbra/queries/claims";
export { ensureRegistered };

/** Reset every Umbra-related cache. Called on logout / wallet switch. */
export function clearUmbraState(): void {
  clearUmbraClient();
  clearCashClient();
  clearRegistration();
  clearBurntUtxos();
}

export function useUmbra() {
  const [loading, setLoading] = useState(false);
  const [currentOp, setCurrentOp] = useState<UmbraOp | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Turnkey deps for cash-wallet operations. May be null while wallets load.
  const {
    signTransaction: turnkeySignTransaction,
    signMessage: turnkeySignMessage,
    wallets,
  } = useTurnkey();
  const cashWalletAccount = wallets?.[0]?.accounts?.[0] ?? null;

  const wrap = useCallback(
    async <T>(op: UmbraOp, fn: () => Promise<T>): Promise<T> => {
      setLoading(true);
      setCurrentOp(op);
      setError(null);
      try {
        return await fn();
      } catch (err: any) {
        const umbraErr = parseUmbraError(err, op);
        if (__DEV__) {
          console.error(`[Umbra] ${op} failed (${umbraErr.code}):`, umbraErr.message);
          console.error(`[Umbra] raw cause:`, err?.cause?.message || err?.cause);
          console.error(`[Umbra] stage:`, umbraErr.stage);
          if (err?.cause?.context?.logs?.length) {
            console.error(`[Umbra] simulation logs:`, err.cause.context.logs);
          }
        }
        setError(umbraErr.userMessage);
        throw umbraErr;
      } finally {
        setLoading(false);
        setCurrentOp(null);
      }
    },
    []
  );

  return {
    loading,
    currentOp,
    error,

    register: useCallback(() => wrap("register", () => ensureRegistered()), [wrap]),

    deposit: useCallback(
      (mint: Address, amount: bigint) => wrap("deposit", () => deposit(mint, amount)),
      [wrap]
    ),

    /**
     * Cash → Stealth deposit (single tx, signed by cash wallet via Turnkey).
     * Throws if Turnkey wallets aren't loaded yet.
     */
    depositFromCash: useCallback(
      (destinationAddress: Address, mint: Address, amount: bigint) =>
        wrap("depositFromCash", async () => {
          if (!cashWalletAccount || !turnkeySignTransaction || !turnkeySignMessage) {
            throw new Error("Cash wallet not ready");
          }
          return depositFromCash({
            walletAccount: cashWalletAccount as any,
            signTransaction: turnkeySignTransaction as any,
            signMessage: turnkeySignMessage as any,
            destinationAddress,
            mint,
            amount,
          });
        }),
      [wrap, cashWalletAccount, turnkeySignTransaction, turnkeySignMessage]
    ),

    withdraw: useCallback(
      (mint: Address, amount: bigint) => wrap("withdraw", () => withdraw(mint, amount)),
      [wrap]
    ),

    sendPrivate: useCallback(
      (recipient: Address, mint: Address, amount: bigint) =>
        wrap("sendPrivate", () => sendPrivate(recipient, mint, amount)),
      [wrap]
    ),

    selfShield: useCallback(
      (mint: Address, amount: bigint, destinationAddress?: Address) =>
        wrap("selfShield", () => selfShield(mint, amount, destinationAddress)),
      [wrap]
    ),

    claimReceived: useCallback(
      (utxos: any[]) => wrap("claimReceived", () => claimReceived(utxos)),
      [wrap]
    ),

    claimSelfToPublic: useCallback(
      (utxos: any[]) => wrap("claimSelfToPublic", () => claimSelfToPublic(utxos)),
      [wrap]
    ),
  };
}
