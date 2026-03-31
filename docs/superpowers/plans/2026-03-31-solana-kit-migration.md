# Solana Kit Migration — @solana/web3.js v1 → @solana/kit v2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the entire Solana stack from `@solana/web3.js` v1 + `@solana/spl-token` to `@solana/kit` v2 (aka web3.js v2), and upgrade `@umbra-privacy/sdk` from v1 to v2.

**Architecture:** Replace class-based Solana APIs (Connection, Transaction, PublicKey, Keypair) with functional equivalents from @solana/kit (createSolanaRpc, address, createKeyPairSignerFromPrivateKeyBytes, pipe + createTransactionMessage). Remove @solana/spl-token (not needed in devnet/SOL-only phase). Upgrade Umbra SDK to v2 which natively uses @solana/kit.

**Tech Stack:** @solana/kit v6, @umbra-privacy/sdk v2.0.1, @solana/spl-memo (keep if compatible, otherwise inline memo instruction)

---

## Scope

12 files use `@solana/web3.js` directly. The migration order is bottom-up: constants/utils first, then services, then hooks, then screens.

### Files to modify

| File | Impact | What changes |
|------|--------|-------------|
| `src/constants/solana.ts` | Low | Add LAMPORTS_PER_SOL constant |
| `src/services/solana/transactionsGuard.ts` | Low | `PublicKey` → `isAddress()` |
| `src/utils/solanaKeyDerivation.ts` | Medium | `Keypair` → `createKeyPairSignerFromPrivateKeyBytes` |
| `src/hooks/wallet/useInitPrivateWallet.ts` | Medium | `Keypair` → kit signer APIs |
| `src/services/yield/balance.ts` | Low | Remove `LAMPORTS_PER_SOL` import |
| `src/services/yield/withdraw.ts` | Low | Remove `LAMPORTS_PER_SOL` import |
| `src/services/yield/deposit.ts` | High | Full transaction rebuild with kit |
| `src/hooks/transactions/useSendSimpleTransaction.ts` | High | Full transaction + signing rebuild |
| `src/hooks/transactions/useUmbra.ts` | High | Upgrade to Umbra SDK v2 |
| `src/app/(app)/moove.tsx` | High | Full transaction rebuild |
| `src/app/(app)/add-funds.tsx` | Medium | Airdrop with kit |
| `src/app/(app)/deposit-private.tsx` | Low | Remove `LAMPORTS_PER_SOL` import |
| `src/app/(app)/send-confirmation.tsx` | Low | Remove `LAMPORTS_PER_SOL` import |

### Packages to install
```
@solana/kit@^6.0.1
@umbra-privacy/sdk@2.0.1
```

### Packages to remove
```
@solana/web3.js
@solana/spl-token
@solana/spl-memo (if incompatible with kit)
```

---

## Task 1: Install packages and create Solana helpers

**Files:**
- Modify: `package.json`
- Create: `src/services/solana/kit.ts` (shared RPC + helpers)
- Modify: `src/constants/solana.ts`

- [ ] **Step 1: Install @solana/kit and upgrade umbra SDK**

```bash
npm install @solana/kit@^6.0.1 @umbra-privacy/sdk@2.0.1
```

- [ ] **Step 2: Create shared Solana kit helpers**

