import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../contexts/AuthContext';
import { authStorage } from '../../services/authStorage';
import { getGridClient } from '../../config/grid';
import solanaWalletService from '../../services/solanaWalletService';
import stealfService from '../../services/stealfService';
import { UMBRA_CONFIG } from '../../config/umbra';

// API base URL from config
const API_BASE_URL = UMBRA_CONFIG.API_URL;

export const useRegister = (onSuccess?: (userData: any) => void) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
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

  // Check if username is available
  const checkUsernameAvailability = async (usernameToCheck: string): Promise<boolean> => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      return false;
    }

    try {
      setIsCheckingUsername(true);
      const response = await fetch(
        `${API_BASE_URL}/api/users/check-username?username=${encodeURIComponent(usernameToCheck)}`,
        {
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        }
      );

      const data = await response.json();
      return data.available === true;
    } catch (err) {
      console.error('Error checking username:', err);
      return true; // Allow to proceed if check fails
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleSubmitEmail = async () => {
    setError('');
    setUsernameError('');
    setIsLoading(true);

    try {
      console.log('🔐 Creating account with Grid SDK:', email);
      console.log('📝 Username from state:', username);
      console.log('📝 Username length:', username?.length || 0);

      // Check username availability first
      if (username && username.trim().length >= 3) {
        console.log('🔍 Checking username availability...');
        const isAvailable = await checkUsernameAvailability(username.trim());

        if (!isAvailable) {
          setUsernameError('Username is already taken');
          setError('Username is already taken. Please choose another one.');
          setIsLoading(false);
          return;
        }
        console.log('✅ Username is available');
      }

      const result = await gridClient.createAccount({
        type: 'email',
        email: email
      });

      console.log('✅ Account creation initiated:', result);

      // IMPORTANT: Save username BEFORE any async operations
      const usernameToStore = username?.trim() || '';
      console.log('💾 Storing username to SecureStore:', usernameToStore);

      await SecureStore.setItemAsync('auth_email', email);
      await SecureStore.setItemAsync('auth_username', usernameToStore);
      await SecureStore.setItemAsync('auth_profile_image', profileImage || '');
      await SecureStore.setItemAsync('auth_user_data', JSON.stringify(result));

      // Verify the username was saved
      const verifyUsername = await SecureStore.getItemAsync('auth_username');
      console.log('✅ Verified stored username:', verifyUsername);

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
      const savedUsername = await SecureStore.getItemAsync('auth_username');
      const savedProfileImage = await SecureStore.getItemAsync('auth_profile_image');
      const savedUserDataStr = await SecureStore.getItemAsync('auth_user_data');

      if (!savedEmail || !savedUserDataStr) {
        setError('Session expired. Please start over.');
        setShowOtpInput(false);
        setIsLoading(false);
        return;
      }

      console.log('📋 Retrieved from SecureStore:');
      console.log('   Email:', savedEmail);
      console.log('   Username:', savedUsername);
      console.log('   Profile Image:', savedProfileImage ? 'Yes' : 'No');

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

      console.log('✅ OTP verification successful');

      // Vérifier si l'opération a réussi
      if (!verifyResult.success) {
        throw new Error(verifyResult.error || 'Authentication failed');
      }

      // Grid SDK retourne GridResponse<CompleteAuthResponse>, extraire les données
      const gridData = verifyResult.data;

      if (!gridData) {
        throw new Error('No data returned from authentication');
      }

      // Grid SDK utilise les session secrets, pas de JWT token
      const dummyToken = `grid_session_${Date.now()}`;

      console.log('✅ Registration successful!');

      // Clean up temporary auth data from SecureStore
      await SecureStore.deleteItemAsync('auth_email');
      await SecureStore.deleteItemAsync('auth_username');
      await SecureStore.deleteItemAsync('auth_profile_image');
      await SecureStore.deleteItemAsync('auth_user_data');

      await SecureStore.setItemAsync('session_secrets', JSON.stringify(sessionSecrets));
      console.log('✅ Session secrets saved');

      // Use saved values from SecureStore (more reliable than state)
      const finalUsername = savedUsername || username || null;
      const finalProfileImage = savedProfileImage || profileImage || null;

      const userData = {
        grid_user_id: gridData.grid_user_id,
        email: savedEmail,
        username: finalUsername,
        profileImage: finalProfileImage,
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

      // IMPORTANT: Register user to backend FIRST before creating wallets
      // This ensures the user exists in MongoDB when wallets try to save
      const usernameToSave = savedUsername || username || null;
      const profileImageToSave = savedProfileImage || profileImage || null;

      try {
        console.log('📡 Registering user to backend FIRST...');
        console.log('   Email:', savedEmail);
        console.log('   Username:', usernameToSave);

        const registerBody = {
          email: savedEmail,
          username: usernameToSave,
          profileImage: profileImageToSave,
          gridUserId: gridData.grid_user_id,
          gridAddress: gridData.address,
        };

        const registerResponse = await fetch(`${API_BASE_URL}/api/users/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify(registerBody),
        });

        const registerData = await registerResponse.json();

        if (registerData.success) {
          console.log('✅ User registered to backend successfully!');
        } else {
          console.warn('⚠️ Backend registration failed:', registerData.message);
        }
      } catch (backendError: any) {
        console.warn('⚠️ Failed to register to backend:', backendError);
      }

      // NOW create wallets - user exists in MongoDB
      let solanaWalletAddress: string | null = null;

      // Set current user email for user-specific wallet storage
      solanaWalletService.setCurrentUserEmail(savedEmail);
      stealfService.setCurrentUserEmail(savedEmail);

      // PUBLIC WALLET: Create and save to server
      try {
        console.log('🔑 Creating new Solana wallet...');
        const solanaWallet = await solanaWalletService.createWallet();
        solanaWalletAddress = solanaWallet.publicKey;
        console.log('✅ New Solana wallet created:', solanaWalletAddress);

        // Request airdrop for new users (devnet only)
        try {
          console.log('🪂 Requesting airdrop for new user...');
          await solanaWalletService.requestAirdrop(2); // 2 SOL
          console.log('✅ Airdrop of 2 SOL received!');
        } catch (airdropError: any) {
          console.warn('⚠️ Airdrop failed (non-blocking):', airdropError.message);
        }

        // Save wallet address to local storage
        await authStorage.saveSolanaAddress(solanaWalletAddress);

        // Update user data with Solana address
        const updatedUserData = {
          ...userData,
          username: usernameToSave,
          profileImage: profileImageToSave,
          solana_address: solanaWalletAddress,
        };

        await authStorage.saveAuth({
          access_token: dummyToken,
          refresh_token: '',
          expires_in: 86400,
          user: updatedUserData,
        });

        console.log('💾 Solana address saved to user data');
      } catch (solanaError: any) {
        console.warn('⚠️ Wallet creation error (non-blocking):', solanaError);
      }

      // PRIVATE WALLET: Create and save to server
      try {
        console.log('🔗 Creating new Private Wallet...');
        const privateWallet = await stealfService.createPrivateWallet();

        console.log('✅ Private Wallet created successfully!');

        await authStorage.savePrivateWalletAddress(privateWallet.publicKey.toBase58());
      } catch (privateWalletError: any) {
        console.warn('⚠️ Failed to create Private Wallet (non-blocking):', privateWalletError);
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
    username,
    setUsername,
    profileImage,
    setProfileImage,
    otpCode,
    setOtpCode,
    showOtpInput,
    isLoading,
    error,
    usernameError,
    isCheckingUsername,
    timer,
    showLogoAnimation,
    handleSubmitEmail,
    handleVerifyOtp,
    handleResendCode,
    handleAnimationComplete,
  };
};
