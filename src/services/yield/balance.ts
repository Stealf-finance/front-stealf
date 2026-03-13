import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAuthenticatedApi } from "../api/clientStealf";

export function useYieldBalance() {
  const { userData } = useAuth();
  const api = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async (): Promise<number> => {
    setLoading(true);
    setError(null);

    try {
      const subOrgId = userData?.subOrgId;
      if (!subOrgId) throw new Error("User not authenticated");

      const data = await api.get(`/api/yield/balance/${subOrgId}`);
      if (__DEV__) console.log('[useYieldBalance] balance:', data);

      return data.balance;
    } catch (err: any) {
      console.error("[useYieldBalance] Error:", err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { fetchBalance, loading, error };
}
