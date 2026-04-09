import {
  getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
  getSelfClaimableUtxoToPublicBalanceClaimerFunction,
} from "@umbra-privacy/sdk";
import {
  createClaimReceiverZkProver,
  createClaimEphemeralZkProver,
} from "../../../zk";
import {
  getClient,
  getCachedSignerKey,
  getRelayer,
} from "../client";
import {
  loadBurntUtxosForCurrentWallet,
  isAlreadyBurntError,
  recoverFromAlreadyBurnt,
  handleClaimResult,
} from "../burntUtxos";

async function ensureBlacklist() {
  const key = getCachedSignerKey();
  if (key) await loadBurntUtxosForCurrentWallet(key);
}

/** Claim received UTXOs into stealth's encrypted balance. */
export async function claimReceived(utxos: any[]) {
  const client = await getClient();
  const claimFn = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
    { client },
    {
      zkProver: createClaimReceiverZkProver(),
      relayer: getRelayer(),
      fetchBatchMerkleProof: (client as any).fetchBatchMerkleProof,
    }
  );

  await ensureBlacklist();

  let result;
  try {
    result = await claimFn(utxos);
  } catch (err) {
    if (isAlreadyBurntError(err)) return recoverFromAlreadyBurnt(utxos);
    throw err;
  }
  return handleClaimResult(result, utxos);
}

/** Claim self-burnable UTXOs to their destination's public ATA (via relayer). */
export async function claimSelfToPublic(utxos: any[]) {
  const client = await getClient();
  const claimFn = getSelfClaimableUtxoToPublicBalanceClaimerFunction(
    { client },
    {
      zkProver: createClaimEphemeralZkProver(),
      relayer: getRelayer(),
      fetchBatchMerkleProof: (client as any).fetchBatchMerkleProof,
    }
  );

  await ensureBlacklist();

  let result;
  try {
    result = await claimFn(utxos);
  } catch (err) {
    if (isAlreadyBurntError(err)) return recoverFromAlreadyBurnt(utxos);
    throw err;
  }
  return handleClaimResult(result, utxos);
}
