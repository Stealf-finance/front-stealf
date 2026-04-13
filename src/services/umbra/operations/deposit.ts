import {
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
} from "@umbra-privacy/sdk";
import type { Address } from "@solana/kit";
import { getClient, getCashClient, type GetCashClientArgs } from "../client";
import { ensureRegistered } from "../registration";
import { UmbraError } from "../errors";

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
  try {
    await ensureRegistered();
  } catch (err: any) {
    const msg = err?.message || err?.cause?.message || '';
    if (/simulation failed|insufficient|rent/i.test(msg)) {
      throw new UmbraError({
        code: 'INSUFFICIENT_BALANCE',
        op: 'depositFromCash',
        rawMessage: msg,
        userMessage: 'Your stealth wallet needs SOL to register on Umbra. Please add funds to your stealth wallet first.',
        cause: err,
      });
    }
    throw err;
  }
  const { destinationAddress, mint, amount, ...cashClientArgs } = args;
  const client = await getCashClient(cashClientArgs);
  const doDeposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
  return doDeposit(destinationAddress, mint, amount as any);
}
