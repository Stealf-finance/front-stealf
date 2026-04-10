import {
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
} from "@umbra-privacy/sdk";
import type { Address } from "@solana/kit";
import { getClient, getCashClient, type GetCashClientArgs } from "../client";
import { ensureRegistered } from "../registration";

/**
 * Deposit from the stealth wallet's public balance into its own encrypted
 * balance. Both source and destination are the same wallet.
 */
export async function deposit(mint: Address, amount: bigint) {
  await ensureRegistered();
  const client = await getClient();
  const doDeposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });

  return doDeposit(client.signer.address, mint, amount as any);
}

export interface DepositFromCashArgs extends GetCashClientArgs {
  destinationAddress: Address;
  mint: Address;
  amount: bigint;
}

export async function depositFromCash(args: DepositFromCashArgs) {
  // The stealth wallet must be registered on Umbra before it can receive
  // encrypted balance credits. ensureRegistered() uses the stealth client.
  await ensureRegistered();
  const { destinationAddress, mint, amount, ...cashClientArgs } = args;
  const client = await getCashClient(cashClientArgs);
  const doDeposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
  return doDeposit(destinationAddress, mint, amount as any);
}
