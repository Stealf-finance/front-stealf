import * as SecureStore from 'expo-secure-store';
import { WALLET_SESSION_TOKEN_KEY } from '../../constants/walletAuth';
import type {
  TurnkeySignTransactionFn,
  TurnkeySignMessageFn,
} from './turnkeySigner';

/**
 * Backend-relayed cash-wallet signing for Seeker (wallet-auth) users.
 *
 * Mirrors the shape of `TurnkeySignTransactionFn` / `TurnkeySignMessageFn`
 * exported by the Turnkey React Native SDK so we can plug them straight into
 * `createTurnkeyUmbraSigner` without duplicating the Umbra signer logic.
 *
 * The backend (POST /api/sign/cash-transaction, /api/sign/cash-message) signs
 * with the platform Turnkey credentials on behalf of the authenticated user.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function authorizedPost<T>(path: string, body: unknown): Promise<T> {
  const token = await SecureStore.getItemAsync(WALLET_SESSION_TOKEN_KEY);
  if (!token) throw new Error('Wallet session token missing');

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || !json?.success) {
    const message = json?.error || `Backend signing failed (${res.status})`;
    throw new Error(message);
  }
  return json.data as T;
}

export const backendSignCashTransaction: TurnkeySignTransactionFn = async ({
  unsignedTransaction,
}) => {
  const { signedTransactionHex } = await authorizedPost<{ signedTransactionHex: string }>(
    '/api/sign/cash-transaction',
    { unsignedTransactionHex: unsignedTransaction },
  );
  return signedTransactionHex;
};

export const backendSignCashMessage: TurnkeySignMessageFn = async ({ message }) => {
  // We always pass hex to the backend regardless of the encoding parameter
  // — the existing Umbra Turnkey signer always hex-encodes before calling
  // signMessage, and we mirror that contract.
  const { r, s } = await authorizedPost<{ r: string; s: string }>(
    '/api/sign/cash-message',
    { messageHex: message },
  );
  return { r, s, v: '00' };
};
