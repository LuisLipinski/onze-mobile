import type { User } from './api';

export type BiometricAccount = {
  displayName: string;
  email: string;
  userId?: string;
  ready: boolean;
};
export type BiometricCredential = BiometricAccount & {
  refreshToken?: string;
  accessToken?: string;
};
type Store = {
  read: (key: string) => Promise<string | null>;
  write: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

const ACCESS = 'onze.accessToken';
const USER = 'onze.currentUser';
const LAST_EMAIL = 'onze.lastLoginEmail';
const REFRESH = 'onze.refreshToken';
const BIO = 'onze.biometricCredential.v2';
const LEGACY_ENABLED = 'onze.biometricLoginEnabled';
const LEGACY_READY = 'onze.biometricLoginReady';
const LEGACY_ACCESS = 'onze.biometricAccessToken';
const LEGACY_EMAIL = 'onze.biometricAccountEmail';
const LEGACY_NAME = 'onze.biometricAccountName';
const legacyKeys = [LEGACY_ENABLED, LEGACY_READY, LEGACY_ACCESS, LEGACY_EMAIL, LEGACY_NAME];
const normalized = (email: string) => email.trim().toLowerCase();

export class BiometricCredentialChangedError extends Error {
  constructor() {
    super('O vínculo da biometria mudou. Entre novamente na conta desejada.');
    this.name = 'BiometricCredentialChangedError';
  }
}

/** Native storage is supplied by auth-storage; this core can be tested without a phone. */
export function createAuthSessionStorage(store: Store) {
  let mutations: Promise<unknown> = Promise.resolve();
  function mutate<T>(action: () => Promise<T>): Promise<T> {
    const result = mutations.then(action);
    mutations = result.catch(() => undefined);
    return result;
  }

  const getAccessToken = () => store.read(ACCESS);
  const saveAccessToken = (token: string) => store.write(ACCESS, token);
  const clearAccessToken = () => store.remove(ACCESS);
  const getRefreshToken = () => store.read(REFRESH);
  const getLastLoginEmail = () => store.read(LAST_EMAIL);
  const saveLastLoginEmail = (email: string) => store.write(LAST_EMAIL, email.trim());

  async function getStoredCurrentUser(): Promise<User | null> {
    const raw = await store.read(USER);
    if (!raw) return null;
    try {
      const user = JSON.parse(raw) as User;
      if (
        !user ||
        typeof user.id !== 'string' ||
        typeof user.email !== 'string' ||
        typeof user.displayName !== 'string'
      )
        return null;
      return user;
    } catch {
      return null;
    }
  }

  async function saveCurrentUser(user: User) {
    await store.write(USER, JSON.stringify(user));
    await saveLastLoginEmail(user.email);
  }
  const clearCurrentUser = () => store.remove(USER);

  async function clearSession() {
    const results = await Promise.allSettled([
      store.remove(ACCESS),
      store.remove(USER),
      store.remove(REFRESH),
    ]);
    const failed = results.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  }

  async function saveSession(token: string, user: User, refreshToken?: string | null) {
    const previous = await getStoredCurrentUser();
    try {
      await saveAccessToken(token);
      await saveCurrentUser(user);
      if (typeof refreshToken === 'string') await store.write(REFRESH, refreshToken);
      else if (refreshToken === null || previous?.id !== user.id) await store.remove(REFRESH);
    } catch (error) {
      await clearSession().catch(() => undefined);
      throw error;
    }
  }

  async function readBiometric(): Promise<BiometricCredential | null> {
    const raw = await store.read(BIO);
    // A tombstone prevents legacy keys from reviving a disabled binding.
    if (raw === 'disabled') return null;
    if (raw) {
      try {
        const value = JSON.parse(raw) as BiometricCredential;
        if (
          typeof value.email !== 'string' ||
          !value.email.trim() ||
          typeof value.displayName !== 'string' ||
          typeof value.ready !== 'boolean'
        )
          return null;
        if (
          value.ready &&
          (typeof value.refreshToken !== 'string' ||
            !/^[A-Za-z0-9_-]{43}$/.test(value.refreshToken))
        )
          return null;
        return { ...value, email: normalized(value.email) };
      } catch {
        return null;
      }
    }
    const [enabled, ready, accessToken, email, name] = await Promise.all([
      store.read(LEGACY_ENABLED),
      store.read(LEGACY_READY),
      store.read(LEGACY_ACCESS),
      store.read(LEGACY_EMAIL),
      store.read(LEGACY_NAME),
    ]);
    if (enabled !== '1' || ready !== '1') return null;
    const current = await getStoredCurrentUser();
    if (accessToken && email) {
      return {
        accessToken,
        email: normalized(email),
        ready: true,
        displayName:
          name?.trim() ||
          (current && normalized(current.email) === normalized(email) ? current.displayName : ''),
        userId: current && normalized(current.email) === normalized(email) ? current.id : undefined,
      };
    }
    // Bind the oldest global-flags format before another account logs in.
    const [token, lastEmail] = await Promise.all([getAccessToken(), getLastLoginEmail()]);
    if (!token || !current || (lastEmail && normalized(lastEmail) !== normalized(current.email)))
      return null;
    await store.write(LEGACY_ACCESS, token);
    await store.write(LEGACY_EMAIL, normalized(current.email));
    await store.write(LEGACY_NAME, current.displayName);
    return {
      accessToken: token,
      displayName: current.displayName,
      email: normalized(current.email),
      userId: current.id,
      ready: true,
    };
  }

  async function getBiometricCredential() {
    await mutations;
    const credential = await readBiometric();
    return credential?.ready ? credential : null;
  }

  async function getBiometricAccount(): Promise<BiometricAccount | null> {
    await mutations;
    const value = await readBiometric();
    if (!value) return null;
    const { email, displayName, userId, ready } = value;
    return { email, displayName, userId, ready };
  }

  async function cleanupLegacy() {
    await Promise.allSettled(legacyKeys.map((key) => store.remove(key)));
  }

  async function writeCredential(refreshToken: string, user: User) {
    if (!refreshToken || !/^[A-Za-z0-9_-]{43}$/.test(refreshToken))
      throw new Error('Não foi possível salvar a renovação da sessão. Entre novamente.');
    const value: BiometricCredential = {
      refreshToken,
      email: normalized(user.email),
      displayName: user.displayName.trim(),
      userId: user.id,
      ready: true,
    };
    await store.write(BIO, JSON.stringify(value));
    await cleanupLegacy();
    return value;
  }

  function enableBiometricLogin() {
    return mutate(async () => {
      const [token, user, refresh] = await Promise.all([
        getAccessToken(),
        getStoredCurrentUser(),
        getRefreshToken(),
      ]);
      if (!token || !user || !refresh)
        throw new Error('Entre na sua conta para ativar a renovação por biometria.');
      const credential = await writeCredential(refresh, user);
      await store.remove(REFRESH);
      return credential;
    });
  }

  function disableBiometricLogin() {
    return mutate(async () => {
      await store.write(BIO, 'disabled');
      await cleanupLegacy();
    });
  }

  function invalidateBiometricCredential(expected?: BiometricCredential) {
    return mutate(async () => {
      const current = await readBiometric();
      if (!current) return;
      if (
        expected &&
        (normalized(current.email) !== normalized(expected.email) ||
          (current.refreshToken ?? current.accessToken) !==
            (expected.refreshToken ?? expected.accessToken))
      )
        return;
      const { email, displayName, userId } = current;
      await store.write(BIO, JSON.stringify({ email, displayName, userId, ready: false }));
      await cleanupLegacy();
    });
  }

  function saveRenewedBiometricCredential(
    previous: BiometricCredential,
    refreshToken: string,
    user: User,
  ) {
    return mutate(async () => {
      const current = await readBiometric();
      if (
        !current?.ready ||
        normalized(current.email) !== normalized(previous.email) ||
        (current.refreshToken ?? current.accessToken) !==
          (previous.refreshToken ?? previous.accessToken) ||
        normalized(user.email) !== normalized(current.email) ||
        (current.userId && current.userId !== user.id)
      ) {
        throw new BiometricCredentialChangedError();
      }
      return writeCredential(refreshToken, user);
    });
  }

  function refreshBiometricCredentialAfterPassword(
    accessToken: string,
    user: User,
    refreshToken: string,
  ) {
    return mutate(async () => {
      const account = await readBiometric();
      if (
        !account ||
        normalized(account.email) !== normalized(user.email) ||
        (account.userId && account.userId !== user.id)
      )
        return null;
      if (!accessToken) throw new Error('Entre novamente para atualizar a biometria.');
      const next = await writeCredential(refreshToken, user);
      await store.remove(REFRESH);
      return next;
    });
  }

  function saveBiometricAccountProfile(user: User) {
    return mutate(async () => {
      const account = await readBiometric();
      if (
        !account ||
        normalized(account.email) !== normalized(user.email) ||
        (account.userId && account.userId !== user.id)
      )
        return account;
      const updated = { ...account, displayName: user.displayName.trim(), userId: user.id };
      if (account.refreshToken || !account.ready) await store.write(BIO, JSON.stringify(updated));
      else await store.write(LEGACY_NAME, updated.displayName);
      return updated;
    });
  }

  return {
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
    isBiometricLoginEnabled: async () => Boolean(await getBiometricAccount()),
    isBiometricLoginReady: async () => Boolean(await getBiometricCredential()),
    isBiometricLoginEnabledFor: async (email: string) => {
      const account = await getBiometricAccount();
      return Boolean(account && normalized(account.email) === normalized(email));
    },
  };
}
