import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_TOKEN_KEY = 'biometric_token';

/**
 * Check if biometric authentication is available on the device
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
};

/**
 * Check if biometric authentication is enabled in the app
 */
export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometric enabled status:', error);
    return false;
  }
};

/**
 * Get the biometric type available on the device (Face ID, Touch ID, etc.)
 */
export const getBiometricType = async (): Promise<string | null> => {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }

    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID';
    }

    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }

    return 'Biometric';
  } catch (error) {
    console.error('Error getting biometric type:', error);
    return null;
  }
};

/**
 * Enable biometric authentication and store the access token securely
 */
export const enableBiometric = async (accessToken: string): Promise<boolean> => {
  try {
    // Verify biometric is available
    const available = await isBiometricAvailable();
    if (!available) {
      console.log('❌ Biometric authentication is not available');
      return false;
    }

    // Prompt user to authenticate
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to enable biometric login',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      console.log('❌ Biometric authentication failed');
      return false;
    }

    // Store the token securely
    await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

    console.log('✅ Biometric authentication enabled successfully');
    return true;
  } catch (error) {
    console.error('Error enabling biometric:', error);
    return false;
  }
};

/**
 * Disable biometric authentication and clear stored token
 */
export const disableBiometric = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    console.log('✅ Biometric authentication disabled');
  } catch (error) {
    console.error('Error disabling biometric:', error);
  }
};

/**
 * Authenticate user with biometrics and return stored token if successful
 */
export const authenticateWithBiometric = async (): Promise<string | null> => {
  try {
    // Check if biometric is enabled
    const enabled = await isBiometricEnabled();
    if (!enabled) {
      console.log('❌ Biometric authentication is not enabled');
      return null;
    }

    // Verify biometric is still available
    const available = await isBiometricAvailable();
    if (!available) {
      console.log('❌ Biometric authentication is no longer available');
      return null;
    }

    // Prompt user to authenticate
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access your wallet',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      console.log('❌ Biometric authentication failed');
      return null;
    }

    // Retrieve stored token
    const token = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);

    if (!token) {
      console.log('❌ No stored token found');
      return null;
    }

    console.log('✅ Biometric authentication successful');
    return token;
  } catch (error) {
    console.error('Error authenticating with biometric:', error);
    return null;
  }
};