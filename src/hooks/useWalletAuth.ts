import { useState, useCallback } from "react";
import { transact, Web3MobileWallet } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import bs58 from "bs58";
import { useAuth as useAuthContext } from "../contexts/AuthContext";
import { useSession } from "../contexts/SessionContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const STEALF_IDENTITY = {
  name: "Stealf",
  uri: "https://stealf.xyz" as `${string}://${string}`,
  icon: "favicon.ico" as const,
};

const SOLANA_CHAIN = "solana:devnet" as const;

// SecureStore keys for wallet auth
const MWA_AUTH_TOKEN_KEY = "mwa_auth_token";
const MWA_WALLET_ADDRESS_KEY = "mwa_wallet_address";
const AUTH_METHOD_KEY = "auth_method";
const WALLET_SESSION_TOKEN_KEY = "wallet_session_token";

interface ConnectWalletResult {
  success: boolean;
  address?: string; // base58
  publicKeyHex?: string;
  authToken?: string;
  label?: string; // wallet display name (e.g. "stealf.skr")
  error?: string;
}

interface SignUpResult {
  success: boolean;
  error?: string;
}

interface SignInResult {
  success: boolean;
  error?: string;
  notFound?: boolean;
}

interface WalletAuthState {
  loading: boolean;
  error: string | null;
  walletConnected: boolean;
  connectedAddress: string | null;
}

/**
 * Hook that orchestrates signup and signin flows using the Seeker Seed Vault
 * via Mobile Wallet Adapter.
 */