```typescript
// src/services/solana/kit.ts
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  address,
  isAddress,
  lamports,
  createKeyPairSignerFromPrivateKeyBytes,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  compileTransaction,
  signTransaction,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  pipe,
  type Address,
  type KeyPairSigner,
  type Rpc,
  type RpcSubscriptions,
  type TransactionSigner,
} from '@solana/kit';

const RPC_URL = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || '';
const WSS_URL = process.env.EXPO_PUBLIC_SOLANA_WSS_URL || '';

// Singleton RPC clients
let _rpc: Rpc | null = null;
let _rpcSubscriptions: RpcSubscriptions | null = null;

export function getRpc(): Rpc {
  if (!_rpc) {
    _rpc = createSolanaRpc(RPC_URL);
  }
  return _rpc;
}

export function getRpcSubscriptions(): RpcSubscriptions {
  if (!_rpcSubscriptions) {
    _rpcSubscriptions = createSolanaRpcSubscriptions(WSS_URL);
  }
  return _rpcSubscriptions;
}

/** Lamports per SOL (1 SOL = 1_000_000_000 lamports) */
export const LAMPORTS_PER_SOL = 1_000_000_000n;

/** Convert SOL (number) to lamports (bigint) */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * Number(LAMPORTS_PER_SOL)));
}

/** Convert lamports (bigint | number) to SOL (number) */
export function lamportsToSol(lamps: bigint | number): number {
  return Number(BigInt(lamps)) / Number(LAMPORTS_PER_SOL);
}

/** Create a signer from a base58 private key */
export async function createSignerFromBase58(privateKeyBase58: string): Promise<KeyPairSigner> {
  const bs58 = (await import('bs58')).default;
  const keyBytes = bs58.decode(privateKeyBase58);
  // web3.js v1 stores 64-byte secret keys (32 private + 32 public)
  // @solana/kit expects 32-byte private key
  const privateKeyBytes = keyBytes.length === 64 ? keyBytes.slice(0, 32) : keyBytes;
  return createKeyPairSignerFromPrivateKeyBytes(privateKeyBytes);
}

/** Validate a Solana address */
export function validateAddress(addr: string): boolean {
  return isAddress(addr);
}

/** Type-safe address helper */
export function toAddress(addr: string): Address {
  return address(addr);
}

// Re-export commonly used functions
export {
  address,
  isAddress,
  lamports,
  createKeyPairSignerFromPrivateKeyBytes,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  compileTransaction,
  signTransaction,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  pipe,
};
export type { Address, KeyPairSigner, Rpc, RpcSubscriptions, TransactionSigner };
```

- [ ] **Step 3: Update solana constants**

Add `LAMPORTS_PER_SOL` to constants so all files can use it from the same place:

```typescript
// src/constants/solana.ts — add at the top:
export { LAMPORTS_PER_SOL, solToLamports, lamportsToSol } from '../services/solana/kit';
```

Keep existing mint/vault constants unchanged.

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/services/solana/kit.ts src/constants/solana.ts package.json package-lock.json
git commit -m "feat: add @solana/kit helpers and upgrade umbra SDK to v2"
```

---

## Task 2: Migrate transactionsGuard (address validation)

**Files:**
- Modify: `src/services/solana/transactionsGuard.ts`

- [ ] **Step 1: Read the current file and update imports**

Replace:
```typescript
import { PublicKey } from '@solana/web3.js';
```
With:
```typescript
import { isAddress } from '../solana/kit';
```

- [ ] **Step 2: Update validateAddress function**

Replace the `PublicKey` constructor check:
```typescript
// Old:
try {
  new PublicKey(address);
  return { valid: true };
} catch {
  return { valid: false, error: 'Invalid Solana address' };
}

// New:
if (!isAddress(address)) {
  return { valid: false, error: 'Invalid Solana address' };
}
return { valid: true };
```

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit 2>&1 | grep transactionsGuard
git add src/services/solana/transactionsGuard.ts
git commit -m "refactor: migrate transactionsGuard to @solana/kit"
```

---

## Task 3: Migrate key derivation and wallet init

**Files:**
- Modify: `src/utils/solanaKeyDerivation.ts`
- Modify: `src/hooks/wallet/useInitPrivateWallet.ts`

- [ ] **Step 1: Update solanaKeyDerivation.ts**

Replace `Keypair` usage. The derivation function outputs a 32-byte seed — we need to return the seed bytes and let the caller create a signer.

```typescript
// Replace:
import { Keypair } from "@solana/web3.js";
// With:
import { getAddressFromPublicKey, createKeyPairFromBytes } from "@solana/kit";
```

The `derivePath` function returns `{ key: Buffer }`. Update the exported helper that creates a keypair:

