import { useEffect, useState } from 'react';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const POLLING_INTERVAL = 1500; // 1.5 seconds

interface VerificationResult {
  verified: boolean;
  email?: string;
  pseudo?: string;
}

interface UseEmailVerificationPollingParams {
  preAuthToken: string | null;
  enabled: boolean;
  onVerified: (data: { email: string; pseudo: string }) => void;
}


export function useEmailVerificationPolling({
  preAuthToken,
  enabled,
  onVerified,
}: UseEmailVerificationPollingParams) {
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!preAuthToken || !enabled) {
      return;
    }

    console.log('Starting polling for email verification...');
    setIsPolling(true);

    const pollInterval = setInterval(async () => {
      console.log('Polling verification status...');

      try {
        const response = await fetch(
          `${API_URL}/api/users/check-verification?token=${preAuthToken}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) {
          console.error('Failed to check verification status');
          return;
        }

        const data: VerificationResult = await response.json();

        if (data.verified && data.email && data.pseudo) {
          console.log('✅ Email verified!', data);
          clearInterval(pollInterval);
          setIsPolling(false);
          onVerified({ email: data.email, pseudo: data.pseudo });
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    }, POLLING_INTERVAL);

    return () => {
      console.log('Stopping polling');
      clearInterval(pollInterval);
      setIsPolling(false);
    };
  }, [preAuthToken, enabled, onVerified]);

  return { isPolling };
}