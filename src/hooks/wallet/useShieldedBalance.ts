import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { fetchEncryptedBalances } from '../transactions/useUmbra';
import { SOL_MINT } from '../../constants/solana';
import { LAMPORTS_PER_SOL } from '../../services/solana/kit';
import type { Address } from '@solana/kit';

interface ShieldedBalanceResult {
  /** Shielded SOL balance in lamports (raw bigint). */
  lamports: bigint;
  /** Shielded SOL balance as a number (SOL units, e.g. 0.5). */
  sol: number;
  /** State returned by Umbra: 'shared', 'mxe', 'uninitialised', etc. */
  state: string | null;
}


export function useShieldedBalance() {
  const { userData } = useAuth();
  const wallet = userData?.stealf_wallet || '';

  return useQuery<ShieldedBalanceResult>({
    queryKey: ['shielded-balance', wallet],
    queryFn: async () => {
      const balances = await fetchEncryptedBalances([SOL_MINT as Address]);
      const entry = balances.get(SOL_MINT as Address);

      if (entry?.state === 'shared' && typeof entry.balance === 'bigint') {
        const lamports = entry.balance as bigint;
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
    enabled: !!wallet,
    staleTime: 30_000,
  });
}
