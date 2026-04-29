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

/**
 * When the user starts sign-up via the "Sign Up with Seeker Wallet" button,
 * we capture their MWA address before kicking off the normal passkey
 * sign-up flow. The address is stashed here and consumed by AuthContext
 * after the Turnkey session lands, to auto-register stealf_wallet without
 * surfacing the WalletSetup screen.
 *
 * `PENDING_STEALF_MWA_OWNER_KEY` holds the email + pseudo of the user who
 * initiated the flow, so we can refuse to apply this address if a
 * DIFFERENT user signs in next on the same device (defends against the
 * scenario where User A starts Seeker sign-up, never finishes, then User
 * B signs in on the same device — without scoping, A's wallet would be
 * silently registered for B).
 */
export const PENDING_STEALF_MWA_KEY = 'pending_stealf_mwa_address';
export const PENDING_STEALF_MWA_OWNER_KEY = 'pending_stealf_mwa_owner';
