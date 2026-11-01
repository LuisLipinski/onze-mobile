import * as SecureStore from 'expo-secure-store';

import { createAuthSessionStorage } from './auth-session-storage';

export type { BiometricAccount, BiometricCredential } from './auth-session-storage';

const storage = createAuthSessionStorage({
  read: (key) => SecureStore.getItemAsync(key),
  write: (key, value) =>
    SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  remove: (key) => SecureStore.deleteItemAsync(key),
});

export const {
  saveAccessToken,
  getAccessToken,
  clearAccessToken,
  getRefreshToken,
  saveCurrentUser,
  getStoredCurrentUser,
  clearCurrentUser,
  saveLastLoginEmail,
  getLastLoginEmail,
  saveSession,
  clearSession,
  enableBiometricLogin,
  disableBiometricLogin,
  getBiometricAccount,
  getBiometricCredential,
  invalidateBiometricCredential,
  saveRenewedBiometricCredential,
  refreshBiometricCredentialAfterPassword,
  saveBiometricAccountProfile,
  isBiometricLoginEnabled,
  isBiometricLoginReady,
  isBiometricLoginEnabledFor,
} = storage;
