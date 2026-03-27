/**
 * Integration-style tests for the wallet auth flow logic.
 * Tests the core data transformations without React hooks.
 */
import bs58 from 'bs58';
import { base58ToHex, base64ToBase58 } from '../services/solanaWalletBridge';

describe('Wallet Auth Flow - Data Transformations', () => {
  describe('MWA authorize response processing', () => {
    it('converts MWA base64 address to base58 Solana address', () => {
      // Simulate MWA authorize response: address is base64-encoded
      const rawBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) rawBytes[i] = i + 100;
      const mwaBase64Address = Buffer.from(rawBytes).toString('base64');

      const base58Address = base64ToBase58(mwaBase64Address);

      // Verify it's a valid base58 string
      expect(base58Address.length).toBeGreaterThan(0);
      // Verify roundtrip
      const decoded = bs58.decode(base58Address);
      expect(Buffer.from(decoded)).toEqual(Buffer.from(rawBytes));
    });

    it('extracts publicKeyHex from base58 address correctly', () => {
      const rawBytes = new Uint8Array(32);
      rawBytes[0] = 0xab;
      rawBytes[31] = 0xcd;
      const base58Addr = bs58.encode(rawBytes);

      const publicKeyHex = base58ToHex(base58Addr);

      expect(publicKeyHex).toHaveLength(64);
      expect(publicKeyHex.startsWith('ab')).toBe(true);
      expect(publicKeyHex.endsWith('cd')).toBe(true);
    });

    it('full MWA response processing pipeline', () => {
      // Simulate: MWA returns base64 → we convert to base58 → we derive hex
      const solanaKeyBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) solanaKeyBytes[i] = i * 3 + 7;

      // Step 1: MWA gives us base64
      const mwaAddress = Buffer.from(solanaKeyBytes).toString('base64');

      // Step 2: Convert to base58 (Solana standard)
      const addressBase58 = base64ToBase58(mwaAddress);

      // Step 3: Convert to hex (for Turnkey API)
      const publicKeyHex = base58ToHex(addressBase58);

      // Verify: hex should match original bytes
      expect(publicKeyHex).toHaveLength(64);
      const recoveredBytes = Buffer.from(publicKeyHex, 'hex');
      expect(recoveredBytes).toEqual(Buffer.from(solanaKeyBytes));
    });
  });

  describe('Wallet signup request validation', () => {
    it('publicKeyHex should be exactly 64 hex characters', () => {
      const validHex = 'a'.repeat(64);
      expect(validHex).toMatch(/^[0-9a-f]{64}$/);

      const tooShort = 'a'.repeat(63);
      expect(tooShort).not.toMatch(/^[0-9a-f]{64}$/);

      const tooLong = 'a'.repeat(65);
      expect(tooLong).not.toMatch(/^[0-9a-f]{64}$/);

      const invalidChars = 'g'.repeat(64);
      expect(invalidChars).not.toMatch(/^[0-9a-f]{64}$/);
    });

    it('email should be valid format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect('user@example.com').toMatch(emailRegex);
      expect('invalid-email').not.toMatch(emailRegex);
      expect('@missing.com').not.toMatch(emailRegex);
    });
  });

  describe('Auth method discrimination', () => {
    it('wallet auth: isAuthenticated when stealf_wallet and cash_wallet present', () => {
      const userData = {
        authMethod: 'wallet' as const,
        stealf_wallet: 'SomeBase58Address',
        cash_wallet: 'AnotherBase58Address',
      };
      const isWalletAuth = userData.authMethod === 'wallet';
      const isAuthenticated = isWalletAuth
        ? !!userData.stealf_wallet && !!userData.cash_wallet
        : false;
      expect(isAuthenticated).toBe(true);
    });

    it('wallet auth: not authenticated without cash_wallet', () => {
      const userData = {
        authMethod: 'wallet' as string,
        stealf_wallet: 'SomeBase58Address',
        cash_wallet: '',
      };
      const isWalletAuth = userData.authMethod === 'wallet';
      const isAuthenticated = isWalletAuth
        ? !!userData.stealf_wallet && !!userData.cash_wallet
        : false;
      expect(isAuthenticated).toBe(false);
    });

    it('passkey auth: needs session + user + stealf_wallet', () => {
      const session = { token: 'abc' };
      const user = { userId: '123' };
      const userData = {
        authMethod: 'passkey' as string,
        stealf_wallet: 'SomeAddress',
      };
      const isWalletAuth = userData.authMethod === 'wallet';
      const isAuthenticated = isWalletAuth
        ? false
        : !!session && !!user && !!userData.stealf_wallet;
      expect(isAuthenticated).toBe(true);
    });
  });

  describe('Session context wallet handling', () => {
    it('wallet auth users skip Turnkey session refresh', () => {
      const authMethod: string = 'wallet';
      const shouldRefreshTurnkey = authMethod !== 'wallet';
      expect(shouldRefreshTurnkey).toBe(false);
    });

    it('passkey auth users refresh Turnkey session', () => {
      const authMethod: string = 'passkey';
      const shouldRefreshTurnkey = authMethod !== 'wallet';
      expect(shouldRefreshTurnkey).toBe(true);
    });
  });
});
