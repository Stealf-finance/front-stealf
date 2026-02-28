import { base58ToHex, base64ToBase58, createColdWallet } from '../services/solanaWalletBridge';
import * as SecureStore from 'expo-secure-store';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Mock Transaction and Connection from @solana/web3.js to avoid needing valid serialized bytes
jest.mock('@solana/web3.js', () => ({
  ...jest.requireActual('@solana/web3.js'),
  Transaction: {
    from: jest.fn().mockReturnValue({ feePayer: null }),
  },
  Connection: jest.fn().mockImplementation(() => ({
    sendRawTransaction: jest.fn().mockResolvedValue('mock-cold-signature'),
  })),
}));

describe('solanaWalletBridge', () => {
  describe('base58ToHex', () => {
    it('converts a valid base58 Solana address to hex', () => {
      // Known conversion: base58 "11111111111111111111111111111111" = 32 zero bytes
      const zeroAddress = '11111111111111111111111111111111';
      const hex = base58ToHex(zeroAddress);
      expect(hex).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('produces a 64-character hex string for a 32-byte key', () => {
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

  describe('createColdWallet', () => {
    const testSeed = new Uint8Array(32).fill(42);
    const testKeypair = Keypair.fromSeed(testSeed);
    const testAddressBase58 = testKeypair.publicKey.toBase58();
    const testStoredKey = bs58.encode(testKeypair.secretKey);

    beforeEach(() => {
      (SecureStore.getItemAsync as jest.Mock).mockReset();
    });

    it('returns an object with type Solana', () => {
      const bridge = createColdWallet(testAddressBase58);
      expect(bridge.type).toBe('solana');
    });

    it('getPublicKey returns hex-encoded public key without calling SecureStore', async () => {
      const bridge = createColdWallet(testAddressBase58);
      const hex = await bridge.getPublicKey();
      expect(hex).toBe(base58ToHex(testAddressBase58));
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it('signTransaction signs locally', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(testStoredKey);

      const mockPartialSign = jest.fn();
      const mockSerialize = jest.fn().mockReturnValue(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
      const { Transaction } = jest.requireMock('@solana/web3.js');
      (Transaction.from as jest.Mock).mockReturnValueOnce({
        feePayer: null,
        partialSign: mockPartialSign,
        serialize: mockSerialize,
      });

      const bridge = createColdWallet(testAddressBase58);
      const result = await bridge.signTransaction(new Uint8Array([1, 2, 3]));

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('stealf_private_key');
      expect(mockPartialSign).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('signTransaction throws if both private key and mnemonic are absent', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(null)  // stealf_private_key
        .mockResolvedValueOnce(null); // stealf_wallet_mnemonic

      const bridge = createColdWallet(testAddressBase58);

      await expect(bridge.signTransaction(new Uint8Array([1, 2, 3]))).rejects.toThrow(
        '[ColdWallet] Key not found'
      );
    });

    it('signMessage signs locally', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(testStoredKey);

      const bridge = createColdWallet(testAddressBase58);
      const result = await bridge.signMessage('test message');

      expect(typeof result).toBe('string');
      expect(/^[0-9a-f]+$/.test(result)).toBe(true);
      expect(result.length).toBe(128); // ed25519 = 64 bytes = 128 hex chars
    });

    it('signMessage throws if both private key and mnemonic are absent', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(null)  // stealf_private_key
        .mockResolvedValueOnce(null); // stealf_wallet_mnemonic

      const bridge = createColdWallet(testAddressBase58);

      await expect(bridge.signMessage('test')).rejects.toThrow('[ColdWallet] Key not found');
    });

    it('signMessage falls back to mnemonic when private key is absent', async () => {
      const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(null)          // stealf_private_key → absent
        .mockResolvedValueOnce(testMnemonic); // stealf_wallet_mnemonic → present

      const bridge = createColdWallet(testAddressBase58);
      const result = await bridge.signMessage('test message');

      expect(typeof result).toBe('string');
      expect(/^[0-9a-f]+$/.test(result)).toBe(true);
      expect(result.length).toBe(128);
    });

    it('signAndSendTransaction signs locally and returns transaction signature', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(testStoredKey);

      const mockPartialSign = jest.fn();
      const mockSerialize = jest.fn().mockReturnValue(Buffer.from([0x01, 0x02]));
      const { Transaction } = jest.requireMock('@solana/web3.js');
      (Transaction.from as jest.Mock).mockReturnValueOnce({
        feePayer: null,
        partialSign: mockPartialSign,
        serialize: mockSerialize,
      });

      const bridge = createColdWallet(testAddressBase58);
      const result = await bridge.signAndSendTransaction(
        new Uint8Array([1, 2, 3]),
        'https://api.devnet.solana.com'
      );

      expect(typeof result).toBe('string');
      expect(result).toBe('mock-cold-signature');
    });

    it('signAndSendTransaction throws if both private key and mnemonic are absent', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(null)  // stealf_private_key
        .mockResolvedValueOnce(null); // stealf_wallet_mnemonic

      const bridge = createColdWallet(testAddressBase58);

      await expect(
        bridge.signAndSendTransaction(new Uint8Array([1, 2, 3]), 'https://api.devnet.solana.com')
      ).rejects.toThrow('[ColdWallet] Key not found');
    });
  });
});
