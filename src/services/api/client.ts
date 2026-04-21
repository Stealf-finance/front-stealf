const API_URL = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Session expiry handling.
 *
 * The API client is a plain module — it has no access to React context or
 * Turnkey's session manager. To keep it decoupled from the auth layer, we
 * expose a registration hook: AuthContext calls `setUnauthorizedHandler(fn)`
 * on mount with its `logout` function, and the client invokes `fn()` the
 * first time a 401 slips past the Bearer header (typically JWT expired).
 *
 * A single in-flight flag deduplicates parallel 401s so that e.g. three
 * React Query calls firing at once all hitting 401 only trigger one logout.
 * The flag resets once the handler promise resolves (or rejects).
 */
type UnauthorizedHandler = () => void | Promise<void>;
let unauthorizedHandler: UnauthorizedHandler | null = null;
let isHandlingUnauthorized = false;

export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  unauthorizedHandler = fn;
}

async function handleUnauthorized(): Promise<void> {
  if (isHandlingUnauthorized || !unauthorizedHandler) return;
  isHandlingUnauthorized = true;
  try {
    await unauthorizedHandler();
  } catch (error) {
    if (__DEV__) console.error('[api] unauthorized handler threw:', error);
  } finally {
    isHandlingUnauthorized = false;
  }
}

async function throwApiError(response: Response): Promise<never> {
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    // Fire-and-forget — don't block the throw on the handler.
    void handleUnauthorized();
  }
  throw new ApiError(
    body.error || `API error: ${response.status}`,
    response.status,
    body,
  );
}

export async function apiGet(endpoint: string, token: string) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) await throwApiError(response);

  const result = await response.json();

  return result.data || result;
}

export async function apiPost(endpoint: string, token: string, data?: any) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) await throwApiError(response);

  const result = await response.json();

  return result.data || result;
}

export async function apiDelete(endpoint: string, token: string) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) await throwApiError(response);

  const result = await response.json();

  return result.data || result;
}
