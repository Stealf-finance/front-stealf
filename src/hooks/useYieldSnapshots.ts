import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedApi } from "../services/clientStealf";

export interface SnapshotSummary {
  shareId: string;
  vaultType: string;
  snapshotIndex: number;
  createdAt: string;
}

export function useYieldSnapshots(vaultType?: "sol_jito" | "sol_marinade") {
  const api = useAuthenticatedApi();

  return useQuery<SnapshotSummary[]>({
    queryKey: ["yield-snapshots", vaultType ?? "all"],
    queryFn: async () => {
      const params = vaultType ? `?vaultType=${vaultType}` : "";
      const result = await api.get(`/api/yield/snapshots${params}`);
      return result.snapshots ?? [];
    },
    staleTime: 60_000,
    enabled: vaultType === undefined || vaultType.startsWith("sol_"),
  });
}
