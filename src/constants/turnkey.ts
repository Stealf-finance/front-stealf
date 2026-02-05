import type {
  TurnkeyProviderConfig,
  TurnkeyCallbacks,
} from "@turnkey/react-native-wallet-kit";

export const TURNKEY_CONFIG: TurnkeyProviderConfig = {
  organizationId: process.env.EXPO_PUBLIC_ORGANIZATION_ID!,
  authProxyConfigId: process.env.EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID!,
  passkeyConfig: {
    rpId: "stealf.xyz",
    rpName: "Stealf",
  },
  auth: {
    passkey: true,
    autoRefreshSession: true,
  }
};

export const CASH_WALLET_CONFIG = {
  walletName: "Cash Wallet",
  walletAccounts: [
    {
      curve: "CURVE_ED25519" as const,
      pathFormat: 'PATH_FORMAT_BIP32' as const,
      path: "m/44'/501'/0'/0'",
      addressFormat: "ADDRESS_FORMAT_SOLANA" as const,
    },
  ],
};

export const TURNKEY_CALLBACKS: TurnkeyCallbacks = {
  beforeSessionExpiry: () => {
    if (__DEV__) console.log("[Turnkey] Session nearing expiry");
    // Handle session refresh if needed
  },
  onSessionExpired: () => {
    if (__DEV__) console.log("[Turnkey] Session expired");
    // Handle re-authentication if needed
  },
  onAuthenticationSuccess: ({ action, method }) => {
    if (__DEV__) console.log("[Turnkey] Auth success:", { action, method });
  },
  onError: (error) => {
    if (__DEV__) console.error("[Turnkey] Error:", error);
  },
};