```typescript
// Old:
export function keypairFromDerivedSeed(seed: Buffer): Keypair {
  return Keypair.fromSeed(seed.slice(0, 32));
}

// New:
export async function addressFromDerivedSeed(seed: Buffer): Promise<{ address: string; privateKey: Uint8Array }> {
  const keyPair = await createKeyPairFromBytes(seed.slice(0, 32));
  const addr = await getAddressFromPublicKey(keyPair.publicKey);
  return { address: addr, privateKey: new Uint8Array(seed.slice(0, 32)) };
}
```

- [ ] **Step 2: Update useInitPrivateWallet.ts**

Replace `Keypair` usage with the new helper. Read the file first to understand the full flow, then:

- Replace `import { Keypair } from "@solana/web3.js"` with imports from kit
- Update wallet creation to use `createKeyPairSignerFromPrivateKeyBytes`
- Update address extraction to use `signer.address` instead of `keypair.publicKey.toBase58()`
- Keep bs58 encoding for SecureStore storage

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "solanaKeyDerivation|useInitPrivateWallet"
git add src/utils/solanaKeyDerivation.ts src/hooks/wallet/useInitPrivateWallet.ts
git commit -m "refactor: migrate key derivation to @solana/kit"
```

---

## Task 4: Migrate LAMPORTS_PER_SOL imports (low-impact files)

**Files:**
- Modify: `src/services/yield/balance.ts`
- Modify: `src/services/yield/withdraw.ts`
- Modify: `src/app/(app)/deposit-private.tsx`
- Modify: `src/app/(app)/send-confirmation.tsx`

- [ ] **Step 1: Update all 4 files**

In each file, replace:
```typescript
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
```
With:
```typescript
import { LAMPORTS_PER_SOL } from '../../constants/solana';
// or the appropriate relative path
```

Note: `LAMPORTS_PER_SOL` from kit is a `bigint` (1_000_000_000n), not a `number`. Some files do `amount / LAMPORTS_PER_SOL` which needs to change to `Number(amount) / Number(LAMPORTS_PER_SOL)` or use the `lamportsToSol()` helper.

- [ ] **Step 2: Verify and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "balance|withdraw|deposit-private|send-confirmation"
git add src/services/yield/balance.ts src/services/yield/withdraw.ts src/app/(app)/deposit-private.tsx src/app/(app)/send-confirmation.tsx
git commit -m "refactor: migrate LAMPORTS_PER_SOL to shared constant"
```

---

## Task 5: Migrate yield deposit (full transaction rebuild)

**Files:**
- Modify: `src/services/yield/deposit.ts`

- [ ] **Step 1: Read the file and rewrite with kit**

Replace all `@solana/web3.js` imports with kit equivalents. The deposit builds a SOL transfer + memo instruction to the Jito vault.

Key changes:
- `Connection` → `getRpc()`
- `new PublicKey(addr)` → `address(addr)`
- `connection.getBalance()` → `rpc.getBalance(address).send()`
- `SystemProgram.transfer()` → build instruction manually with system program address
- `Transaction` → `pipe(createTransactionMessage(), setFeePayer(), setLifetime(), appendInstruction())`
- Transaction signing stays via `transactionSimple` callback (no change to signing interface)

For the memo instruction, check if `@solana/spl-memo` works with kit. If not, build the memo instruction manually:
```typescript
const MEMO_PROGRAM_ID = address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const memoInstruction = {
  programAddress: MEMO_PROGRAM_ID,
  data: new TextEncoder().encode(memoString),
  accounts: [],
};
```

- [ ] **Step 2: Verify and commit**

```bash
npx tsc --noEmit 2>&1 | grep deposit
git add src/services/yield/deposit.ts
git commit -m "refactor: migrate yield deposit to @solana/kit"
```

---

## Task 6: Migrate useSendSimpleTransaction

**Files:**
- Modify: `src/hooks/transactions/useSendSimpleTransaction.ts`

- [ ] **Step 1: Rewrite with kit**

This is the most complex migration. The hook builds SOL and SPL token transfers, signs via Turnkey or local keypair.

Since we're removing SPL token support for now (devnet only), simplify to SOL-only transfers:
- Remove all `@solana/spl-token` imports and token transfer logic
- Keep `buildTransaction` for SOL transfers only
- Update to use kit's functional transaction building

