const REQUIRED_ENV_VARS = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_SOLANA_RPC_URL',
  'EXPO_PUBLIC_ORGANIZATION_ID',
  'EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID',
] as const;

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    const message = `Missing required environment variables:\n${missing.join('\n')}`;
    if (__DEV__) {
      console.error(`[ENV] ${message}`);
    }
    throw new Error(message);
  }
}
