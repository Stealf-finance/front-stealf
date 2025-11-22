import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../contexts/AuthContext';
import { authStorage } from '../../services/authStorage';
import { getGridClient } from '../../config/grid';
import solanaWalletService from '../../services/solanaWalletService';
import stealfService from '../../services/stealfService';

export const useRegister = (onSuccess?: (userData: any) => void) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(600);
  const [showLogoAnimation, setShowLogoAnimation] = useState(false);
  const gridClient = getGridClient();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (showOtpInput && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showOtpInput, timer]);

  const handleSubmitEmail = async () => {
    setError('');
    setIsLoading(true);

    try {
      console.log('🔐 Creating account with Grid SDK:', email);

      const result = await gridClient.createAccount({
        type: 'email',
        email: email
      });

      console.log('✅ Account creation initiated:', result);

      await SecureStore.setItemAsync('auth_email', email);
      await SecureStore.setItemAsync('auth_user_data', JSON.stringify(result));

      setShowOtpInput(true);
      setTimer(600);
    } catch (err: any) {
      console.error('❌ Account creation error:', err);

      let errorMessage = 'An error occurred';

      if (err.message) {
        if (err.message.toLowerCase().includes('already exists') ||
            err.message.toLowerCase().includes('account_already_exists')) {
          errorMessage = 'This email is already registered. Please use the Login option instead.';
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

      console.log('🔐 Verifying OTP code and creating account with Grid SDK...');

      // Ajouter l'email au user data car completeAuthAndCreateAccount en a besoin
      const userWithEmail = {
        ...savedUserData,
        email: savedEmail
      };

      const verifyResult = await gridClient.completeAuthAndCreateAccount({
        otpCode: otpCode,
        user: userWithEmail,
        sessionSecrets: sessionSecrets,
      });

      console.log('✅ OTP verification response:', JSON.stringify(verifyResult, null, 2));

      // Vérifier si l'opération a réussi
      if (!verifyResult.success) {
        throw new Error(verifyResult.error || 'Authentication failed');
      }

      // Grid SDK retourne GridResponse<CompleteAuthResponse>, extraire les données
      const gridData = verifyResult.data;

      if (!gridData) {
        throw new Error('No data returned from authentication');
      }

      console.log('🔍 Grid data:', JSON.stringify(gridData, null, 2));

      // Grid SDK utilise les session secrets, pas de JWT token
      const dummyToken = `grid_session_${Date.now()}`;

      console.log('✅ Registration successful!');

      await SecureStore.deleteItemAsync('auth_email');
      await SecureStore.deleteItemAsync('auth_user_data');

      await SecureStore.setItemAsync('session_secrets', JSON.stringify(sessionSecrets));
      console.log('✅ Session secrets saved');

      const userData = {
        grid_user_id: gridData.grid_user_id,
        email: savedEmail,
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

      // WALLET CREATION: Créer un wallet Solana classique
      try {
        console.log('🔑 Creating Solana wallet...');

        const solanaWallet = await solanaWalletService.createWallet();

        console.log('✅ Solana wallet created successfully!');
        console.log('   Public Key:', solanaWallet.publicKey);

        // Sauvegarder l'adresse Solana
        await authStorage.saveSolanaAddress(solanaWallet.publicKey);

        // Mettre à jour les données utilisateur avec l'adresse Solana
        const updatedUserData = {
          ...userData,
          solana_address: solanaWallet.publicKey,
        };

        await authStorage.saveAuth({
          access_token: dummyToken,
          refresh_token: '',
          expires_in: 86400,
          user: updatedUserData,
        });

        console.log('💾 Solana address saved to user data');
      } catch (solanaError: any) {
        // Ne pas bloquer la registration si la création du wallet Solana échoue
        console.warn('⚠️ Failed to create Solana wallet (non-blocking):', solanaError);
      }

      // STEALF INTEGRATION: Créer et lier le Private Wallet
      try {
        console.log('🔗 Creating and linking Private Wallet with Stealf SDK...');

        const privateWalletResult = await stealfService.linkPrivateWallet(gridData.address);

        console.log('✅ Private Wallet created successfully!');
        console.log('   Grid Wallet:', privateWalletResult.gridWallet.toBase58());
        console.log('   Private Wallet:', privateWalletResult.privateWallet.publicKey.toBase58());

        // Sauvegarder l'adresse du Private Wallet
        await authStorage.savePrivateWalletAddress(privateWalletResult.privateWallet.publicKey.toBase58());

        // La clé privée est automatiquement sauvegardée dans SecureStore par le service
      } catch (stealfError: any) {
        // Ne pas bloquer la registration si Stealf échoue
        console.warn('⚠️ Failed to create Private Wallet (non-blocking):', stealfError);
        console.warn('   User can still use Grid wallet. Private wallet can be created later.');
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
          username: userData.email?.split('@')[0] || '',
          gridAddress: userData.grid_address,
        });
        console.log('✅ AuthContext.login() completed');

        if (onSuccess) {
          onSuccess(userData);
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
