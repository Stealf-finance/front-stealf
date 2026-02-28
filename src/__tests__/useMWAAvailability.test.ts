/**
 * Tests for useMWAAvailability.
 * The hook always returns false — MWA/Seed Vault is not used for the seeker wallet.
 * Signing is done locally via the cold wallet stored in SecureStore.
 */
import { useMWAAvailability } from '../hooks/useMWAAvailability';

describe('useMWAAvailability', () => {
  it('always returns isMWAAvailable = false', () => {
    const result = useMWAAvailability();
    expect(result.isMWAAvailable).toBe(false);
  });

  it('always returns isChecking = false', () => {
    const result = useMWAAvailability();
    expect(result.isChecking).toBe(false);
  });

  it('returns a stable object with both fields', () => {
    const result = useMWAAvailability();
    expect(result).toEqual({ isMWAAvailable: false, isChecking: false });
  });
});
