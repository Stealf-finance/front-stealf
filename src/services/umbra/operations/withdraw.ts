import { getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction } from "@umbra-privacy/sdk";
import type { Address } from "@solana/kit";
import { getClient } from "../client";
import { UMBRA_OPERATION_DEPS } from "../operationDeps";

/** Stealth encrypted balance → stealth public ATA. */
export async function withdraw(mint: Address, amount: bigint) {
  const client = await getClient();
  const doWithdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction(
    { client },
    UMBRA_OPERATION_DEPS as any,
  );
  return doWithdraw(client.signer.address, mint, amount as any);
}
