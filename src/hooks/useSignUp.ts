import { useAuth as useAuthContext } from "../contexts/AuthContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface UseAuthFlowParams {
  email: string;
  pseudo: string;
  setStep: (step: 'email' | 'waiting') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setShowLogoAnimation: (show: boolean) => void;
}

export function useAuthFlow() {
  const { setUserData } = useAuthContext();


  /**
   * Resend magic link to user's email
   */
  const handleResendMagicLink = async (params: Pick<UseAuthFlowParams, 'email' | 'pseudo' | 'setLoading'>) => {
    const { email, pseudo, setLoading } = params;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/users/send-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pseudo }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend magic link');
      }

      return { success: true, message: 'Magic link sent! Check your email.' };
    } catch (error: any) {
      console.error('Error resending magic link:', error);
      return { success: false, message: 'Failed to resend magic link' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check email/pseudo availability and send magic link
   * Returns preAuthToken for polling verification status
   */
  const handleEmailSubmit = async (params: Pick<UseAuthFlowParams, 'email' | 'pseudo' | 'setStep' | 'setLoading'>) => {
    const { email, pseudo, setStep, setLoading } = params;

    if (!email) {
      return { success: false, message: 'Email is required' };
    }

    if (!email.includes('@')) {
      return { success: false, message: 'Invalid email' };
    }

    if (!pseudo) {
      return { success: false, message: 'Pseudo is required' };
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pseudo }),
      });
      if (!response.ok) {
        throw new Error('Failed to check availability');
      }

      const data = await response.json();
      console.log('check-availability response:', JSON.stringify(data));

      if (!data.canProceed) {
        const unavailable = data.unavailable || [];
        const errors = [];

        if (unavailable.includes(1)) {
          errors.push('This email is already registered');
        }
        if (unavailable.includes(2)) {
          errors.push('This pseudo is already registered');
        }
        if (unavailable.length === 0){
          errors.push('User already exists!');
        }

        return { success: false, message: errors.join('\n') };
      }

      setStep('waiting');

      return {
        success: true,
        message: 'Check your email for the magic link!',
        preAuthToken: data.preAuthToken
      };

    } catch (error: any) {
      console.error('Error during email submit:', error);
      return { success: false, message: error?.message || 'An error occurred' };
    } finally {
      setLoading(false);
    }
  };


  /**
   * Called after wallet setup to register user with backend
   * stealf_wallet can be null/undefined if user chose not to store it
   */
  const handleRegisterUser = async (params: {
    email: string;
    pseudo: string;
    sessionToken: string;
    cash_wallet: string;
    stealf_wallet: string | null;
    setLoading: (loading: boolean) => void;
  }) => {
    const { email, pseudo, sessionToken, cash_wallet, stealf_wallet, setLoading } = params;

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          email,
          pseudo,
          cash_wallet,
          stealf_wallet,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to authenticate with backend');
      }

      const data = await response.json();

      if (!data.data?.user) {
        throw new Error('Backend did not return user data');
      }

      const userData = {
        email: data.data.user.email,
        username: data.data.user.username || data.data.user.pseudo || pseudo,
        cash_wallet: data.data.user.cash_wallet,
        stealf_wallet: data.data.user.stealf_wallet || stealf_wallet || '',
        subOrgId: data.data.user.subOrgId,
      };

      setUserData(userData);

      return { success: true };

    } catch (error: any) {
      console.error('Error during user registration:', error);

      return {
        success: false,
        message: 'Registration Failed',
        description: error?.message || 'Failed to register. Please try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    handleResendMagicLink,
    handleEmailSubmit,
    handleRegisterUser,
  };
}