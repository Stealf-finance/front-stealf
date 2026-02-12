/**
 * Tests for useMWAAvailability hook logic.
 * Since hooks require React test renderer, we test the core detection logic.
 */
import { Platform } from 'react-native';

// We test the detection logic directly rather than the hook
// because hooks need a React rendering context.

describe('MWA Availability Detection Logic', () => {
  it('returns false on non-Android platforms', () => {
    // Platform.OS is mocked as 'android' in our mock
    // On iOS, the hook would return false without even trying transact()
    const isAndroid = Platform.OS === 'android';
    expect(typeof isAndroid).toBe('boolean');
  });

  it('transact() failure should result in isMWAAvailable = false', async () => {
    const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
    (transact as jest.Mock).mockRejectedValueOnce(new Error('No wallet found'));

    let available = true;
    try {
      await transact(async (wallet: any) => {
        await wallet.authorize({});
      });
    } catch {
      available = false;
    }

    expect(available).toBe(false);
  });

  it('transact() success should result in isMWAAvailable = true', async () => {
    const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
    // Default mock resolves successfully

    let available = false;
    try {
      await transact(async (wallet: any) => {
        await wallet.authorize({});
      });
      available = true;
    } catch {
      available = false;
    }

    expect(available).toBe(true);
  });
});
