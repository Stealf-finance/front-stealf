import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { fetchEncryptedBalances } from '../transactions/useUmbra';
import { SOL_MINT } from '../../constants/solana';
import { LAMPORTS_PER_SOL } from '../../services/solana/kit';
import type { Address } from '@solana/kit';

interface ShieldedBalanceResult {
  lamports: bigint;
  sol: number;
  state: string | null;
}


export function useShieldedBalance() {
  const { userData, isWalletAuth } = useAuth();
  const wallet = userData?.stealf_wallet || '';

  return useQuery<ShieldedBalanceResult>({
    queryKey: ['shielded-balance', wallet],
    queryFn: async () => {
      const balances = await fetchEncryptedBalances([SOL_MINT as Address]);
      const entry = balances.get(SOL_MINT as Address);

      if (entry?.state === 'shared' && typeof entry.balance === 'bigint') {
        const lamports = entry.balance as bigint;
        // Sanity check: anything above 1B SOL is garbage (corrupted on-chain account or wrong keys)
        const MAX_PLAUSIBLE_LAMPORTS = 1_000_000_000n * BigInt(LAMPORTS_PER_SOL);
        if (lamports < 0n || lamports > MAX_PLAUSIBLE_LAMPORTS) {
          return { lamports: 0n, sol: 0, state: 'corrupted' };
        }
        return {
          lamports,
          sol: Number(lamports) / LAMPORTS_PER_SOL,
          state: entry.state,
        };
      }

      return {
        lamports: 0n,
        sol: 0,
        state: entry?.state ?? null,
      };
    },
    // Seeker users: Umbra master-seed derivation triggers a Seed Vault popup.
    // Disable until Umbra mainnet — shielded balance shows 0 in the meantime.
    enabled: !!wallet && !isWalletAuth,
    staleTime: 30_000,
  });
}
