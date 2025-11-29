import { useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../contexts/AuthContext';
import { authStorage } from '../../services/authStorage';
import { getGridClient } from '../../config/grid';
import solanaWalletService from '../../services/solanaWalletService';
import stealfService from '../../services/stealfService';
import { UMBRA_CONFIG } from '../../config/umbra';

// API base URL from config
const API_BASE_URL = UMBRA_CONFIG.API_URL;

export const useLogin = (onSuccess?: (userData: any, accessToken: string) => void) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(600);
  const [showLogoAnimation, setShowLogoAnimation] = useState(false);

  const gridClient = getGridClient();

  const handleSubmitEmail = async () => {
    setError('');
    setIsLoading(true);

    try {
      console.log('🔐 Authenticating user with Grid SDK:', email);

      const result = await gridClient.initAuth({ email });

      console.log('✅ Authentication initiated:', result);

      await SecureStore.setItemAsync('auth_email', email);
      await SecureStore.setItemAsync('auth_user_data', JSON.stringify(result));

      setShowOtpInput(true);
      setTimer(600);
    } catch (err: any) {
      console.error('❌ Authentication error:', err);

      let errorMessage = 'An error occurred';

      if (err.message) {
        if (err.message.toLowerCase().includes('not found') ||
            err.message.toLowerCase().includes('no account')) {
          errorMessage = 'This email is not registered. Please sign up first.';
        } else {
          errorMessage = err.message;
        }
      }

      console.log('✋ Error message shown to user:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setIsLoading(true);

    try {
      const savedEmail = await SecureStore.getItemAsync('auth_email');
      const savedUserDataStr = await SecureStore.getItemAsync('auth_user_data');

      if (!savedEmail || !savedUserDataStr) {
        setError('Session expired. Please start over.');
        setShowOtpInput(false);
        setIsLoading(false);
        return;
      }

      const savedUserData = JSON.parse(savedUserDataStr);

      console.log('✅ Generating session secrets for OTP verification...');
      const sessionSecrets = await gridClient.generateSessionSecrets();
      console.log('✅ Session secrets generated');

      console.log('🔐 Verifying OTP code with Grid SDK...');

      const verifyResult = await gridClient.completeAuth({
        otpCode: otpCode,
        user: savedUserData,
        sessionSecrets: sessionSecrets,
      });

      console.log('✅ OTP verification successful');

      // Grid SDK retourne GridResponse<CompleteAuthResponse>, extraire les données
      // La structure peut être soit verifyResult.data, soit directement verifyResult
      const gridData = verifyResult.data || verifyResult;

      // Vérifier si l'authentification a réussi
      if (!verifyResult.success || verifyResult.error) {
        console.error('❌ Authentication failed:', verifyResult.error);

        // Parser l'erreur pour donner un message clair
        let errorMessage = 'Authentication failed. Please try again.';

        if (typeof verifyResult.error === 'string') {
          try {
            const errors = JSON.parse(verifyResult.error);
            if (Array.isArray(errors) && errors[0]?.code === 'grid_account_not_found') {
              errorMessage = 'This email is not registered. Please sign up first.';
            }
          } catch (parseError) {
            // Si le parsing échoue, vérifier si l'erreur contient des mots-clés
            if (verifyResult.error.includes('not_found') || verifyResult.error.includes('No grid account')) {
              errorMessage = 'This email is not registered. Please sign up first.';
            }
          }
        }

        throw new Error(errorMessage);
      }

      if (!gridData || (!gridData.grid_user_id && !gridData.address)) {
        console.error('❌ Invalid gridData structure');
        throw new Error('No data returned from authentication');
      }

      // Grid SDK utilise les session secrets, pas de JWT token
      const dummyToken = `grid_session_${Date.now()}`;

      console.log('✅ Login successful!');

      await SecureStore.deleteItemAsync('auth_email');
      await SecureStore.deleteItemAsync('auth_user_data');

      await SecureStore.setItemAsync('session_secrets', JSON.stringify(sessionSecrets));
      console.log('✅ Session secrets saved');

      // Fetch user profile from backend to get username/profileImage
      let backendUserData: { username?: string; profileImage?: string | null } = {};
      try {
        console.log('📡 Fetching user profile from backend...');
        const response = await fetch(`${API_BASE_URL}/api/users/profile?email=${encodeURIComponent(savedEmail)}`, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        });

        // If search by email fails, the user might not have a username yet
        // That's okay, we'll just use email
        if (!response.ok) {
          console.log('ℹ️ User profile not found in backend');
        } else {
          const data = await response.json();
          if (data.success && data.user) {
            backendUserData = {
              username: data.user.username,
              profileImage: data.user.profileImage,
            };
            console.log('✅ User profile loaded:', backendUserData.username);
          }
        }
      } catch (backendError) {
        console.warn('⚠️ Failed to fetch user profile (non-blocking):', backendError);
      }

      const userData = {
        grid_user_id: gridData.grid_user_id,
        email: savedEmail,
        username: backendUserData.username || null,
        profileImage: backendUserData.profileImage || null,
        grid_address: gridData.address,
        policies: gridData.policies,
        authentication: gridData.authentication,
      };

      await authStorage.saveAuth({
        access_token: dummyToken,
        refresh_token: '',
        expires_in: 86400,
        user: userData,
      });

      console.log('✅ Auth data saved');

      // Set current user email for user-specific wallet storage
      solanaWalletService.setCurrentUserEmail(savedEmail);

      // WALLET LOADING: Charger le wallet Solana existant ou utiliser le wallet Grid
      try {
        console.log('🔑 Loading Solana wallet...');

        // Load wallet with callback to update address after migration
        const solanaKeypair = await solanaWalletService.loadWallet(async (address) => {
          console.log('📝 Migration callback: updating Solana address to', address);
          await authStorage.saveSolanaAddress(address, savedEmail);
        });

        if (solanaKeypair) {
          const solanaAddress = solanaKeypair.publicKey.toBase58();
          console.log('✅ Solana wallet loaded successfully!');
          console.log('   Public Key:', solanaAddress);

          // Sauvegarder l'adresse Solana (always update to ensure consistency)
          await authStorage.saveSolanaAddress(solanaAddress, savedEmail);
        } else {
          console.log('ℹ️ No Solana wallet found in storage');

          // Essayer de récupérer l'adresse du wallet depuis Grid (Privy wallet)
          const gridWalletAddress = gridData.authentication?.[0]?.session?.Privy?.session?.wallets?.[0]?.address;

          if (gridWalletAddress) {
            console.log('✅ Using Grid wallet address:', gridWalletAddress);
            await authStorage.saveSolanaAddress(gridWalletAddress);
          } else {
            console.log('ℹ️ No Solana wallet found for this account');
          }
        }
      } catch (solanaError: any) {
        // Ne pas bloquer le login si le chargement du wallet Solana échoue
        console.warn('⚠️ Failed to load Solana wallet (non-blocking):', solanaError);
      }

      // PRIVATE WALLET: Définir l'email de l'utilisateur courant pour le wallet privé
      stealfService.setCurrentUserEmail(savedEmail);

      // PRIVATE WALLET: Vérifier si un Private Wallet existe
      try {
        console.log('🔍 Checking for Private Wallet...');

        const privateWalletKeypair = await stealfService.getPrivateWalletKeypair();

        if (privateWalletKeypair) {
          console.log('✅ Private Wallet found!');

          // Sauvegarder l'adresse du Private Wallet
          await authStorage.savePrivateWalletAddress(privateWalletKeypair.publicKey.toBase58());
        } else {
          console.log('ℹ️ No Private Wallet found for this account');
        }
      } catch (privateWalletError: any) {
        // Ne pas bloquer le login si la vérification échoue
        console.warn('⚠️ Failed to retrieve Private Wallet (non-blocking):', privateWalletError);
        console.warn('   User can still use main wallet.');
      }

      setShowLogoAnimation(true);
    } catch (err: any) {
      console.error('❌ OTP verification error:', err);

      let errorMessage = 'Invalid or expired code';

      if (err.message) {
        if (err.message.toLowerCase().includes('invalid')) {
          errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (err.message.toLowerCase().includes('expired')) {
          errorMessage = 'Verification code has expired. Please request a new one.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    setShowOtpInput(false);
    setOtpCode('');
    setTimer(600);
  };

  const handleAnimationComplete = async () => {
    try {
      const userData = await authStorage.getUserData();

      if (userData) {
        console.log('🔄 Calling AuthContext.login()...');
        await login({
          email: userData.email || '',
          username: userData.username || userData.email?.split('@')[0] || '',
          profileImage: userData.profileImage || null,
          gridAddress: userData.grid_address,
        });
        console.log('✅ AuthContext.login() completed');

        if (onSuccess) {
          onSuccess(userData, 'grid_session');
        }
      }
    } catch (error) {
      console.error('❌ Error in animation complete:', error);
    }
  };

  return {
    email,
    setEmail,
    otpCode,
    setOtpCode,
    showOtpInput,
    isLoading,
    error,
    timer,
    showLogoAnimation,
    handleSubmitEmail,
    handleVerifyOtp,
    handleResendCode,
    handleAnimationComplete,
  };
};
