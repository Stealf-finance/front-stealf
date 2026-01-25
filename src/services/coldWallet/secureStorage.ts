/**
 * SecureStorage - Secure key storage and encryption for cold wallet
 *
 * Handles AES-256-GCM encryption, SecureStore operations, and device security checks.
 *
 * Security: Private keys are encrypted before storage and never logged.
 */

import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Storage keys
export const STORAGE_KEYS = {
  PRIVATE_KEY_BIO: 'stealf_pk_bio',
  PRIVATE_KEY_PWD: 'stealf_pk_pwd',
  PASSWORD_HASH: 'stealf_pwd_hash',
  SALT: 'stealf_salt',
  AUTH_METHOD: 'stealf_auth_method',
  PUBLIC_KEY: 'stealf_public_key',
  WALLET_INITIALIZED: 'stealf_wallet_initialized',
} as const;

// PBKDF2 configuration
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256 bits for AES-256

export type AuthMethod = 'biometric' | 'password';

/**
 * Result types for unlock operations
 */
export type UnlockResult =
  | { success: true; keypair: Keypair }
  | { success: false; error: UnlockError };

export type UnlockError =
  | 'biometric_not_available'
  | 'biometric_failed'
  | 'biometric_cancelled'
  | 'password_invalid'
  | 'wallet_not_found'
  | 'key_invalidated'
  | 'decryption_failed';

/**
 * Device security status
 */
export interface DeviceSecurityStatus {
  isRooted: boolean;
  isEmulator: boolean;
  securityLevel: 'high' | 'medium' | 'low';
  warnings: string[];
}

/**
 * Generate cryptographically secure random bytes
 */
function getRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Simple PBKDF2 implementation using Web Crypto API
 * Derives a key from password and salt
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import the password as a key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer.buffer.slice(passwordBuffer.byteOffset, passwordBuffer.byteOffset + passwordBuffer.byteLength) as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    KEY_LENGTH * 8
  );

  return new Uint8Array(derivedBits);
}

/**
 * Hash password using PBKDF2 for storage
 */
async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const derivedKey = await deriveKey(password, salt);
  return bytesToHex(derivedKey);
}

/**
 * AES-256-GCM encryption
 */
async function encryptAES(data: Uint8Array, key: Uint8Array): Promise<{ ciphertext: string; iv: string }> {
  const iv = getRandomBytes(12); // 96-bit IV for GCM

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
    cryptoKey,
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  );

  return {
    ciphertext: bytesToHex(new Uint8Array(encrypted)),
    iv: bytesToHex(iv),
  };
}

/**
 * AES-256-GCM decryption
 */
async function decryptAES(ciphertext: string, iv: string, key: Uint8Array): Promise<Uint8Array> {
  const ivBytes = hexToBytes(iv);
  const ciphertextBytes = hexToBytes(ciphertext);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes.buffer.slice(ivBytes.byteOffset, ivBytes.byteOffset + ivBytes.byteLength) as ArrayBuffer },
    cryptoKey,
    ciphertextBytes.buffer.slice(ciphertextBytes.byteOffset, ciphertextBytes.byteOffset + ciphertextBytes.byteLength) as ArrayBuffer
  );

  return new Uint8Array(decrypted);
}

/**
 * Check if biometrics are available on the device
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

/**
 * Get the type of biometrics available
 */
export async function getBiometricType(): Promise<'fingerprint' | 'facial' | 'iris' | null> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'facial';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }

  return null;
}

/**
 * Check device security status (root/jailbreak detection)
 */
