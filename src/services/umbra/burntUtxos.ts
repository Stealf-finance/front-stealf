const BURNT_UTXOS_KEY_PREFIX = "umbra_burnt_utxos_";

const burntUtxoIds = new Set<string>();
let burntUtxosLoadedForKey: string | null = null;

export function utxoToId(utxo: any): string {
  const tree = utxo?.treeIndex?.toString?.() ?? String(utxo?.treeIndex ?? "0");
  const leaf =
    utxo?.insertionIndex?.toString?.() ?? String(utxo?.insertionIndex ?? "");
  return `${tree}:${leaf}`;
}

export function isBurnt(utxo: any): boolean {
  return burntUtxoIds.has(utxoToId(utxo));
}

export async function loadBurntUtxosForCurrentWallet(
  privateKeyB58: string
): Promise<void> {
  if (burntUtxosLoadedForKey === privateKeyB58) return;
  burntUtxoIds.clear();
  const safe = privateKeyB58.replace(/[^A-Za-z0-9._-]/g, "_");
  const key = `${BURNT_UTXOS_KEY_PREFIX}${safe}`;
  try {
    const SecureStore = await import("expo-secure-store");
    const stored = await SecureStore.getItemAsync(key);
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      for (const id of ids) burntUtxoIds.add(id);
    }
  } catch (_) {}
  burntUtxosLoadedForKey = privateKeyB58;
}

export async function persistBurntUtxos(): Promise<void> {
  if (!burntUtxosLoadedForKey) return;
  const safe = burntUtxosLoadedForKey.replace(/[^A-Za-z0-9._-]/g, "_");
  const key = `${BURNT_UTXOS_KEY_PREFIX}${safe}`;
  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(key, JSON.stringify(Array.from(burntUtxoIds)));
  } catch (_) {}
}

function addToBlacklist(id: string): boolean {
  if (burntUtxoIds.has(id)) return false;
  burntUtxoIds.add(id);
  return true;
}

const ALREADY_BURNT_PATTERNS =
  /NullifierAlreadyBurnt|already burnt|already reserved|0x6d64/i;

export function isAlreadyBurntError(err: any): boolean {
  const msg = String(err?.message || err?.cause?.message || "");
  return ALREADY_BURNT_PATTERNS.test(msg);
}


export async function handleClaimResult(
  result: any,
  inputUtxos: any[]
): Promise<any> {
  const batches = result?.batches;
  let anySuccess = false;
  let anyAlreadyBurnt = false;
  let blacklistChanged = false;
  const otherFailures: string[] = [];

  if (batches instanceof Map) {
    for (const [, batch] of batches) {
      const status = batch?.status;
      const utxoIds: string[] = batch?.utxoIds ?? [];

      if (status === "completed") {
        anySuccess = true;
        for (const id of utxoIds) {
          if (addToBlacklist(id)) blacklistChanged = true;
        }

        for (const u of inputUtxos) {
          if (addToBlacklist(utxoToId(u))) blacklistChanged = true;
        }
      } else if (status === "failed" || status === "timed_out") {
        const reason: string = batch?.failureReason || "";
        if (ALREADY_BURNT_PATTERNS.test(reason)) {
          anyAlreadyBurnt = true;
          for (const id of utxoIds) {
            if (addToBlacklist(id)) blacklistChanged = true;
          }
        } else {
          otherFailures.push(reason || "unknown failure");
        }
      }
    }
  }

  if (blacklistChanged) await persistBurntUtxos();

  if (otherFailures.length > 0 && !anySuccess && !anyAlreadyBurnt) {
    throw new Error(otherFailures[0]);
  }

  return result;
}


export async function recoverFromAlreadyBurnt(
  inputUtxos: any[]
): Promise<{ batches: Map<unknown, unknown> }> {
  let blacklistChanged = false;
  for (const u of inputUtxos) {
    if (addToBlacklist(utxoToId(u))) blacklistChanged = true;
  }
  if (blacklistChanged) await persistBurntUtxos();
  return { batches: new Map() };
}
