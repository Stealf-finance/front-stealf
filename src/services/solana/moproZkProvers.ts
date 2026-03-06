/**
 * Mopro-based ZK prover adapters for Umbra Privacy SDK.
 *
 * Converts Umbra's IZkProver interfaces into native Mopro proof generation calls.
 * Handles: input serialization → Mopro FFI → proof byte conversion.
 */

import { generateCircomProof, ProofLib } from "mopro-ffi";
import type { CircomProofResult } from "mopro-ffi";
import { getCircuitPath } from "./zkCircuitManager";
import type { CircuitType } from "./zkCircuitManager";

// --- Proof byte conversion ---

/**
 * Convert a decimal string representing a u256 to 32 big-endian bytes.
 * Mirrors `u256ToBeBytes` from @umbra-privacy/web-zk-prover.
 */
function u256ToBeBytes(value: bigint): Uint8Array {
  const buffer = new ArrayBuffer(32);
  const view = new DataView(buffer);
  view.setBigUint64(0, (value >> 192n) & 0xffffffffffffffffn, false);
  view.setBigUint64(8, (value >> 128n) & 0xffffffffffffffffn, false);
  view.setBigUint64(16, (value >> 64n) & 0xffffffffffffffffn, false);
  view.setBigUint64(24, value & 0xffffffffffffffffn, false);
  return new Uint8Array(buffer);
}

/**
 * Convert a Mopro CircomProofResult into Umbra's Groth16ProofBytes format.
 *
 * Mopro returns affine coordinates as decimal strings:
 *   G1: { x: "dec", y: "dec", z: "1" }
 *   G2: { x: ["d0","d1"], y: ["d0","d1"], z: ["1","0"] }
 *
 * Umbra expects:
 *   proofA: 64 bytes  = [Ax(32) || Ay(32)]
 *   proofB: 128 bytes = [Bx1(32) || Bx0(32) || By1(32) || By0(32)]  ← SWAPPED within pairs
 *   proofC: 64 bytes  = [Cx(32) || Cy(32)]
 */
function convertMoproProofToBytes(proof: CircomProofResult["proof"]): {
  proofA: Uint8Array;
  proofB: Uint8Array;
  proofC: Uint8Array;
} {
  const ax = u256ToBeBytes(BigInt(proof.a.x));
  const ay = u256ToBeBytes(BigInt(proof.a.y));

  // B component: x and y are arrays [d0, d1] — swap order within each pair
  const bx0 = u256ToBeBytes(BigInt(proof.b.x[0]));
  const bx1 = u256ToBeBytes(BigInt(proof.b.x[1]));
  const by0 = u256ToBeBytes(BigInt(proof.b.y[0]));
  const by1 = u256ToBeBytes(BigInt(proof.b.y[1]));

  const cx = u256ToBeBytes(BigInt(proof.c.x));
  const cy = u256ToBeBytes(BigInt(proof.c.y));

  const proofA = new Uint8Array(64);
  proofA.set(ax, 0);
  proofA.set(ay, 32);

  // Critical: B ordering is [x1, x0, y1, y0] not [x0, x1, y0, y1]
  const proofB = new Uint8Array(128);
  proofB.set(bx1, 0);
  proofB.set(bx0, 32);
  proofB.set(by1, 64);
  proofB.set(by0, 96);

  const proofC = new Uint8Array(64);
  proofC.set(cx, 0);
  proofC.set(cy, 32);

  return { proofA, proofB, proofC };
}

// --- Input serialization ---

/**
 * Serialize circuit inputs object to Mopro's expected JSON format.
 * Converts all values to Record<string, string[]>.
 *
 * Handles:
 * - bigint → ["bigint.toString()"]
 * - string → ["string"]
 * - number → ["number.toString()"]
 * - readonly bigint[] → ["v0", "v1", ...]
 * - readonly [bigint, bigint, bigint] → ["v0", "v1", "v2"]
 * - readonly number[] → ["n0", "n1", ...]
 */
function serializeCircuitInputs(inputs: Record<string, unknown>): string {
  const serialized: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(inputs)) {
    if (Array.isArray(value)) {
      serialized[key] = value.map((v) => String(v));
    } else if (typeof value === "bigint") {
      serialized[key] = [value.toString()];
    } else if (typeof value === "number") {
      serialized[key] = [value.toString()];
    } else if (typeof value === "string") {
      serialized[key] = [value];
    } else {
      serialized[key] = [String(value)];
    }
  }

  return JSON.stringify(serialized);
}

// --- Generic prover ---

async function prove(
  circuitType: CircuitType,
  inputs: Record<string, unknown>,
  nLeaves?: number
): Promise<{
  readonly proofA: Uint8Array;
  readonly proofB: Uint8Array;
  readonly proofC: Uint8Array;
}> {
  const zkeyPath = await getCircuitPath(circuitType, nLeaves);
  const serializedInputs = serializeCircuitInputs(inputs);

  // generateCircomProof is synchronous (JSI call into native Rust)
  const result = generateCircomProof(
    zkeyPath,
    serializedInputs,
    ProofLib.Arkworks
  );

  return convertMoproProofToBytes(result.proof);
}

// --- Exported prover factories ---

export function getMoproUserRegistrationProver() {
  return {
    prove: async (inputs: Record<string, unknown>) => {
      return prove("userRegistration", inputs);
    },
  };
}

export function getMoproCreateSelfClaimableUtxoProver() {
  return {
    prove: async (inputs: Record<string, unknown>) => {
      return prove("createDepositWithConfidentialAmount", inputs);
    },
  };
}

export function getMoproCreateReceiverClaimableUtxoProver() {
  return {
    prove: async (inputs: Record<string, unknown>) => {
      return prove("createDepositWithConfidentialAmount", inputs);
    },
  };
}

export function getMoproClaimSelfIntoEncryptedProver() {
  return {
    maxUtxoCapacity: 1 as const,
    prove: async (inputs: Record<string, unknown>) => {
      return prove("claimDepositIntoConfidentialAmount", inputs, 1);
    },
  };
}

export function getMoproClaimReceiverIntoEncryptedProver() {
  return {
    prove: async (inputs: Record<string, unknown>, nLeaves: number) => {
      if (nLeaves < 1 || nLeaves > 16) {
        throw new Error(`nLeaves must be 1-16, got ${nLeaves}`);
      }
      return prove("claimDepositIntoConfidentialAmount", inputs, nLeaves);
    },
  };
}

export function getMoproClaimSelfIntoPublicProver() {
  return {
    maxUtxoCapacity: 1 as const,
    prove: async (inputs: Record<string, unknown>) => {
      return prove("claimDepositIntoPublicAmount", inputs, 1);
    },
  };
}
