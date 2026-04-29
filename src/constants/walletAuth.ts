/** Cached MWA auth token (Seed Vault session token, rotated on reauthorize). */
export const MWA_AUTH_TOKEN_KEY = 'mwa_auth_token';
/** Base58 Solana address of the connected MWA wallet. */
export const MWA_WALLET_ADDRESS_KEY = 'mwa_wallet_address';

/**
 * How the user's stealth wallet is materialised, written to SecureStore at
 * setup time. Drives signing routing in useSendTransaction / useYieldDeposit
 * / Umbra. Two values:
 *   - 'mwa'   → stealf_wallet IS the Seeker Seed Vault address; signing
 *               opens an MWA session.
 *   - 'local' → stealf_wallet is a BIP39-derived keypair stored in
 *               SecureStore via walletKeyCache; signing happens in-process.
 * If unset (legacy users / fresh installs), default to 'local' since that's
 * what the codebase has always done.
 */
export const STEALF_WALLET_TYPE_KEY = 'stealf_wallet_type';
export type StealfWalletType = 'mwa' | 'local';
