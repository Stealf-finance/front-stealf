import { PublicKey } from '@solana/web3.js';
import * as bip39 from 'bip39';

const ESTIMATED_FEE_SOL = 0.000005; // ~5000 lamports
const RENT_EXEMPT_MIN_SOL = 0.00089; // minimum rent-exempt balance for account

export interface GuardResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a Solana address (base58, length, valid PublicKey)
 */
export function validateAddress(address: string): GuardResult {
  if (!address || address.trim() === '') {
    return { valid: false, error: 'Please enter a recipient address' };
  }

  const trimmed = address.trim();

  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed)) {
    return { valid: false, error: 'Invalid Solana address' };
  }

  if (trimmed.length < 32 || trimmed.length > 44) {
    return { valid: false, error: 'Invalid Solana address' };
  }

  try {
    new PublicKey(trimmed);
  } catch {
    return { valid: false, error: 'Invalid Solana address' };
  }

  return { valid: true };
}

/**
 * Validates a transaction amount (format, decimals, min value)
 */
export function validateAmount(
  amount: string,
  maxDecimals: number = 9
): GuardResult {
  if (!amount || amount.trim() === '') {
    return { valid: false, error: 'Please enter an amount' };
  }

  const num = parseFloat(amount);

  if (isNaN(num)) {
    return { valid: false, error: 'Invalid amount format' };
  }

  if (num <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  // Check decimal places
  const parts = amount.split('.');
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    return { valid: false, error: `Maximum ${maxDecimals} decimal places allowed` };
  }

  return { valid: true };
}

/**
 * Checks if the wallet has enough balance for amount + estimated fees
 */
export function validateBalance(
  amountSOL: number,
  balanceSOL: number
): GuardResult {
  if (balanceSOL <= 0) {
    return { valid: false, error: 'Insufficient balance' };
  }

  const totalNeeded = amountSOL + ESTIMATED_FEE_SOL;

  if (totalNeeded > balanceSOL) {
    const maxSendable = Math.max(0, balanceSOL - ESTIMATED_FEE_SOL);
    return {
      valid: false,
      error: `Insufficient balance. Max sendable: ${maxSendable.toFixed(6)} SOL (fees: ~${ESTIMATED_FEE_SOL} SOL)`,
    };
  }

  // Warn if remaining balance would be below rent-exempt minimum
  const remaining = balanceSOL - totalNeeded;
  if (remaining > 0 && remaining < RENT_EXEMPT_MIN_SOL) {
    return {
      valid: false,
      error: `This would leave ${remaining.toFixed(6)} SOL which is below the rent-exempt minimum (${RENT_EXEMPT_MIN_SOL} SOL). Send all or reduce amount.`,
    };
  }

  return { valid: true };
}

/**
 * Checks that sender is not sending to themselves
 */
export function validateNotSelf(from: string, to: string): GuardResult {
  if (from.trim() === to.trim()) {
    return { valid: false, error: 'Cannot send to yourself' };
  }
  return { valid: true };
}

/**
 * Validates a mnemonic seed phrase using BIP39 standard
 * Checks word count, wordlist validity, and checksum
 */
export function validateMnemonic(mnemonic: string): GuardResult {
  if (!mnemonic || mnemonic.trim() === '') {
    return { valid: false, error: 'Please enter your seed phrase' };
  }

  const normalizedMnemonic = mnemonic.trim().toLowerCase();
  const words = normalizedMnemonic.split(/\s+/);

  if (words.length !== 12 && words.length !== 24) {
    return { valid: false, error: 'Seed phrase must be 12 or 24 words' };
  }

  // Use BIP39 validation (checks wordlist + checksum)
  if (!bip39.validateMnemonic(normalizedMnemonic)) {
    return { valid: false, error: 'Invalid seed phrase. Please check for typos.' };
  }

  return { valid: true };
}

/**
 * Full pre-check before sending a SOL transaction.
 * Returns the first error found, or { valid: true } if all checks pass.
 */
export function guardTransaction(params: {
  fromAddress: string;
  toAddress: string;
  amount: string;
  amountSOL: number;
}): GuardResult {
  const { fromAddress, toAddress, amount, amountSOL } = params;

  const addressCheck = validateAddress(toAddress);
  if (!addressCheck.valid) return addressCheck;

  const selfCheck = validateNotSelf(fromAddress, toAddress);
  if (!selfCheck.valid) return selfCheck;

  const amountCheck = validateAmount(amount);
  if (!amountCheck.valid) return amountCheck;

  return { valid: true };
}