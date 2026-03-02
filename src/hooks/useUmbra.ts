import { useState, useCallback } from "react";
import {
  umbraRegister,
  umbraDeposit,
  umbraWithdraw,
  umbraSendPrivate,
  umbraSelfShield,
  umbraFetchClaimable,
  umbraClaimSelfUtxos,
  umbraClaimReceivedUtxos,
  type ClaimableUtxos,
} from "../services/umbra";

type UmbraOp =
  | "register"
  | "deposit"
  | "withdraw"
  | "send"
  | "selfShield"
  | "fetchUtxos"
  | "claim";

export function useUmbra() {
  const [loading, setLoading] = useState(false);
  const [currentOp, setCurrentOp] = useState<UmbraOp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wrap = useCallback(
    async <T>(op: UmbraOp, fn: () => Promise<T>): Promise<T | null> => {
      setLoading(true);
      setCurrentOp(op);
      setError(null);
      try {
        const result = await fn();
        return result;
      } catch (err: any) {
        if (__DEV__) console.error(`[Umbra] ${op} failed:`, err);
        setError(err?.message || `${op} failed`);
        return null;
      } finally {
        setLoading(false);
        setCurrentOp(null);
      }
    },
    []
  );

  // --- Registration (one-time) ---

  const register = useCallback(async (): Promise<string[] | null> => {
    return wrap("register", () => umbraRegister());
  }, [wrap]);

  // --- Deposit: public → encrypted ---

  const deposit = useCallback(
    async (mint: string, amount: bigint): Promise<string | null> => {
      return wrap("deposit", () => umbraDeposit(mint, amount));
    },
    [wrap]
  );

  // --- Withdraw: encrypted → public ---

  const withdraw = useCallback(
    async (mint: string, amount: bigint): Promise<string | null> => {
      return wrap("withdraw", () => umbraWithdraw(mint, amount));
    },
    [wrap]
  );

  // --- Send private via mixer ---

  const sendPrivate = useCallback(
    async (
      recipientAddress: string,
      mint: string,
      amount: bigint
    ): Promise<string[] | null> => {
      return wrap("send", () =>
        umbraSendPrivate(recipientAddress, mint, amount)
      );
    },
    [wrap]
  );

  // --- Self-shield (break on-chain link) ---

  const selfShield = useCallback(
    async (mint: string, amount: bigint): Promise<string[] | null> => {
      return wrap("selfShield", () => umbraSelfShield(mint, amount));
    },
    [wrap]
  );

  // --- Fetch claimable UTXOs ---

  const fetchClaimable = useCallback(
    async (
      treeIndex?: number,
      startIndex?: number
    ): Promise<ClaimableUtxos | null> => {
      return wrap("fetchUtxos", () =>
        umbraFetchClaimable(treeIndex, startIndex)
      );
    },
    [wrap]
  );

  // --- Claim all pending UTXOs ---

  const claimAll = useCallback(
    async (utxos: ClaimableUtxos): Promise<string[] | null> => {
      return wrap("claim", async () => {
        const sigs: string[] = [];

        if (utxos.ephemeral.length > 0) {
          const s = await umbraClaimSelfUtxos(utxos.ephemeral);
          sigs.push(...s);
        }

        if (utxos.receiver.length > 0) {
          const s = await umbraClaimReceivedUtxos(utxos.receiver);
          sigs.push(...s);
        }

        return sigs;
      });
    },
    [wrap]
  );

  return {
    // State
    loading,
    currentOp,
    error,

    // Actions
    register,
    deposit,
    withdraw,
    sendPrivate,
    selfShield,
    fetchClaimable,
    claimAll,
  };
}
