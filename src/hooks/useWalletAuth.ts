import { useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import { useAuth as useAuthContext } from "../contexts/AuthContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/** SecureStore key for the seeker wallet private key (bs58-encoded 64-byte secretKey) */
const SEEKER_KEY_STORE_KEY = "stealf_private_key";

// SecureStore keys for session persistence
const AUTH_METHOD_KEY = "auth_method";
const WALLET_SESSION_TOKEN_KEY = "wallet_session_token";

interface ConnectWalletResult {
  success: boolean;
  address?: string; // base58
  publicKeyHex?: string;
  authToken?: string;
  label?: string;
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

/**
 * Hook that orchestrates signup and signin flows using the local cold wallet
 * stored in SecureStore. No MWA / Seed Vault required — works on any Android device.
 */
export function useWalletAuth() {
  const { setUserData } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  /**
   * Authenticate with biometrics then derive the seeker public key from SecureStore.
   * Returns address (base58), publicKeyHex (hex), and authToken ('local').
   */
  const connectWallet = useCallback(async (): Promise<ConnectWalletResult> => {
    setLoading(true);
    setError(null);

    try {
      // Biometric check before key access
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (hasHardware) {
        const biometricResult = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to connect your wallet",
          fallbackLabel: "Use passcode",
          disableDeviceFallback: false,
        });

        if (!biometricResult.success) {
          setLoading(false);
          return { success: false, error: "Authentication required" };
        }
      }

      // Read seeker private key from SecureStore
      const stored = await SecureStore.getItemAsync(SEEKER_KEY_STORE_KEY);
      if (!stored) {
        setLoading(false);
        return {
          success: false,
          error: "Wallet not set up. Please create or restore your wallet first.",
        };
      }

      const secretKey = bs58.decode(stored);
      const keypair = Keypair.fromSecretKey(secretKey);
      const addressBase58 = keypair.publicKey.toBase58();
      const publicKeyHex = Buffer.from(keypair.publicKey.toBytes()).toString("hex");

      setWalletConnected(true);
      setConnectedAddress(addressBase58);
      setLoading(false);

      return {
        success: true,
        address: addressBase58,
        publicKeyHex,
        authToken: "local",
      };
    } catch (err: any) {
      __DEV__ && console.error("[useWalletAuth] connectWallet error:", err);
      const errorMsg = err?.message || "Failed to connect wallet";
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, []);

  /**
   * Sign up a new user using the connected seeker wallet.
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
        const pseudo = params.label || params.walletAddress.slice(0, 8);
        const email = `${params.walletAddress.slice(0, 8)}@wallet.stealf.xyz`;

        __DEV__ && console.log("[useWalletAuth] signUpWithWallet called with:", {
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

        __DEV__ && console.log("[useWalletAuth] wallet-signup response status:", response.status);
        const data = await response.json();
        __DEV__ && console.log("[useWalletAuth] wallet-signup response data:", JSON.stringify(data));

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

        await SecureStore.setItemAsync(AUTH_METHOD_KEY, "wallet");
        if (sessionToken) {
          await SecureStore.setItemAsync(WALLET_SESSION_TOKEN_KEY, sessionToken);
        }

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
        __DEV__ && console.error("[useWalletAuth] signUpWithWallet error:", err);
        const errorMsg = err?.message || "Failed to sign up with wallet";
        setError(errorMsg);
        setLoading(false);
        return { success: false, error: errorMsg };
      }
    },
    [setUserData]
  );

  /**
   * Sign in an existing user with their seeker wallet.
   * Derives public key locally, sends publicKeyHex to backend for lookup.
   */
  const signInWithWallet = useCallback(async (): Promise<SignInResult> => {
    setLoading(true);
    setError(null);

    try {
      const connectResult = await connectWallet();

      if (!connectResult.success) {
        setLoading(false);
        return { success: false, error: connectResult.error };
      }

      // Re-enable loading for backend call (connectWallet sets it to false)
      setLoading(true);

      __DEV__ && console.log("[useWalletAuth] Calling wallet-login with publicKeyHex:", connectResult.publicKeyHex);
      const response = await fetch(`${API_URL}/api/users/wallet-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKeyHex: connectResult.publicKeyHex }),
      });

      __DEV__ && console.log("[useWalletAuth] wallet-login response status:", response.status);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setLoading(false);
          return { success: false, notFound: true, error: "No account found for this wallet" };
        }
        throw new Error(data.error || "Login failed");
      }

      if (!data.data?.user) {
        throw new Error("Backend did not return user data");
      }

      const user = data.data.user;
      const sessionToken = data.data.token;

      await SecureStore.setItemAsync(AUTH_METHOD_KEY, "wallet");
      if (sessionToken) {
        await SecureStore.setItemAsync(WALLET_SESSION_TOKEN_KEY, sessionToken);
      }

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
      __DEV__ && console.error("[useWalletAuth] signInWithWallet error:", err);
      const errorMsg = err?.message || "Failed to sign in with wallet";
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [connectWallet, setUserData]);

  return {
    loading,
    error,
    walletConnected,
    connectedAddress,
    connectWallet,
    signUpWithWallet,
    signInWithWallet,
  };
}
