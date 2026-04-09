import { useQuery } from '@tanstack/react-query';

/** SOL / USD spot price from CoinGecko (free tier, no auth, 60s cache). */
async function fetchSolPrice(): Promise<number> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
  );
  if (!res.ok) throw new Error(`SOL price fetch failed: ${res.status}`);
  const json = await res.json();
  const price = Number(json?.solana?.usd);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('SOL price API returned invalid value');
  }
  return price;
}

export function useSolPrice() {
  return useQuery({
    queryKey: ['sol-price'],
    queryFn: fetchSolPrice,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });
}
