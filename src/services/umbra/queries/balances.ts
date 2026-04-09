import { getEncryptedBalanceQuerierFunction } from "@umbra-privacy/sdk";
import type { Address } from "@solana/kit";
import { getClient } from "../client";

export async function fetchEncryptedBalances(
  mints: Address[]
): Promise<Map<Address, any>> {
  const client = await getClient();
  const fetchBalances = getEncryptedBalanceQuerierFunction({ client });
  return fetchBalances(mints);
}