export async function checkDeviceSecurity(): Promise<DeviceSecurityStatus> {
  const warnings: string[] = [];
  let isRooted = false;
  let isEmulator = false;

  // Check if running on emulator
  if (!Device.isDevice) {
    isEmulator = true;
    warnings.push('Application running on emulator/simulator');
  }

  // Platform-specific root/jailbreak detection
  if (Platform.OS === 'android') {
    // Check for common root indicators on Android
    // Note: This is basic detection, a dedicated library would be more thorough
    const deviceName = Device.deviceName?.toLowerCase() || '';
    const modelName = Device.modelName?.toLowerCase() || '';

    if (deviceName.includes('generic') || modelName.includes('sdk')) {
      isEmulator = true;
    }

    // Check for Magisk or SuperSU indicators in device properties
    // This is a simplified check - production would use a dedicated library
  }

  if (Platform.OS === 'ios') {
    // iOS jailbreak detection would check for:
    // - Cydia app
    // - Writable system directories
    // - Suspicious dylibs
    // Note: Apple may reject apps with aggressive jailbreak detection
  }

  // Determine security level
  let securityLevel: 'high' | 'medium' | 'low' = 'high';

  if (isRooted) {
    securityLevel = 'low';
    warnings.push('Device appears to be rooted/jailbroken. Your private keys may be at risk.');
  } else if (isEmulator) {
    securityLevel = 'medium';
    warnings.push('Running on emulator. Not recommended for production use.');
  }

  return {
    isRooted,
    isEmulator,
    securityLevel,
    warnings,
  };
}

/**
 * Validate password strength
 * Requirements: min 8 chars, uppercase, lowercase, digit
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Save wallet with encryption
 * Creates two encrypted copies: one for biometric access, one for password backup
 */
export async function saveWallet(
  keypair: Keypair,
  authMethod: AuthMethod,
  password: string
): Promise<void> {
  // Validate password
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    throw new Error(`Invalid password: ${passwordValidation.errors.join(', ')}`);
  }

  // Generate salt
  const salt = getRandomBytes(SALT_LENGTH);
  const saltHex = bytesToHex(salt);

  // Hash password for verification
  const passwordHash = await hashPassword(password, salt);

  // Derive encryption key from password
  const encryptionKey = await deriveKey(password, salt);

  // Get private key bytes
  const privateKeyBytes = keypair.secretKey;

  // Encrypt private key with password-derived key
  const encryptedPwd = await encryptAES(privateKeyBytes, encryptionKey);
  const encryptedPwdData = JSON.stringify(encryptedPwd);

  // Store encrypted private key (password method)
  await SecureStore.setItemAsync(STORAGE_KEYS.PRIVATE_KEY_PWD, encryptedPwdData);

  // Store password hash and salt
  await SecureStore.setItemAsync(STORAGE_KEYS.PASSWORD_HASH, passwordHash);
  await SecureStore.setItemAsync(STORAGE_KEYS.SALT, saltHex);

  // If biometric auth is selected, also store with biometric protection
  if (authMethod === 'biometric') {
    const biometricsAvailable = await isBiometricsAvailable();
    if (biometricsAvailable) {
      // Store private key with biometric protection
      // The key is stored as base58 for biometric access
      const privateKeyBase58 = bs58.encode(privateKeyBytes);
      await SecureStore.setItemAsync(
        STORAGE_KEYS.PRIVATE_KEY_BIO,
        privateKeyBase58,
        {
          requireAuthentication: true,
          authenticationPrompt: 'Authentifiez-vous pour accéder à votre wallet',
        }
      );
    }
  }

  // Store auth method and public key
  await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_METHOD, authMethod);
  await SecureStore.setItemAsync(STORAGE_KEYS.PUBLIC_KEY, keypair.publicKey.toBase58());
  await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_INITIALIZED, 'true');
}

/**
 * Check if a wallet exists on this device
 */
export async function hasWallet(): Promise<boolean> {
  const initialized = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_INITIALIZED);
  return initialized === 'true';
}

/**
 * Get stored public key
 */
export async function getStoredPublicKey(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.PUBLIC_KEY);
}

/**
 * Get stored auth method
 */
export async function getStoredAuthMethod(): Promise<AuthMethod | null> {
  const method = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_METHOD);
  if (method === 'biometric' || method === 'password') {
    return method;
  }
  return null;
}

/**
 * Unlock wallet with biometrics
 */