Key pattern:
```typescript
import { pipe, createTransactionMessage, setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstruction, compileTransaction, signTransaction, getSignatureFromTransaction } from '@solana/kit';
import { getRpc, getRpcSubscriptions, toAddress, createSignerFromBase58, sendAndConfirmTransactionFactory } from '../../services/solana/kit';

// Build transaction
const rpc = getRpc();
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const transferInstruction = getTransferSolInstruction({
  source: toAddress(fromAddress),
  destination: toAddress(toAddress),
  amount: lamports(amountLamports),
});

const message = pipe(
  createTransactionMessage({ version: 0 }),
  tx => setTransactionMessageFeePayer(toAddress(fromAddress), tx),
  tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  tx => appendTransactionMessageInstruction(transferInstruction, tx),
);
```

Note: For the system program transfer instruction, use `getTransferSolInstruction` from `@solana-program/system` or build manually:
```typescript
const SYSTEM_PROGRAM = address('11111111111111111111111111111111');
const transferInstruction = {
  programAddress: SYSTEM_PROGRAM,
  accounts: [
    { address: toAddress(from), role: AccountRole.WRITABLE_SIGNER },
    { address: toAddress(to), role: AccountRole.WRITABLE },
  ],
  data: encodeTransferData(amountLamports),
};
```

- [ ] **Step 2: Verify and commit**

```bash
npx tsc --noEmit 2>&1 | grep useSendSimpleTransaction
git add src/hooks/transactions/useSendSimpleTransaction.ts
git commit -m "refactor: migrate useSendSimpleTransaction to @solana/kit"
```

---

## Task 7: Migrate moove.tsx

**Files:**
- Modify: `src/app/(app)/moove.tsx`

- [ ] **Step 1: Rewrite Solana operations**

Same pattern as Task 6 — replace Connection, Transaction, SystemProgram with kit equivalents. The moove screen transfers SOL between cash_wallet and stealf_wallet.

- Remove `@solana/web3.js` imports
- Import from `../../services/solana/kit`
- Use `getRpc()` instead of `new Connection()`
- Build transaction with `pipe()` + `createTransactionMessage()`
- Use `createSignerFromBase58()` for local signing

- [ ] **Step 2: Verify and commit**

```bash
npx tsc --noEmit 2>&1 | grep moove
git add src/app/(app)/moove.tsx
git commit -m "refactor: migrate moove to @solana/kit"
```

---

## Task 8: Migrate add-funds.tsx (airdrop)

**Files:**
- Modify: `src/app/(app)/add-funds.tsx`

- [ ] **Step 1: Rewrite airdrop with kit**

```typescript
import { airdropFactory, lamports } from '@solana/kit';
import { getRpc, getRpcSubscriptions, toAddress } from '../../services/solana/kit';

const rpc = getRpc();
const rpcSubscriptions = getRpcSubscriptions();
const airdrop = airdropFactory({ rpc, rpcSubscriptions });

await airdrop({
  commitment: 'confirmed',
  recipientAddress: toAddress(walletAddress),
  lamports: lamports(1_000_000_000n), // 1 SOL
});
```

- [ ] **Step 2: Verify and commit**

```bash
npx tsc --noEmit 2>&1 | grep add-funds
git add src/app/(app)/add-funds.tsx
git commit -m "refactor: migrate airdrop to @solana/kit"
```

---

## Task 9: Migrate useUmbra to SDK v2

**Files:**
- Modify: `src/hooks/transactions/useUmbra.ts`

- [ ] **Step 1: Update imports to SDK v2**

Replace v1 function names with v2 equivalents:

```typescript
// Old v1 imports:
import {
  createSignerFromPrivateKeyBytes,
  getUmbraClientFromSigner,
  getUserRegistrationFunction,
  getDirectDepositIntoEncryptedBalanceFunction,
  getDirectWithdrawIntoPublicBalanceV3Function,
  getCreateReceiverClaimableUtxoFromEncryptedBalanceFunction,
  getCreateSelfClaimableUtxoFromEncryptedBalanceFunction,
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceFunction,
  getClaimSelfClaimableUtxoIntoEncryptedBalanceFunction,
  getUmbraRelayer,
} from "@umbra-privacy/sdk";

// New v2 imports:
import {
  createSignerFromPrivateKeyBytes,
  getUmbraClient,
  getUserRegistrationFunction,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
  getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction,
  getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction,
  getEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
  getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
  getSelfClaimableUtxoToEncryptedBalanceClaimerFunction,
  getUmbraRelayer,
} from "@umbra-privacy/sdk";
```

