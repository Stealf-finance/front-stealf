import { z } from 'zod';

export const TokenBalanceSchema = z.object({
  tokenMint: z.string().nullable(),
  tokenSymbol: z.string(),
  tokenDecimals: z.number(),
  balance: z.number(),
  balanceUSD: z.number(),
});

export const BalanceResponseSchema = z.object({
  address: z.string(),
  tokens: z.array(TokenBalanceSchema),
  totalUSD: z.number(),
});

export const TransactionSchema = z.object({
  signature: z.string(),
  amount: z.number(),
  amountUSD: z.number(),
  tokenMint: z.string().nullable(),
  tokenSymbol: z.string(),
  tokenDecimals: z.number(),
  signatureURL: z.string(),
  walletAddress: z.string(),
  dateFormatted: z.string(),
  status: z.string(),
  type: z.enum(['sent', 'received', 'unknown']),
  slot: z.number(),
});

export const HistoryResponseSchema = z.object({
  address: z.string(),
  count: z.number(),
  transactions: z.array(TransactionSchema),
});

export const YieldStatsSchema = z.object({
  rate: z.number(),
  apy: z.number(),
});

export const SolPriceSchema = z.object({
  price: z.number(),
});
