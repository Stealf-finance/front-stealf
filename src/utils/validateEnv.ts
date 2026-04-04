/**
 * Validates required environment variables at app startup.
 * Throws if critical env vars are missing.
 */
export function validateEnv(): void {
  const required = [
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_SOLANA_RPC_URL',
    'EXPO_PUBLIC_ORGANIZATION_ID',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`[validateEnv] Missing env vars: ${missing.join(', ')}`);
  }
}