- [ ] **Step 2: Update client creation**

```typescript
// Old:
cachedClient = await getUmbraClientFromSigner(
  { signer, network: NETWORK, rpcUrl: RPC_URL, rpcSubscriptionsUrl: WSS_URL, deferMasterSeedSignature: true },
  { masterSeedStorage: masterSeedStorage as any }
);

// New:
cachedClient = await getUmbraClient(
  { signer, network: NETWORK, rpcUrl: RPC_URL, rpcSubscriptionsUrl: WSS_URL },
  { masterSeedStorage: { load: masterSeedStorage.load, store: masterSeedStorage.store } }
);
```

- [ ] **Step 3: Update all function calls**

Replace each function reference:
- `getDirectDepositIntoEncryptedBalanceFunction` → `getPublicBalanceToEncryptedBalanceDirectDepositorFunction`
- `getDirectWithdrawIntoPublicBalanceV3Function` → `getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction`
- `getCreateReceiverClaimableUtxoFromEncryptedBalanceFunction` → `getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction`
- `getCreateSelfClaimableUtxoFromEncryptedBalanceFunction` → `getEncryptedBalanceToSelfClaimableUtxoCreatorFunction`
- `getClaimReceiverClaimableUtxoIntoEncryptedBalanceFunction` → `getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction`
- `getClaimSelfClaimableUtxoIntoEncryptedBalanceFunction` → `getSelfClaimableUtxoToEncryptedBalanceClaimerFunction`

Update the IUmbraClient import:
```typescript
// Old:
import type { IUmbraClient } from "@umbra-privacy/sdk/interfaces";
import { isEncryptedDepositError } from "@umbra-privacy/sdk/errors";

// New:
import type { IUmbraClient } from "@umbra-privacy/sdk";
import { isEncryptedDepositError } from "@umbra-privacy/sdk";
```

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit 2>&1 | grep useUmbra
git add src/hooks/transactions/useUmbra.ts
git commit -m "feat: upgrade useUmbra to @umbra-privacy/sdk v2"
```

---

## Task 10: Remove old packages and verify

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove old Solana packages**

```bash
npm uninstall @solana/web3.js @solana/spl-token
```

Note: Keep `@solana/spl-memo` only if still used. If the memo instruction was inlined in Task 5, remove it too.

- [ ] **Step 2: Verify no remaining imports**

```bash
grep -r "@solana/web3.js\|@solana/spl-token" src/ --include="*.ts" --include="*.tsx"
```

Expected: no results.

- [ ] **Step 3: Full type check**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: zero errors.

- [ ] **Step 4: Test the app**

```bash
npx expo start --clear
```

Verify: sign-in, airdrop, send SOL, moove, deposit yield all work.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove @solana/web3.js and @solana/spl-token"
```

---

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| `@solana/kit` uses async crypto (Web Crypto API) which needs polyfills on Hermes | Already polyfilled in `polyfills.ts` via `react-native-quick-crypto` |
| Turnkey SDK signing interface may not be compatible with kit's transaction format | Keep the `transactionTurnkey` function which serializes the transaction — update serialization to use kit's `getBase64EncodedWireTransaction` |
| `@solana/spl-memo` may depend on web3.js v1 | Build memo instruction manually (3 lines of code) |
| Umbra SDK v2 may have breaking API changes beyond function renames | The type definitions show the same patterns (args/deps objects). If issues arise, contact Cal. |
| `createKeyPairSignerFromPrivateKeyBytes` expects 32-byte key but current code stores 64-byte keys | Handle in `createSignerFromBase58` helper — slice to 32 bytes if 64 received |
