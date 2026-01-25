/**
 * ColdWalletService - Local cold wallet cryptographic operations
 *
 * This service handles mnemonic generation, validation, and keypair derivation
 * for the non-custodial private wallet.
 *
 * Security: Private keys and mnemonics are never logged or transmitted.
 */

// Ensure crypto polyfill is loaded before bip39
import 'react-native-get-random-values';

import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';

// BIP44 derivation path for Solana
const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";

/**
 * Mnemonic strength options
 * 128 bits = 12 words
 * 256 bits = 24 words
 */
export type MnemonicStrength = 128 | 256;

/**
 * Result of mnemonic generation
 */
export interface GenerateMnemonicResult {
  mnemonic: string;
  wordCount: 12 | 24;
}

/**
 * Result of keypair derivation
 */
export interface DeriveKeypairResult {
  keypair: Keypair;
  publicKey: string;
}

/**
 * Generate a new BIP39 mnemonic with cryptographically secure entropy
 *
 * @param strength - 128 for 12 words, 256 for 24 words (default: 128)
 * @returns Generated mnemonic and word count
 */
export function generateMnemonic(strength: MnemonicStrength = 128): GenerateMnemonicResult {
  // bip39.generateMnemonic uses crypto.getRandomValues internally
  // which is polyfilled by react-native-get-random-values
  const mnemonic = bip39.generateMnemonic(strength);
  const wordCount = strength === 128 ? 12 : 24;

  return {
    mnemonic,
    wordCount,
  };
}

/**
 * Validate a BIP39 mnemonic
 * Checks word list membership and checksum validity
 *
 * @param mnemonic - The mnemonic to validate
 * @returns true if valid, false otherwise
 */
export function validateMnemonic(mnemonic: string): boolean {
  if (!mnemonic || typeof mnemonic !== 'string') {
    return false;
  }

  // Normalize whitespace and convert to lowercase
  const normalizedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');

  return bip39.validateMnemonic(normalizedMnemonic);
}

/**
 * Get the word list for BIP39 mnemonics (English)
 * Useful for autocomplete during seed phrase entry
 *
 * @returns Array of 2048 BIP39 words
 */
export function getWordList(): string[] {
  return bip39.wordlists.english;
}

/**
 * Check if a word is a valid BIP39 word
 *
 * @param word - The word to check
 * @returns true if the word is in the BIP39 English wordlist
 */
export function isValidWord(word: string): boolean {
  if (!word || typeof word !== 'string') {
    return false;
  }
  return bip39.wordlists.english.includes(word.toLowerCase().trim());
}

/**
 * Get words from the BIP39 wordlist that start with a given prefix
 * Useful for autocomplete during seed phrase entry
 *
 * @param prefix - The prefix to search for
 * @param limit - Maximum number of suggestions (default: 5)
 * @returns Array of matching words
 */
export function getWordSuggestions(prefix: string, limit: number = 5): string[] {
  if (!prefix || typeof prefix !== 'string') {
    return [];
  }

  const normalizedPrefix = prefix.toLowerCase().trim();
  if (normalizedPrefix.length === 0) {
    return [];
  }

  return bip39.wordlists.english
    .filter(word => word.startsWith(normalizedPrefix))
    .slice(0, limit);
}

/**
 * Derive a Solana keypair from a BIP39 mnemonic using BIP44 derivation
 * Uses the standard Solana derivation path: m/44'/501'/0'/0'
 *
 * @param mnemonic - Valid BIP39 mnemonic
 * @param path - Derivation path (default: Solana standard path)
 * @returns Keypair and public key address
 * @throws Error if mnemonic is invalid
 */
export async function deriveKeypair(
  mnemonic: string,
  path: string = SOLANA_DERIVATION_PATH
): Promise<DeriveKeypairResult> {
  // Validate mnemonic first
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic: checksum or word list validation failed');
  }

  // Normalize the mnemonic
  const normalizedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');

  // Convert mnemonic to seed (512 bits)
  const seed = await bip39.mnemonicToSeed(normalizedMnemonic);

  // Derive the key using BIP44 path
  const derivedSeed = derivePath(path, Buffer.from(seed).toString('hex'));

  // Create Solana keypair from the derived seed (first 32 bytes)
  // Convert Buffer to Uint8Array for compatibility
  const seedBytes = new Uint8Array(derivedSeed.key);
  const keypair = Keypair.fromSeed(seedBytes);

  return {
    keypair,
    publicKey: keypair.publicKey.toBase58(),
  };
}

/**
 * Verify seed phrase words for user confirmation
 * Selects random word positions and validates user input
 *
 * @param mnemonic - The original mnemonic
 * @param wordCount - Number of words to verify (default: 3)
 * @returns Object with indices and expected words
 */
export function selectVerificationWords(
  mnemonic: string,
  wordCount: number = 3
): { indices: number[]; expectedWords: string[] } {
  const words = mnemonic.trim().split(/\s+/);
  const totalWords = words.length;

  if (wordCount > totalWords) {
    throw new Error(`Cannot select ${wordCount} words from a ${totalWords} word mnemonic`);
  }

  // Select random unique indices
  const indices: number[] = [];
  while (indices.length < wordCount) {
    const randomIndex = Math.floor(Math.random() * totalWords);
    if (!indices.includes(randomIndex)) {
      indices.push(randomIndex);
    }
  }

  // Sort indices for consistent display order
  indices.sort((a, b) => a - b);

  return {
    indices,
    expectedWords: indices.map(i => words[i]),
  };
}

/**
 * Verify user-provided words against expected words
 *
 * @param providedWords - Words provided by the user
 * @param expectedWords - Expected words from the mnemonic
 * @returns Object indicating success and any incorrect positions
 */
export function verifyWords(
  providedWords: string[],
  expectedWords: string[]
): { valid: boolean; incorrectIndices: number[] } {
  if (providedWords.length !== expectedWords.length) {
    return {
      valid: false,
      incorrectIndices: Array.from({ length: expectedWords.length }, (_, i) => i),
    };
  }

  const incorrectIndices: number[] = [];

  providedWords.forEach((word, index) => {
    const normalizedProvided = word.toLowerCase().trim();
    const normalizedExpected = expectedWords[index].toLowerCase().trim();

    if (normalizedProvided !== normalizedExpected) {
      incorrectIndices.push(index);
    }
  });

  return {
    valid: incorrectIndices.length === 0,
    incorrectIndices,
  };
}

// Export all functions as a service object for convenience
export const coldWalletService = {
  generateMnemonic,
  validateMnemonic,
  deriveKeypair,
  getWordList,
  isValidWord,
  getWordSuggestions,
  selectVerificationWords,
  verifyWords,
  SOLANA_DERIVATION_PATH,
};

// Re-export from other modules
export * from './secureStorage';
export * from './signer';

export default coldWalletService;
