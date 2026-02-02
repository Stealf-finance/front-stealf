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

export const WALLET_CONFIG = {
  walletName: "STEALF wallets",
  walletAccounts: [
    {
      curve: "CURVE_ED25519" as const,
      pathFormat: 'PATH_FORMAT_BIP32' as const,
      path: "m/44'/501'/0'/0'",
      addressFormat: "ADDRESS_FORMAT_SOLANA" as const,
    }
  ],
};

export const TURNKEY_CALLBACKS: TurnkeyCallbacks = {
  beforeSessionExpiry: ({ sessionKey }) => {
    console.log("[Turnkey] Session nearing expiry:", sessionKey);
  },
  onSessionExpired: ({ sessionKey }) => {
    console.log("[Turnkey] Session expired:", sessionKey);
  },
  onAuthenticationSuccess: ({ action, method, identifier }) => {
    console.log("[Turnkey] Auth success:", { action, method, identifier });
  },
  onError: (error) => {
    console.error("[Turnkey] Error:", error);
  },
};