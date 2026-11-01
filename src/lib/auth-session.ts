import { exchangeLegacySession, renewSession, revokeRefreshToken } from './api';
import type { AuthResponse } from './api';
import * as storage from './auth-storage';
import { authenticateWithBiometrics, isBiometricAvailable } from './biometrics';
import { createBiometricSignIn, BiometricSessionError } from './biometric-session';

export { BiometricSessionError } from './biometric-session';

export const signInWithBiometrics = createBiometricSignIn({
  available: isBiometricAvailable,
  authenticate: authenticateWithBiometrics,
  read: storage.getBiometricCredential,
  renew: renewSession,
  migrate: exchangeLegacySession,
  saveCredential: (previous, response) =>
    storage.saveRenewedBiometricCredential(previous, response.refreshToken, response.user),
  saveSession: storage.saveSession,
  invalidate: storage.invalidateBiometricCredential,
  clearSession: async (email) => {
    const user = await storage.getStoredCurrentUser();
    if (!user || user.email.trim().toLowerCase() === email) await storage.clearSession();
  },
  revoke: revokeRefreshToken,
});

export async function enableBiometricLogin() {
  const previous = await storage.getBiometricCredential();
  if (!(await storage.getRefreshToken())) {
    const [token, user] = await Promise.all([
      storage.getAccessToken(),
      storage.getStoredCurrentUser(),
    ]);
    if (!token || !user) throw new Error('Entre na sua conta antes de ativar a biometria.');
    const response = await exchangeLegacySession(token);
    if (
      response.user.id !== user.id ||
      response.user.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      throw new BiometricSessionError(
        'account',
        'Entre novamente na conta desejada antes de ativar a biometria.',
      );
    }
    await storage.saveSession(response.accessToken, response.user, response.refreshToken);
  }
  const next = await storage.enableBiometricLogin();
  if (previous?.refreshToken && previous.refreshToken !== next.refreshToken) {
    await revokeRefreshToken(previous.refreshToken).catch(() => undefined);
  }
  return next;
}

export async function disableBiometricLogin() {
  const previous = await storage.getBiometricCredential();
  await storage.disableBiometricLogin();
  if (previous?.refreshToken)
    await revokeRefreshToken(previous.refreshToken).catch(() => undefined);
}

export async function updateBiometricSessionAfterPassword(response: AuthResponse) {
  const previous = await storage.getBiometricCredential();
  const next = await storage.refreshBiometricCredentialAfterPassword(
    response.accessToken,
    response.user,
    response.refreshToken,
  );
  if (next && previous?.refreshToken && previous.refreshToken !== next.refreshToken) {
    await revokeRefreshToken(previous.refreshToken).catch(() => undefined);
  }
}

export async function signOutSession() {
  const refresh = await storage.getRefreshToken();
  if (refresh) await revokeRefreshToken(refresh).catch(() => undefined);
  await storage.clearSession();
}
