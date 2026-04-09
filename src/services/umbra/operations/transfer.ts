import {
  getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction,
  getEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
} from "@umbra-privacy/sdk";
import type { Address } from "@solana/kit";
import {
  createCreateUtxoWithReceiverUnlockerZkProver,
  createCreateUtxoWithEphemeralUnlockerZkProver,
} from "../../../zk";
import { getClient } from "../client";
import { ensureRegistered } from "../registration";

/** Private send: creates a UTXO claimable by `recipient`. */
export async function sendPrivate(
  recipient: Address,
  mint: Address,
  amount: bigint
) {
  await ensureRegistered();
  const client = await getClient();
  const zkProver = createCreateUtxoWithReceiverUnlockerZkProver();
  const createUtxo = getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    { zkProver }
  );
  return createUtxo({ destinationAddress: recipient, mint, amount: amount as any });
}

/** Self-shield: creates a self-burnable UTXO. Default destination = signer. */
export async function selfShield(
  mint: Address,
  amount: bigint,
  destinationAddress?: Address
) {
  await ensureRegistered();
  const client = await getClient();
  const zkProver = createCreateUtxoWithEphemeralUnlockerZkProver();
  const createUtxo = getEncryptedBalanceToSelfClaimableUtxoCreatorFunction(
    { client },
    { zkProver }
  );
  return createUtxo({
    destinationAddress: destinationAddress ?? client.signer.address,
    mint,
    amount: amount as any,
  });
}
