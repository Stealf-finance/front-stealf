import { getClaimableUtxoScannerFunction } from "@umbra-privacy/sdk";
import { getCachedSignerKey, getClient } from "../client";
import {
  isBurnt,
  loadBurntUtxosForCurrentWallet,
} from "../burntUtxos";

async function ensureBlacklistLoaded(): Promise<void> {
  const key = getCachedSignerKey();
  if (key) await loadBurntUtxosForCurrentWallet(key);
}

export async function fetchPendingClaims(): Promise<any[]> {
  const client = await getClient();
  await ensureBlacklistLoaded();
  const scan = getClaimableUtxoScannerFunction({ client });
  const result = await scan(0n as any, 0n as any);
  const all = result.received ?? [];
  return all.filter((u: any) => !isBurnt(u));
}

/**
 * Scan the mixer for self-claimable UTXOs whose `destinationAddress` matches
 */
export async function fetchPendingClaimsForCash(
  cashWalletAddress: string
): Promise<any[]> {
  const client = await getClient();
  await ensureBlacklistLoaded();
  const scan = getClaimableUtxoScannerFunction({ client });
  const result = await scan(0n as any, 0n as any);
  const all = result.selfBurnable ?? [];
  return all.filter((u: any) => {
    if (isBurnt(u)) return false;
    const dest =
      u?.destinationAddress?.toString?.() ?? String(u?.destinationAddress ?? "");
    return dest === cashWalletAddress;
  });
}
