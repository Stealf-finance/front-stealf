
export const createGetBalance = (api: ReturnType<typeof import('./clientStealf').useAuthenticatedApi>, address: string) => {
  return () => api.get(`/api/wallet/balance/${address}`);
};

export const createGetTransactionsHistory = (api: ReturnType<typeof import('./clientStealf').useAuthenticatedApi>, address: string) => {
  return () => api.get(`/api/wallet/history/${address}?limit=10`);
};

export const createGetSolPriceUSD = (api: ReturnType<typeof import('./clientStealf').useAuthenticatedApi>) => {
  return () => api.get(`/api/users/sol-price`);
};

export const createGetYieldStats = (api: ReturnType<typeof import('./clientStealf').useAuthenticatedApi>) => {
  return () => api.get(`/api/yield/stats`) as Promise<{ rate: number; apy: number }>;
};




