# 🔧 React Native Migration Guide

Complete guide to make the Stealf SDK compatible with React Native.

---

## 📋 Overview

The current SDK uses Node.js-specific APIs that don't work in React Native:
- ❌ `crypto` module (Node.js native)
- ❌ `Buffer` class (Node.js global)
- ⚠️ `@arcium-hq/client` (potentially Node.js-only)

**Solution:** Replace with React Native compatible alternatives.

---

## 🎯 Required Changes

### Change #1: Replace `crypto` with `expo-crypto`

#### File: `sdk/src/utils/encryption.ts`

**Current code (lines 3, 40, 105):**
```typescript
import { randomBytes } from "crypto";

// Line 40
const clientNonce = randomBytes(16);

// Line 105
static generateComputationOffset(): bigint {
  return BigInt('0x' + randomBytes(8).toString('hex'));
}
```

**New code:**
```typescript
// At top of file
import * as Crypto from 'expo-crypto';

// Helper function to add at top
async function getRandomBytes(length: number): Promise<Uint8Array> {
  const bytes = await Crypto.getRandomBytesAsync(length);
  return new Uint8Array(bytes);
}

// Line 40 - make encryptWallets async
const clientNonce = await getRandomBytes(16);

// Line 105 - make generateComputationOffset async
static async generateComputationOffset(): Promise<bigint> {
  const bytes = await getRandomBytes(8);
  return BigInt('0x' + Buffer.from(bytes).toString('hex'));
}
```

---

### Change #2: Replace `Buffer` with Uint8Array utilities

#### File: `sdk/src/utils/encryption.ts`

**Add helper functions at the top:**
```typescript
/**
 * Convert bytes to hex string (Buffer.toString('hex') replacement)
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array (Buffer.from(hex, 'hex') replacement)
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert u128 BigInt to Uint8Array (16 bytes)
 */
function u128ToBytes(value: bigint): Uint8Array {
  const hex = value.toString(16).padStart(32, '0');
  return hexToBytes(hex);
}

/**
 * Concat Uint8Arrays (Buffer.concat replacement)
 */
function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
```

**Replace Buffer usage:**

**Lines 19, 32-33, 36-37 - Change return type and conversions:**
```typescript
// OLD
static encryptWallets(
  // ...
): {
  ciphertexts: number[][];
  clientPubKey: Uint8Array;
  clientNonce: Buffer;  // ❌ Change this
  cipher: RescueCipher;
}

// Line 32-33
const gridLow = BigInt('0x' + Buffer.from(gridBytes.slice(0, 16)).toString('hex'));
const gridHigh = BigInt('0x' + Buffer.from(gridBytes.slice(16, 32)).toString('hex'));

// NEW
static async encryptWallets(  // ✅ Now async
  // ...
): Promise<{  // ✅ Now returns Promise
  ciphertexts: number[][];
  clientPubKey: Uint8Array;
  clientNonce: Uint8Array;  // ✅ Changed to Uint8Array
  cipher: RescueCipher;
}>

// Line 32-33 - Use helper function
const gridLow = BigInt('0x' + bytesToHex(gridBytes.slice(0, 16)));
const gridHigh = BigInt('0x' + bytesToHex(gridBytes.slice(16, 32)));
```

**Lines 36-37, 70, 84-87, 90-96:**
```typescript
// OLD
const privateLow = BigInt('0x' + Buffer.from(privateBytes.slice(0, 16)).toString('hex'));
const privateHigh = BigInt('0x' + Buffer.from(privateBytes.slice(16, 32)).toString('hex'));

// Line 70
const eventNonce = Buffer.from(event.nonce);

// Line 84-87
const u128ToBytes = (value: bigint): Buffer => {
  const hex = value.toString(16).padStart(32, '0');
  return Buffer.from(hex, 'hex');
};

// Line 90-96
const gridWallet = new PublicKey(
  Buffer.concat([u128ToBytes(decrypted[0]), u128ToBytes(decrypted[1])])
);

const privateWallet = new PublicKey(
  Buffer.concat([u128ToBytes(decrypted[2]), u128ToBytes(decrypted[3])])
);

// NEW
const privateLow = BigInt('0x' + bytesToHex(privateBytes.slice(0, 16)));
const privateHigh = BigInt('0x' + bytesToHex(privateBytes.slice(16, 32)));

// Line 70 - Convert to Uint8Array
const eventNonce = new Uint8Array(event.nonce);

// Line 84-87 - Remove, use helper function instead

// Line 90-96 - Use helper functions
const gridWallet = new PublicKey(
  concatUint8Arrays([u128ToBytes(decrypted[0]), u128ToBytes(decrypted[1])])
);

const privateWallet = new PublicKey(
  concatUint8Arrays([u128ToBytes(decrypted[2]), u128ToBytes(decrypted[3])])
);
```

