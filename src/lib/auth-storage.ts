import * as SecureStore from 'expo-secure-store';

import type { User } from './api';

const ACCESS_TOKEN_KEY = 'onze.accessToken';
const CURRENT_USER_KEY = 'onze.currentUser';
const LAST_LOGIN_EMAIL_KEY = 'onze.lastLoginEmail';
const BIOMETRIC_LOGIN_KEY = 'onze.biometricLoginEnabled';
const BIOMETRIC_READY_KEY = 'onze.biometricLoginReady';
const BIOMETRIC_ACCESS_TOKEN_KEY = 'onze.biometricAccessToken';
const BIOMETRIC_ACCOUNT_EMAIL_KEY = 'onze.biometricAccountEmail';
const BIOMETRIC_ACCOUNT_NAME_KEY = 'onze.biometricAccountName';

export type BiometricCredential = {
  accessToken: string;
  displayName: string;
  email: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function saveBiometricCredential(
  accessToken: string,
  email: string,
  displayName: string,
) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedDisplayName = displayName.trim();
  await Promise.all([
    SecureStore.setItemAsync(BIOMETRIC_LOGIN_KEY, '1'),
    SecureStore.setItemAsync(BIOMETRIC_READY_KEY, '1'),
    SecureStore.setItemAsync(BIOMETRIC_ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(BIOMETRIC_ACCOUNT_EMAIL_KEY, normalizedEmail),
    normalizedDisplayName
      ? SecureStore.setItemAsync(BIOMETRIC_ACCOUNT_NAME_KEY, normalizedDisplayName)
      : SecureStore.deleteItemAsync(BIOMETRIC_ACCOUNT_NAME_KEY),
    saveLastLoginEmail(email),
  ]);

  return {
    accessToken,
    displayName: normalizedDisplayName,
    email: normalizedEmail,
  } satisfies BiometricCredential;
}

export function saveAccessToken(accessToken: string) {
  return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
}

export function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export function clearAccessToken() {
  return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export async function saveCurrentUser(user: User) {
  await Promise.all([
    SecureStore.setItemAsync(CURRENT_USER_KEY, JSON.stringify(user)),
    saveLastLoginEmail(user.email),
  ]);
}

export async function getStoredCurrentUser(): Promise<User | null> {
  const value = await SecureStore.getItemAsync(CURRENT_USER_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as User;
  } catch {
    await SecureStore.deleteItemAsync(CURRENT_USER_KEY);
    return null;
  }
}

export function clearCurrentUser() {
  return SecureStore.deleteItemAsync(CURRENT_USER_KEY);
}

export function saveLastLoginEmail(email: string) {
  return SecureStore.setItemAsync(LAST_LOGIN_EMAIL_KEY, email.trim());
}

export function getLastLoginEmail() {
  return SecureStore.getItemAsync(LAST_LOGIN_EMAIL_KEY);
}

export async function enableBiometricLogin() {
  const [accessToken, currentUser] = await Promise.all([
    getAccessToken(),
    getStoredCurrentUser(),
  ]);
  if (!accessToken || !currentUser) {
    throw new Error('Entre na sua conta antes de ativar a biometria.');
  }

  return saveBiometricCredential(accessToken, currentUser.email, currentUser.displayName);
}

export async function getBiometricCredential(): Promise<BiometricCredential | null> {
  const [enabled, ready, accessToken, accountEmail, accountName] = await Promise.all([
    SecureStore.getItemAsync(BIOMETRIC_LOGIN_KEY),
    SecureStore.getItemAsync(BIOMETRIC_READY_KEY),
    SecureStore.getItemAsync(BIOMETRIC_ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(BIOMETRIC_ACCOUNT_EMAIL_KEY),
    SecureStore.getItemAsync(BIOMETRIC_ACCOUNT_NAME_KEY),
  ]);

  if (enabled !== '1' || ready !== '1') return null;

  if (accessToken && accountEmail) {
    const normalizedAccountEmail = normalizeEmail(accountEmail);
    let displayName = accountName?.trim() ?? '';

    if (!displayName) {
      const currentUser = await getStoredCurrentUser();
      if (currentUser && normalizeEmail(currentUser.email) === normalizedAccountEmail) {
        displayName = currentUser.displayName.trim();
        if (displayName) {
          await SecureStore.setItemAsync(BIOMETRIC_ACCOUNT_NAME_KEY, displayName);
        }
      }
    }

    return { accessToken, displayName, email: normalizedAccountEmail };
  }

  // Migra a configuração criada pelas versões anteriores, que reutilizavam
  // incorretamente a sessão ativa como credencial biométrica global.
  const [legacyAccessToken, currentUser, lastLoginEmail] = await Promise.all([
    getAccessToken(),
    getStoredCurrentUser(),
    getLastLoginEmail(),
  ]);
  const legacyEmail = currentUser?.email ?? lastLoginEmail;
  if (!legacyAccessToken || !legacyEmail) return null;

  return saveBiometricCredential(
    legacyAccessToken,
    legacyEmail,
    currentUser?.displayName ?? '',
  );
}

export async function refreshBiometricCredentialAfterPassword(
  accessToken: string,
  user: User,
) {
  const credential = await getBiometricCredential();
  if (credential && normalizeEmail(credential.email) === normalizeEmail(user.email)) {
    await saveBiometricCredential(accessToken, user.email, user.displayName);
  }
}

export async function saveBiometricAccountProfile(user: User) {
  const credential = await getBiometricCredential();
  if (!credential || normalizeEmail(credential.email) !== normalizeEmail(user.email)) {
    return credential;
  }

  return saveBiometricCredential(credential.accessToken, user.email, user.displayName);
}

export async function disableBiometricLogin() {
  await Promise.all([
    SecureStore.deleteItemAsync(BIOMETRIC_LOGIN_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_READY_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_ACCOUNT_EMAIL_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_ACCOUNT_NAME_KEY),
  ]);
}

export async function isBiometricLoginEnabled() {
  return Boolean(await getBiometricCredential());
}

export async function isBiometricLoginReady() {
  return Boolean(await getBiometricCredential());
}

export async function isBiometricLoginEnabledFor(email: string) {
  const credential = await getBiometricCredential();
  return Boolean(credential && normalizeEmail(credential.email) === normalizeEmail(email));
}

export async function saveSession(accessToken: string, user: User) {
  await Promise.all([saveAccessToken(accessToken), saveCurrentUser(user)]);
}

export async function clearSession() {
  await Promise.all([clearAccessToken(), clearCurrentUser()]);
}