export function useWalletAuth() {
  const { setUserData } = useAuthContext();
  const { setMWAInProgress } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  /**
   * Task 5.1: Connect to the Seed Vault via MWA.
   * Opens a transact() session, authorizes, extracts address and auth_token.
   */
  const connectWallet = useCallback(async (): Promise<ConnectWalletResult> => {
    setLoading(true);
    setError(null);

    try {
      // Set MWA flag BEFORE biometric to prevent lock screen from interfering
      setMWAInProgress(true);

      // Biometric check before wallet connection
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (hasHardware) {
        const biometricResult = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to connect your wallet",
          fallbackLabel: "Use passcode",
          disableDeviceFallback: false,
        });

        if (!biometricResult.success) {
          setMWAInProgress(false);
          setLoading(false);
          return { success: false, error: "Authentication required" };
        }
      }

      // Small delay to let Seed Vault initialize
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check for existing auth token to try reauthorize first
      const existingAuthToken = await SecureStore.getItemAsync(MWA_AUTH_TOKEN_KEY);

      console.log("[useWalletAuth] Starting transact()...", existingAuthToken ? "(reauthorize)" : "(authorize)");
      let result;
      try {
        result = await transact(async (wallet: Web3MobileWallet) => {
          let auth;

          if (existingAuthToken) {
            try {
              console.log("[useWalletAuth] Trying reauthorize...");
              auth = await wallet.reauthorize({
                auth_token: existingAuthToken,
                identity: STEALF_IDENTITY,
              });
            } catch (reAuthErr) {
              console.log("[useWalletAuth] Reauthorize failed, falling back to authorize");
              auth = await wallet.authorize({
                chain: SOLANA_CHAIN,
                identity: STEALF_IDENTITY,
              });
            }
          } else {
            console.log("[useWalletAuth] Calling authorize...");
            auth = await wallet.authorize({
              chain: SOLANA_CHAIN,
              identity: STEALF_IDENTITY,
            });
          }

          console.log("[useWalletAuth] Auth success, accounts:", auth.accounts?.length);

          return {
            addressBase64: auth.accounts[0].address,
            label: auth.accounts[0].label || "",
            authToken: auth.auth_token,
          };
        });
      } finally {
        setMWAInProgress(false);
      }

      // Convert base64 address to base58 (Solana standard format)
      const addressBytes = Buffer.from(result.addressBase64, "base64");
      const addressBase58 = bs58.encode(addressBytes);
      const publicKeyHex = addressBytes.toString("hex");

      // Store auth_token and address in SecureStore
      await SecureStore.setItemAsync(MWA_AUTH_TOKEN_KEY, result.authToken);
      await SecureStore.setItemAsync(MWA_WALLET_ADDRESS_KEY, addressBase58);

      setWalletConnected(true);
      setConnectedAddress(addressBase58);
      setLoading(false);

      return {
        success: true,
        address: addressBase58,
        publicKeyHex,
        authToken: result.authToken,
        label: result.label,
      };
    } catch (err: any) {
      console.error("[useWalletAuth] connectWallet error:", err);
      const errorMsg = err?.message || "Failed to connect wallet";
      setMWAInProgress(false);
      setLoading(false);

      // Check if user cancelled the authorization
      const isCancelled =
        errorMsg.includes("cancel") ||
        errorMsg.includes("declined") ||
        errorMsg.includes("rejected");

      if (isCancelled) {
        console.log("[useWalletAuth] User cancelled authorization");
        return { success: false };
      }

      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  /**
   * Task 5.2: Sign up a new user using the connected Seeker wallet.
   * Sends publicKeyHex to backend which creates a Turnkey sub-org + Cash Wallet.
   */
  const signUpWithWallet = useCallback(
    async (params: {
      publicKeyHex: string;
      walletAddress: string;
      authToken: string;
      label?: string;
    }): Promise<SignUpResult> => {
      setLoading(true);
      setError(null);

      try {
        // Use wallet label as pseudo, generate placeholder email from address
        const pseudo = params.label || params.walletAddress.slice(0, 8);
        const email = `${params.walletAddress.slice(0, 8)}@wallet.stealf.xyz`;

        console.log("[useWalletAuth] signUpWithWallet called with:", {
          pseudo,
          email,
          publicKeyHex: params.publicKeyHex,
        });
        const response = await fetch(`${API_URL}/api/users/wallet-signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            pseudo,
            publicKeyHex: params.publicKeyHex,
          }),
        });

        console.log("[useWalletAuth] wallet-signup response status:", response.status);
        const data = await response.json();
        console.log("[useWalletAuth] wallet-signup response data:", JSON.stringify(data));

        if (!response.ok) {
          if (response.status === 409) {
            setError(data.error || "Email already registered");
            return {
              success: false,
              error: data.error || "Email already registered. Sign in instead?",
            };
          }
          throw new Error(data.error || "Signup failed");
        }

        if (!data.data?.user) {
          throw new Error("Backend did not return user data");
        }

        const user = data.data.user;
        const sessionToken = data.data.token;

        // Store auth method and session token in SecureStore
        await SecureStore.setItemAsync(AUTH_METHOD_KEY, "wallet");
        if (sessionToken) {
          await SecureStore.setItemAsync(WALLET_SESSION_TOKEN_KEY, sessionToken);
        }

        // Update AuthContext with user data and wallet auth method
        setUserData({
          email: user.email,
          username: user.pseudo,
          cash_wallet: user.cash_wallet || data.data.cashWallet,
          stealf_wallet: user.stealf_wallet || params.walletAddress,
          subOrgId: data.data.subOrgId,
          authMethod: "wallet",
        });

        setLoading(false);
        return { success: true };
      } catch (err: any) {
        console.error("[useWalletAuth] signUpWithWallet error:", err);
        const errorMsg = err?.message || "Failed to sign up with wallet";
        setError(errorMsg);
        setLoading(false);
        return { success: false, error: errorMsg };
      }
    },
    [setUserData]
  );

  /**
   * Task 5.3: Sign in an existing user with their Seeker wallet.
   * Connects wallet, sends publicKeyHex to backend for lookup.
   */
  const signInWithWallet = useCallback(async (): Promise<SignInResult> => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Connect wallet (authorize via Seed Vault, includes biometric)
      const connectResult = await connectWallet();

      if (!connectResult.success) {
        setLoading(false);
        return {
          success: false,
          error: connectResult.error,
        };
      }

      // Step 2: Send publicKeyHex to backend for user lookup
      console.log("[useWalletAuth] Calling wallet-login with publicKeyHex:", connectResult.publicKeyHex);
      console.log("[useWalletAuth] API_URL:", API_URL);
      const response = await fetch(`${API_URL}/api/users/wallet-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKeyHex: connectResult.publicKeyHex,
        }),
      });

      console.log("[useWalletAuth] wallet-login response status:", response.status);
      const data = await response.json();
      console.log("[useWalletAuth] wallet-login response data:", JSON.stringify(data));

      if (!response.ok) {
        if (response.status === 404) {
          setLoading(false);
          return {
            success: false,
            notFound: true,
            error: "No account found for this wallet",
          };
        }
        throw new Error(data.error || "Login failed");
      }

      if (!data.data?.user) {
        throw new Error("Backend did not return user data");
      }

      const user = data.data.user;
      const sessionToken = data.data.token;

      // Store auth method and session token in SecureStore
      await SecureStore.setItemAsync(AUTH_METHOD_KEY, "wallet");
      if (sessionToken) {
        await SecureStore.setItemAsync(WALLET_SESSION_TOKEN_KEY, sessionToken);
      }

      // Update AuthContext
      setUserData({
        email: user.email,
        username: user.pseudo,
        cash_wallet: user.cash_wallet,
        stealf_wallet: user.stealf_wallet,
        subOrgId: user.turnkey_subOrgId,
        authMethod: "wallet",
      });

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error("[useWalletAuth] signInWithWallet error:", err);
      const errorMsg = err?.message || "Failed to sign in with wallet";
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [connectWallet, setUserData]);

  return {
    // State
    loading,
    error,
    walletConnected,
    connectedAddress,

    // Actions
    connectWallet,
    signUpWithWallet,
    signInWithWallet,
  };
}