---

### Change #3: Update WalletLinkClient to use async encryption

#### File: `sdk/src/client/WalletLinkClient.ts`

**Line 17 - Remove crypto import:**
```typescript
// OLD
import { randomBytes } from "crypto";

// NEW
// Remove this line - using expo-crypto in encryption.ts
```

**Lines where encryptWallets is called:**

Find all calls to `encryptWallets` and make them `await`:

```typescript
// OLD
const { ciphertexts, clientPubKey, clientNonce, cipher } =
  EncryptionUtils.encryptWallets(gridWallet, privateWallet, mxePublicKey);

// NEW
const { ciphertexts, clientPubKey, clientNonce, cipher } =
  await EncryptionUtils.encryptWallets(gridWallet, privateWallet, mxePublicKey);
```

**Make the calling function async if not already:**
```typescript
// If the function is not async, add async:
async linkSmartAccountWithPrivateWallet(options) {
  // ...
}
```

**Lines where generateComputationOffset is called:**

```typescript
// OLD
const computationOffset = EncryptionUtils.generateComputationOffset();

// NEW
const computationOffset = await EncryptionUtils.generateComputationOffset();
```

---

### Change #4: Install Required Dependencies

#### Add to `sdk/package.json`:

```json
{
  "dependencies": {
    "@arcium-hq/client": "^0.4.0",
    "expo-crypto": "^13.0.0"  // ✅ Add this
  },
  "peerDependencies": {
    "@coral-xyz/anchor": "^0.32.1",
    "@solana/web3.js": "^1.95.8"
  }
}
```

**Install:**
```bash
cd sdk
npm install expo-crypto
```

---

### Change #5: Add Buffer Polyfill for Frontend

The frontend React Native app needs Buffer polyfill for `@solana/web3.js`.

#### Frontend: Install polyfills

```bash
npm install buffer react-native-get-random-values
```

#### Frontend: Setup polyfills

**File: `App.tsx` (or entry point) - ADD AT THE VERY TOP:**

```typescript
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Make Buffer global
global.Buffer = Buffer;

// Rest of your imports
import React from 'react';
// ...
```

#### Frontend: Configure Metro bundler

**File: `metro.config.js`:**

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  crypto: require.resolve('expo-crypto'),
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer'),
};

