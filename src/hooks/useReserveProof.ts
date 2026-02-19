import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "";
const RESERVE_PROOF_URL = `${API_URL}/api/yield/reserve-proof`;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface ReserveProofState {
  isSolvent: boolean | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useReserveProof(): ReserveProofState {
  const [isSolvent, setIsSolvent] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await globalThis.fetch(RESERVE_PROOF_URL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (mountedRef.current) {
        setIsSolvent(data.isSolvent ?? null);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || "Reserve proof unavailable");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetch();

    intervalRef.current = setInterval(fetch, REFRESH_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetch]);

  return { isSolvent, isLoading, error, refresh: fetch };
}
