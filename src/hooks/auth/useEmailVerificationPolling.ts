import { useEffect, useRef, useState } from 'react';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const POLLING_INTERVAL = 1500;
// Stop polling after 3 minutes so we don't drain the battery / hammer the
// backend when the user leaves the verification screen open indefinitely.
const MAX_POLL_ATTEMPTS = 120;

interface VerificationResult {
  verified: boolean;
  email?: string;
  pseudo?: string;
}

interface UseEmailVerificationPollingParams {
  preAuthToken: string | null;
  enabled: boolean;
  onVerified: (data: { email: string; pseudo: string }) => void;
  onTimeout?: () => void;
}


export function useEmailVerificationPolling({
  preAuthToken,
  enabled,
  onVerified,
  onTimeout,
}: UseEmailVerificationPollingParams) {
  const [isPolling, setIsPolling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!preAuthToken || !enabled) {
      return;
    }

    if (__DEV__) console.log('Starting polling for email verification...');
    setIsPolling(true);
    setTimedOut(false);
    attemptsRef.current = 0;

    const pollInterval = setInterval(async () => {
      attemptsRef.current += 1;

      if (attemptsRef.current > MAX_POLL_ATTEMPTS) {
        if (__DEV__) console.log('Email verification polling timed out');
        clearInterval(pollInterval);
        setIsPolling(false);
        setTimedOut(true);
        onTimeout?.();
        return;
      }

      if (__DEV__) console.log('Polling verification status...');

      try {
        const response = await fetch(
          `${API_URL}/api/users/check-verification`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${preAuthToken}`,
            },
          }
        );

        if (!response.ok) {
          if (__DEV__) console.error('Failed to check verification status');
          return;
        }

        const data: VerificationResult = await response.json();

        if (data.verified && data.email && data.pseudo) {
          clearInterval(pollInterval);
          setIsPolling(false);
          onVerified({ email: data.email, pseudo: data.pseudo });
        }
      } catch (error) {
        if (__DEV__) console.error('Error checking verification status:', error);
      }
    }, POLLING_INTERVAL);

    return () => {
      if (__DEV__) console.log('Stopping polling');
      clearInterval(pollInterval);
      setIsPolling(false);
    };
  }, [preAuthToken, enabled, onVerified, onTimeout]);

  return { isPolling, timedOut };
}