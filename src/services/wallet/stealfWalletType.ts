import * as SecureStore from 'expo-secure-store';
import {
  STEALF_WALLET_TYPE_KEY,
  type StealfWalletType,
} from '../../constants/walletAuth';

/**
 * Read the stored stealth-wallet kind. Defaults to 'local' (BIP39 keypair)
 * for users who set up before the MWA option existed or never explicitly
 * picked one — this matches the legacy behaviour exactly.
 */
export async function getStealfWalletType(): Promise<StealfWalletType> {
  try {
    const v = await SecureStore.getItemAsync(STEALF_WALLET_TYPE_KEY);
    return v === 'mwa' ? 'mwa' : 'local';
  } catch {
    return 'local';
  }
}

export async function setStealfWalletType(value: StealfWalletType): Promise<void> {
  await SecureStore.setItemAsync(STEALF_WALLET_TYPE_KEY, value);
}

export async function clearStealfWalletType(): Promise<void> {
  await SecureStore.deleteItemAsync(STEALF_WALLET_TYPE_KEY).catch(() => undefined);
}