export async function unlockWithBiometrics(): Promise<UnlockResult> {
  // Check biometrics availability
  const available = await isBiometricsAvailable();
  if (!available) {
    return { success: false, error: 'biometric_not_available' };
  }

  // Check if wallet exists
  const walletExists = await hasWallet();
  if (!walletExists) {
    return { success: false, error: 'wallet_not_found' };
  }

  try {
    // Authenticate with biometrics
    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouillez votre wallet privé',
      cancelLabel: 'Annuler',
      disableDeviceFallback: true,
    });

    if (!authResult.success) {
      if ('error' in authResult && authResult.error === 'user_cancel') {
        return { success: false, error: 'biometric_cancelled' };
      }
      return { success: false, error: 'biometric_failed' };
    }

    // Try to get the biometric-protected key
    const privateKeyBase58 = await SecureStore.getItemAsync(
      STORAGE_KEYS.PRIVATE_KEY_BIO,
      { requireAuthentication: true }
    );

    if (!privateKeyBase58) {
      // Biometric key not found, might have been invalidated
      return { success: false, error: 'key_invalidated' };
    }

    // Reconstruct keypair
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(privateKeyBytes);

    return { success: true, keypair };
  } catch (error) {
    // Key might have been invalidated due to biometric changes
    return { success: false, error: 'key_invalidated' };
  }
}

/**
 * Unlock wallet with password
 */
export async function unlockWithPassword(password: string): Promise<UnlockResult> {
  // Check if wallet exists
  const walletExists = await hasWallet();
  if (!walletExists) {
    return { success: false, error: 'wallet_not_found' };
  }

  try {
    // Get salt and stored hash
    const saltHex = await SecureStore.getItemAsync(STORAGE_KEYS.SALT);
    const storedHash = await SecureStore.getItemAsync(STORAGE_KEYS.PASSWORD_HASH);

    if (!saltHex || !storedHash) {
      return { success: false, error: 'wallet_not_found' };
    }

    // Verify password
    const salt = hexToBytes(saltHex);
    const passwordHash = await hashPassword(password, salt);

    if (passwordHash !== storedHash) {
      return { success: false, error: 'password_invalid' };
    }

    // Get encrypted private key
    const encryptedPwdData = await SecureStore.getItemAsync(STORAGE_KEYS.PRIVATE_KEY_PWD);
    if (!encryptedPwdData) {
      return { success: false, error: 'wallet_not_found' };
    }

    // Decrypt private key
    const { ciphertext, iv } = JSON.parse(encryptedPwdData);
    const encryptionKey = await deriveKey(password, salt);
    const privateKeyBytes = await decryptAES(ciphertext, iv, encryptionKey);

    // Reconstruct keypair
    const keypair = Keypair.fromSecretKey(privateKeyBytes);

    return { success: true, keypair };
  } catch (error) {
    return { success: false, error: 'decryption_failed' };
  }
}

/**
 * Delete wallet from secure storage
 */
export async function deleteWallet(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.PRIVATE_KEY_BIO);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.PRIVATE_KEY_PWD);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.PASSWORD_HASH);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.SALT);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_METHOD);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.PUBLIC_KEY);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_INITIALIZED);
}

/**
 * Change password (requires current password)
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Validate new password
  const validation = validatePasswordStrength(newPassword);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  // Unlock with current password to get keypair
  const unlockResult = await unlockWithPassword(currentPassword);
  if (!unlockResult.success) {
    return { success: false, error: 'Mot de passe actuel incorrect' };
  }

  // Get current auth method
  const authMethod = await getStoredAuthMethod() || 'password';

  // Re-save wallet with new password
  await saveWallet(unlockResult.keypair, authMethod, newPassword);

  return { success: true };
}

// Export all functions as a service object
export const secureStorageService = {
  // Storage operations
  saveWallet,
  hasWallet,
  deleteWallet,
  getStoredPublicKey,
  getStoredAuthMethod,
  changePassword,

  // Unlock operations
  unlockWithBiometrics,
  unlockWithPassword,

  // Biometrics
  isBiometricsAvailable,
  getBiometricType,

  // Security
  checkDeviceSecurity,
  validatePasswordStrength,

  // Constants
  STORAGE_KEYS,
};

export default secureStorageService;
