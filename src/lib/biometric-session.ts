import type { AuthResponse, User } from './api';
import type { BiometricCredential } from './auth-session-storage';

type Reason = 'unavailable' | 'missing' | 'account' | 'expired' | 'storage' | 'changed';
export class BiometricSessionError extends Error {
  reason: Reason;
  requiresPassword: boolean;
  constructor(reason: Reason, message: string, requiresPassword = true) {
    super(message);
    this.reason = reason;
    this.requiresPassword = requiresPassword;
  }
}

type Access = {
  available: () => Promise<boolean>;
  authenticate: () => Promise<boolean>;
  read: () => Promise<BiometricCredential | null>;
  renew: (refreshToken: string) => Promise<AuthResponse>;
  migrate: (accessToken: string) => Promise<AuthResponse>;
  saveCredential: (previous: BiometricCredential, response: AuthResponse) => Promise<unknown>;
  saveSession: (accessToken: string, user: User, refreshToken: null) => Promise<void>;
  invalidate: (expected: BiometricCredential) => Promise<void>;
  clearSession: (email: string) => Promise<void>;
  revoke: (refreshToken: string) => Promise<void>;
};
const normalized = (email: string) => email.trim().toLowerCase();
const unauthorized = (error: unknown) =>
  Boolean(error && typeof error === 'object' && 'status' in error && error.status === 401);

/** One fingerprint confirmation and one rotation, even if the button fires twice. */
export function createBiometricSignIn(access: Access) {
  let pending: Promise<User | null> | undefined;
  let pendingEmail = '';
  return function signIn(email: string): Promise<User | null> {
    const expectedEmail = normalized(email);
    if (pending) {
      if (pendingEmail === expectedEmail) return pending;
      return Promise.reject(
        new BiometricSessionError('account', 'Use sua senha para entrar em outra conta.'),
      );
    }
    pendingEmail = expectedEmail;
    pending = (async () => {
      if (!(await access.available())) {
        throw new BiometricSessionError(
          'unavailable',
          'A biometria não está disponível. Entre com e-mail e senha.',
        );
      }
      if (!(await access.authenticate())) return null;
      const credential = await access.read();
      if (!credential) {
        throw new BiometricSessionError(
          'missing',
          'Entre uma vez com e-mail e senha para atualizar seu acesso por biometria.',
        );
      }
      if (normalized(credential.email) !== expectedEmail) {
        throw new BiometricSessionError(
          'account',
          'A biometria só pode entrar na conta à qual foi vinculada.',
        );
      }

      let response: AuthResponse;
      try {
        response = credential.refreshToken
          ? await access.renew(credential.refreshToken)
          : credential.accessToken
            ? await access.migrate(credential.accessToken)
            : (() => {
                throw new BiometricSessionError(
                  'missing',
                  'Entre novamente para atualizar seu acesso por biometria.',
                );
              })();
      } catch (error) {
        if (unauthorized(error)) {
          await Promise.allSettled([
            access.invalidate(credential),
            access.clearSession(expectedEmail),
          ]);
          throw new BiometricSessionError(
            'expired',
            'Para atualizar seu acesso, entre uma vez com e-mail e senha. Depois, você poderá continuar usando a digital.',
          );
        }
        // A temporary network/server failure keeps the biometric button usable.
        throw error;
      }

      if (
        !response.user ||
        typeof response.user.id !== 'string' ||
        typeof response.user.email !== 'string' ||
        normalized(response.user.email) !== expectedEmail ||
        (credential.userId && credential.userId !== response.user.id)
      ) {
        await Promise.allSettled([
          access.invalidate(credential),
          access.clearSession(expectedEmail),
        ]);
        throw new BiometricSessionError(
          'account',
          'O vínculo da biometria não corresponde a esta conta. Entre novamente com sua senha.',
        );
      }
      try {
        // Persist the replacement first: the previous refresh token is consumed.
        await access.saveCredential(credential, response);
      } catch (error) {
        await access.revoke(response.refreshToken).catch(() => undefined);
        if (error instanceof Error && error.name === 'BiometricCredentialChangedError') {
          throw new BiometricSessionError('changed', error.message);
        }
        await Promise.allSettled([
          access.invalidate(credential),
          access.clearSession(expectedEmail),
        ]);
        throw new BiometricSessionError(
          'storage',
          'Não foi possível salvar seu acesso neste aparelho. Entre com e-mail e senha.',
        );
      }
      await access.saveSession(response.accessToken, response.user, null);
      return response.user;
    })().finally(() => {
      pending = undefined;
      pendingEmail = '';
    });
    return pending;
  };
}