module.exports = config;
```

---

## 📦 Complete Dependency List

### SDK Dependencies

Add to `sdk/package.json`:
```json
{
  "dependencies": {
    "@arcium-hq/client": "^0.4.0",
    "expo-crypto": "^13.0.0"
  },
  "peerDependencies": {
    "@coral-xyz/anchor": "^0.32.1",
    "@solana/web3.js": "^1.95.8"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### Frontend Dependencies

Add to your React Native `package.json`:
```json
{
  "dependencies": {
    "@solana/web3.js": "^1.95.8",
    "@coral-xyz/anchor": "^0.32.1",
    "@solana/wallet-adapter-react": "^0.15.0",
    "buffer": "^6.0.3",
    "react-native-get-random-values": "^1.11.0",
    "expo-crypto": "^13.0.0"
  }
}
```

---

## 🔍 Testing @arcium-hq/client Compatibility

The `@arcium-hq/client` package might not work in React Native out of the box.

### Test it:

1. **Try importing in RN:**
   ```typescript
   import { RescueCipher, x25519 } from '@arcium-hq/client';
   ```

2. **Run the app and check for errors**

3. **Potential issues:**
   - ❌ Uses Node.js crypto internally
   - ❌ Uses fs, net, or other Node modules
   - ❌ Not bundled for React Native

### If it doesn't work:

**Option A:** Contact Arcium team for React Native support

**Option B:** Create wrapper/adapter:
```typescript
// sdk/src/utils/arcium-rn-adapter.ts
// Re-export only what works in RN
export { x25519 } from '@arcium-hq/client';

// Potentially need to polyfill RescueCipher
// or use a different encryption library
```

---

## ✅ Verification Checklist

After making all changes:

- [ ] All `crypto` imports removed
- [ ] All `Buffer` usage replaced with Uint8Array
- [ ] `encryptWallets` is async and returns Promise
- [ ] `generateComputationOffset` is async
- [ ] `expo-crypto` installed in SDK
- [ ] All calls to async functions use `await`
- [ ] Frontend has buffer polyfill
- [ ] Frontend has react-native-get-random-values
- [ ] Metro config updated
- [ ] SDK builds without errors: `npm run build`
- [ ] Frontend imports SDK without errors
- [ ] Test encryption/decryption flow

---

## 🧪 Testing Steps

### 1. Test SDK Build

```bash
cd sdk
npm run build
```

Should compile without errors.

### 2. Test Frontend Import

```typescript
// In your React Native app
import { WalletLinkClient } from '@stealf/wallet-link-sdk';

console.log('SDK imported:', WalletLinkClient);
```

Should not crash.

### 3. Test Encryption

```typescript
import { EncryptionUtils } from '@stealf/wallet-link-sdk';
import { PublicKey } from '@solana/web3.js';

const testEncryption = async () => {
  const gridWallet = new PublicKey('...');
  const privateWallet = new PublicKey('...');
  const mxePublicKey = new Uint8Array(32); // Mock

  const result = await EncryptionUtils.encryptWallets(
    gridWallet,
    privateWallet,
    mxePublicKey
  );

  console.log('Encrypted:', result);
};
```

Should work without errors.

---

## 📝 Summary of Files to Modify

| File | Changes | Complexity |
|------|---------|-----------|
| `sdk/src/utils/encryption.ts` | Replace crypto, Buffer → Uint8Array | ⭐⭐⭐ High |
| `sdk/src/client/WalletLinkClient.ts` | Remove crypto import, await async calls | ⭐⭐ Medium |
| `sdk/package.json` | Add expo-crypto dependency | ⭐ Easy |
| Frontend: `App.tsx` | Add polyfills at top | ⭐ Easy |
| Frontend: `metro.config.js` | Configure bundler | ⭐⭐ Medium |
| Frontend: `package.json` | Add polyfill dependencies | ⭐ Easy |

---

## 🚀 Quick Migration Steps

1. **Add helper functions to `encryption.ts`:**
   - `bytesToHex()`
   - `hexToBytes()`
   - `u128ToBytes()`
   - `concatUint8Arrays()`
   - `getRandomBytes()`

2. **Replace all Buffer usage:**
   - `Buffer.from()` → `hexToBytes()` or `new Uint8Array()`
   - `Buffer.concat()` → `concatUint8Arrays()`
   - `.toString('hex')` → `bytesToHex()`

3. **Make functions async:**
   - `encryptWallets()` → `async encryptWallets()`
   - `generateComputationOffset()` → `async generateComputationOffset()`

4. **Update callers:**
   - Add `await` to all calls
   - Make calling functions `async`

5. **Install dependencies:**
   - SDK: `expo-crypto`
   - Frontend: `buffer`, `react-native-get-random-values`

6. **Setup frontend:**
   - Add polyfills to `App.tsx`
   - Configure `metro.config.js`

7. **Test:**
   - Build SDK
   - Import in frontend
   - Test encryption flow

---

## 🆘 If You Get Stuck

### Common Errors:

**"crypto is not defined"**
- ✅ Make sure you replaced all `import { randomBytes } from "crypto"`
- ✅ Check metro.config.js has crypto polyfill

**"Buffer is not defined"**
- ✅ Add polyfill in App.tsx
- ✅ Use Uint8Array instead of Buffer in SDK

**"Cannot find module 'expo-crypto'"**
- ✅ Install: `npm install expo-crypto`
- ✅ Rebuild: `npm run build`

**"RescueCipher is not a constructor"**
- ⚠️ `@arcium-hq/client` might not work in RN
- 📧 Contact Arcium support

---

## 📞 Need Help?

If you encounter issues:
1. Check error messages carefully
2. Verify all polyfills are installed
3. Check Metro bundler output
4. Test each change incrementally
5. Create an issue with error details

---

**Good luck with the migration! 🚀**

The changes are significant but straightforward. Take it step by step, and test after each major change.
