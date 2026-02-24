import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedApi } from "../services/clientStealf";

export interface ProofFromSnapshotsParams {
  startIndex: number;
  endIndex: number;
  thresholdBps?: number;
  vaultType?: "sol_jito" | "sol_marinade";
}

export interface ProofFromSnapshotsResponse {
  exceedsThreshold: boolean | null;
  available: boolean;
  thresholdBps?: number;
}

export function useYieldProofFromSnapshots(params: ProofFromSnapshotsParams | null) {
  const api = useAuthenticatedApi();

  return useQuery<ProofFromSnapshotsResponse>({
    queryKey: ["yield-proof-snapshots", params],
    queryFn: async () => {
      if (!params) return { exceedsThreshold: null, available: false };
      const { startIndex, endIndex, thresholdBps = 100, vaultType = "sol_jito" } = params;
      const qs = new URLSearchParams({
        startIndex: String(startIndex),
        endIndex: String(endIndex),
        thresholdBps: String(thresholdBps),
        vaultType,
      }).toString();
      const result = await api.get(`/api/yield/proof-from-snapshots?${qs}`);
      return result;
    },
    staleTime: 300_000,
    enabled: params !== null,
  });
}
