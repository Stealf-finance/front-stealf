/**
 * SecureStorageService Tests
 *
 * Comprehensive tests for:
 * - Password validation
 * - Biometric availability checks
 * - Wallet save/load operations
 * - Device security checks
 * - Encryption/decryption (mocked)
 */

import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
// expo-device is mocked below
import { Keypair } from '@solana/web3.js';
import { secureStorageService } from '../secureStorage';

// Mock state for expo-device
const deviceState = { isDevice: true };

// Mock the entire module
jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');
jest.mock('expo-device', () => ({
  __esModule: true,
  get isDevice() {
    return deviceState.isDevice;
  },
  isRootedExperimentalAsync: jest.fn().mockResolvedValue(false),
  deviceName: 'iPhone',
  modelName: 'iPhone 14',
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;

describe('SecureStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue();
    mockSecureStore.deleteItemAsync.mockResolvedValue();

    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([1]); // FINGERPRINT
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

    // Reset Device mock to default (real device)
    deviceState.isDevice = true;
  });

  describe('validatePasswordStrength', () => {
    it('should accept a valid strong password', () => {
      const result = secureStorageService.validatePasswordStrength('SecurePass123');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = secureStorageService.validatePasswordStrength('Pass1');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('8'))).toBe(true);
    });

    it('should reject password without uppercase letter', () => {
      const result = secureStorageService.validatePasswordStrength('password123');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('majuscule'))).toBe(true);
    });

    it('should reject password without lowercase letter', () => {
      const result = secureStorageService.validatePasswordStrength('PASSWORD123');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('minuscule'))).toBe(true);
    });

    it('should reject password without number', () => {
      const result = secureStorageService.validatePasswordStrength('SecurePassword');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('chiffre'))).toBe(true);
    });

    it('should return multiple errors for very weak password', () => {
      const result = secureStorageService.validatePasswordStrength('pass');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept password with special characters', () => {
      const result = secureStorageService.validatePasswordStrength('Secure@Pass123!');

      expect(result.valid).toBe(true);
    });

    it('should accept minimum valid password', () => {
      const result = secureStorageService.validatePasswordStrength('Abcdefg1');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('isBiometricsAvailable', () => {
    it('should return true when hardware and enrollment are available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);

      const result = await secureStorageService.isBiometricsAvailable();

      expect(result).toBe(true);
    });

    it('should return false when hardware is not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      const result = await secureStorageService.isBiometricsAvailable();

      expect(result).toBe(false);
    });

    it('should return false when not enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

      const result = await secureStorageService.isBiometricsAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getBiometricType', () => {
    it('should return facial for Face ID', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([2]); // FACIAL_RECOGNITION

      const result = await secureStorageService.getBiometricType();

      expect(result).toBe('facial');
    });

    it('should return fingerprint for Touch ID', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([1]); // FINGERPRINT

      const result = await secureStorageService.getBiometricType();

      expect(result).toBe('fingerprint');
    });

    it('should return iris for iris scanner', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([3]); // IRIS

      const result = await secureStorageService.getBiometricType();

      expect(result).toBe('iris');
    });

    it('should prefer facial over fingerprint when both available', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([1, 2]);

      const result = await secureStorageService.getBiometricType();

      expect(result).toBe('facial');
    });

    it('should return null when no biometrics available', async () => {
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);

      const result = await secureStorageService.getBiometricType();

      expect(result).toBeNull();
    });
  });

  describe('checkDeviceSecurity', () => {
    it('should return secure status for non-rooted device', async () => {
      deviceState.isDevice = true;

      const result = await secureStorageService.checkDeviceSecurity();

      expect(result.isRooted).toBe(false);
      expect(result.securityLevel).toBe('high');
    });

    it('should detect emulator', async () => {
      deviceState.isDevice = false;

      const result = await secureStorageService.checkDeviceSecurity();

      expect(result.isEmulator).toBe(true);
      expect(result.securityLevel).toBe('medium');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should return warnings array', async () => {
      const result = await secureStorageService.checkDeviceSecurity();

      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('hasWallet', () => {
    it('should return true when wallet is initialized', async () => {
      mockSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === 'stealf_wallet_initialized') {
          return 'true';
        }
        return null;
      });

      const result = await secureStorageService.hasWallet();

      expect(result).toBe(true);
    });

    it('should return false when no wallet data exists', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await secureStorageService.hasWallet();

      expect(result).toBe(false);
    });
  });

  describe('saveWallet', () => {
    const mockKeypair = Keypair.generate();
    const mockPassword = 'SecurePass123';

    it('should save wallet with biometric auth method', async () => {
      await secureStorageService.saveWallet(mockKeypair, 'biometric', mockPassword);

      // Should have called setItemAsync multiple times
      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();

      // Verify it saved the password-protected key
      const calls = mockSecureStore.setItemAsync.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });

    it('should save wallet with password auth method', async () => {
      await secureStorageService.saveWallet(mockKeypair, 'password', mockPassword);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('should store encrypted data, not plaintext', async () => {
      await secureStorageService.saveWallet(mockKeypair, 'biometric', mockPassword);

      // Check that stored data is not the raw secret key
      const calls = mockSecureStore.setItemAsync.mock.calls;
      const storedValues = calls.map(call => call[1]);

      // None of the stored values should be the raw base58 secret key
      const rawSecretKey = Buffer.from(mockKeypair.secretKey).toString('base64');
      storedValues.forEach(value => {
        expect(value).not.toBe(rawSecretKey);
      });
    });

    it('should throw error for weak password', async () => {
      await expect(
        secureStorageService.saveWallet(mockKeypair, 'password', 'weak')
      ).rejects.toThrow();
    });
  });

  describe('deleteWallet', () => {
    it('should delete all wallet-related storage keys', async () => {
      await secureStorageService.deleteWallet();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('stealf_pk_bio');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('stealf_pk_pwd');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('stealf_pwd_hash');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('stealf_salt');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('stealf_public_key');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('stealf_auth_method');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('stealf_wallet_initialized');
    });
  });

  describe('unlockWithBiometrics', () => {
    beforeEach(() => {
      // Setup wallet exists
      mockSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === 'stealf_wallet_initialized') {
          return 'true';
        }
        if (key === 'stealf_pk_bio') {
          return 'mockBase58PrivateKey';
        }
        return null;
      });
    });

    it('should return biometric_cancelled when user cancels', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const result = await secureStorageService.unlockWithBiometrics();

      expect(result.success).toBe(false);
      expect((result as { success: false; error: string }).error).toBe('biometric_cancelled');
    });

    it('should return biometric_failed when authentication fails', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'authentication_failed',
      });

      const result = await secureStorageService.unlockWithBiometrics();

      expect(result.success).toBe(false);
      expect((result as { success: false; error: string }).error).toBe('biometric_failed');
    });

    it('should return wallet_not_found when no wallet exists', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await secureStorageService.unlockWithBiometrics();

      expect(result.success).toBe(false);
      expect((result as { success: false; error: string }).error).toBe('wallet_not_found');
    });

    it('should return biometric_not_available when biometrics unavailable', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      const result = await secureStorageService.unlockWithBiometrics();

      expect(result.success).toBe(false);
      expect((result as { success: false; error: string }).error).toBe('biometric_not_available');
    });
  });

  describe('unlockWithPassword', () => {
    beforeEach(() => {
      mockSecureStore.getItemAsync.mockImplementation(async (key) => {
        switch (key) {
          case 'stealf_wallet_initialized':
            return 'true';
          case 'stealf_pk_pwd':
            return JSON.stringify({ ciphertext: 'mock', iv: 'mock' });
          case 'stealf_pwd_hash':
            return 'mockhash';
          case 'stealf_salt':
            return '0'.repeat(64); // 32 bytes as hex
          default:
            return null;
        }
      });
    });

    it('should return password_invalid for wrong password', async () => {
      const result = await secureStorageService.unlockWithPassword('WrongPassword123');

      expect(result.success).toBe(false);
      expect((result as { success: false; error: string }).error).toBe('password_invalid');
    });

    it('should return wallet_not_found when no wallet exists', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await secureStorageService.unlockWithPassword('TestPassword123');

      expect(result.success).toBe(false);
      expect((result as { success: false; error: string }).error).toBe('wallet_not_found');
    });
  });

  describe('getStoredPublicKey', () => {
    it('should return stored public key', async () => {
      const expectedKey = 'SomePublicKeyBase58';
      mockSecureStore.getItemAsync.mockResolvedValue(expectedKey);

      const result = await secureStorageService.getStoredPublicKey();

      expect(result).toBe(expectedKey);
    });

    it('should return null when no key stored', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await secureStorageService.getStoredPublicKey();

      expect(result).toBeNull();
    });
  });

  describe('getStoredAuthMethod', () => {
    it('should return biometric auth method', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('biometric');

      const result = await secureStorageService.getStoredAuthMethod();

      expect(result).toBe('biometric');
    });

    it('should return password auth method', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('password');

      const result = await secureStorageService.getStoredAuthMethod();

      expect(result).toBe('password');
    });

    it('should return null when no method stored', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await secureStorageService.getStoredAuthMethod();

      expect(result).toBeNull();
    });
  });

  describe('Storage Keys', () => {
    it('should export correct storage keys', () => {
      expect(secureStorageService.STORAGE_KEYS).toEqual({
        PRIVATE_KEY_BIO: 'stealf_pk_bio',
        PRIVATE_KEY_PWD: 'stealf_pk_pwd',
        PASSWORD_HASH: 'stealf_pwd_hash',
        SALT: 'stealf_salt',
        PUBLIC_KEY: 'stealf_public_key',
        AUTH_METHOD: 'stealf_auth_method',
        WALLET_INITIALIZED: 'stealf_wallet_initialized',
      });
    });
  });
});
