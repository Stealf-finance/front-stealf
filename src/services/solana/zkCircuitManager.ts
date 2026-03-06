import { Paths, File, Directory } from "expo-file-system";

const CDN_BASE = "https://d1hi11upkav2nq.cloudfront.net/zk";
const CIRCUITS_DIR_NAME = "zk-circuits";

export type CircuitType =
  | "userRegistration"
  | "createDepositWithConfidentialAmount"
  | "claimDepositIntoConfidentialAmount"
  | "claimDepositIntoPublicAmount"
  | "createDepositWithPublicAmount";

function getCircuitFilename(type: CircuitType, nLeaves?: number): string {
  switch (type) {
    case "userRegistration":
      return "userRegistration.zkey";
    case "createDepositWithConfidentialAmount":
      return "createDepositWithConfidentialAmount.zkey";
    case "claimDepositIntoConfidentialAmount":
      return `claimDepositIntoConfidentialAmount_n${nLeaves ?? 1}.zkey`;
    case "claimDepositIntoPublicAmount":
      return `claimDepositIntoPublicAmount_n${nLeaves ?? 1}.zkey`;
    case "createDepositWithPublicAmount":
      return "createDepositWithPublicAmount.zkey";
  }
}

function getCircuitsDir(): Directory {
  return new Directory(Paths.document, CIRCUITS_DIR_NAME);
}

function ensureDir(): void {
  const dir = getCircuitsDir();
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
}

/**
 * Get the local filesystem path for a circuit file.
 * Downloads from Umbra CDN if not cached.
 *
 * @param type - Circuit type
 * @param nLeaves - Number of leaves (for claim circuits with batch sizes 1-16)
 * @returns Absolute path to the .zkey file (no file:// prefix)
 */
export async function getCircuitPath(
  type: CircuitType,
  nLeaves?: number
): Promise<string> {
  ensureDir();

  const filename = getCircuitFilename(type, nLeaves);
  const dir = getCircuitsDir();
  const file = new File(dir, filename);

  if (file.exists && file.size > 0) {
    return file.uri.replace("file://", "");
  }

  const url = `${CDN_BASE}/${filename}`;

  if (__DEV__) console.log(`[ZK] Downloading circuit: ${filename}`);

  const downloaded = await File.downloadFileAsync(url, file, {
    idempotent: true,
  });

  if (!downloaded.exists || downloaded.size === 0) {
    try {
      downloaded.delete();
    } catch (_) {}
    throw new Error(`Failed to download circuit ${filename}`);
  }

  if (__DEV__) console.log(`[ZK] Downloaded circuit: ${filename}`);

  return downloaded.uri.replace("file://", "");
}

/**
 * Check if a circuit is already cached locally.
 */
export function isCircuitCached(
  type: CircuitType,
  nLeaves?: number
): boolean {
  const filename = getCircuitFilename(type, nLeaves);
  const file = new File(getCircuitsDir(), filename);
  return file.exists && file.size > 0;
}

/**
 * Delete all cached circuit files.
 */
export function clearCircuitCache(): void {
  const dir = getCircuitsDir();
  if (dir.exists) {
    dir.delete();
  }
}
