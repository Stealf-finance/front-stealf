import { base58ToHex, base64ToBase58, createSeedVaultWallet } from '../services/solanaWalletBridge';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import bs58 from 'bs58';

describe('solanaWalletBridge', () => {
  describe('base58ToHex', () => {
    it('converts a valid base58 Solana address to hex', () => {
      // Known conversion: base58 "11111111111111111111111111111111" = 32 zero bytes
      const zeroAddress = '11111111111111111111111111111111';
      const hex = base58ToHex(zeroAddress);
      expect(hex).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('produces a 64-character hex string for a 32-byte key', () => {
      // Generate a known public key
      const bytes = new Uint8Array(32);
      bytes[0] = 0xff;
      bytes[31] = 0x01;
      const addr = bs58.encode(bytes);
      const hex = base58ToHex(addr);
      expect(hex).toHaveLength(64);
      expect(hex.startsWith('ff')).toBe(true);
      expect(hex.endsWith('01')).toBe(true);
    });

    it('roundtrips correctly base58 -> hex -> base58', () => {
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) bytes[i] = i;
      const original = bs58.encode(bytes);
      const hex = base58ToHex(original);
      const recovered = bs58.encode(Buffer.from(hex, 'hex'));
      expect(recovered).toBe(original);
    });
  });

  describe('base64ToBase58', () => {
    it('converts base64-encoded address to base58', () => {
      const bytes = new Uint8Array(32);
      bytes[0] = 1;
      const base64 = Buffer.from(bytes).toString('base64');
      const base58Result = base64ToBase58(base64);
      const expected = bs58.encode(bytes);
      expect(base58Result).toBe(expected);
    });

    it('roundtrips base58 -> base64 -> base58', () => {
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) bytes[i] = (i * 7) % 256;
      const originalBase58 = bs58.encode(bytes);
      const asBase64 = Buffer.from(bytes).toString('base64');
      const recovered = base64ToBase58(asBase64);
      expect(recovered).toBe(originalBase58);
    });
  });

  describe('createSeedVaultWallet', () => {
    const TEST_ADDRESS = bs58.encode(new Uint8Array(32).fill(42));
    const TEST_AUTH_TOKEN = 'test-auth-token';

    beforeEach(() => {
      (transact as jest.Mock).mockClear();
    });

    it('returns an object with type Solana', () => {
      const bridge = createSeedVaultWallet(TEST_ADDRESS, TEST_AUTH_TOKEN);
      expect(bridge.type).toBe('solana');
    });

    it('getPublicKey returns hex-encoded public key', async () => {
      const bridge = createSeedVaultWallet(TEST_ADDRESS, TEST_AUTH_TOKEN);
      const hex = await bridge.getPublicKey();
      expect(hex).toHaveLength(64);
      // Should match base58ToHex
      const expected = base58ToHex(TEST_ADDRESS);
      expect(hex).toBe(expected);
    });

    it('getPublicKey does not call transact (no MWA needed)', async () => {
      const bridge = createSeedVaultWallet(TEST_ADDRESS, TEST_AUTH_TOKEN);
      await bridge.getPublicKey();
      expect(transact).not.toHaveBeenCalled();
    });

    it('signMessage calls transact and returns hex signature', async () => {
      const bridge = createSeedVaultWallet(TEST_ADDRESS, TEST_AUTH_TOKEN);
      const signature = await bridge.signMessage('test message');
      expect(transact).toHaveBeenCalledTimes(1);
      expect(typeof signature).toBe('string');
      // Signature should be hex-encoded
      expect(/^[0-9a-f]+$/.test(signature)).toBe(true);
    });

    it('signTransaction calls transact and returns Uint8Array', async () => {
      const bridge = createSeedVaultWallet(TEST_ADDRESS, TEST_AUTH_TOKEN);
      const mockTx = new Uint8Array([1, 2, 3, 4]);
      const signed = await bridge.signTransaction(mockTx);
      expect(transact).toHaveBeenCalledTimes(1);
      expect(signed).toBeInstanceOf(Uint8Array);
    });

    it('signAndSendTransaction calls transact and returns tx signature string', async () => {
      const bridge = createSeedVaultWallet(TEST_ADDRESS, TEST_AUTH_TOKEN);
      const mockTx = new Uint8Array([1, 2, 3, 4]);
      const txId = await bridge.signAndSendTransaction(mockTx, 'https://api.devnet.solana.com');
      expect(transact).toHaveBeenCalledTimes(1);
      expect(typeof txId).toBe('string');
      expect(txId).toBe('mock-tx-signature');
    });
  });
});
