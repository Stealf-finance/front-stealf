import { useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../contexts/AuthContext';
import { authStorage } from '../../services/authStorage';
import { getGridClient } from '../../config/grid';

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

      console.log('✅ OTP verification successful:', JSON.stringify(verifyResult, null, 2));

      // Grid SDK retourne GridResponse<CompleteAuthResponse>, extraire les données
      const gridData = verifyResult.data;

      if (!gridData) {
        throw new Error('No data returned from authentication');
      }

      console.log('🔍 Grid data:', JSON.stringify(gridData, null, 2));
      console.log('🔍 Authentication structure:', JSON.stringify(gridData.authentication, null, 2));

      // Grid SDK utilise les session secrets, pas de JWT token
      const dummyToken = `grid_session_${Date.now()}`;

      console.log('✅ Login successful!');

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
