import * as SecureStore from 'expo-secure-store';

import type { User } from './api';

const ACCESS_TOKEN_KEY = 'onze.accessToken';
const CURRENT_USER_KEY = 'onze.currentUser';
const LAST_LOGIN_EMAIL_KEY = 'onze.lastLoginEmail';
const BIOMETRIC_LOGIN_KEY = 'onze.biometricLoginEnabled';
const BIOMETRIC_READY_KEY = 'onze.biometricLoginReady';

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
  const currentUser = await getStoredCurrentUser();
  await Promise.all([
    SecureStore.setItemAsync(BIOMETRIC_LOGIN_KEY, '1'),
    SecureStore.setItemAsync(BIOMETRIC_READY_KEY, '1'),
    currentUser ? saveLastLoginEmail(currentUser.email) : Promise.resolve(),
  ]);
}

export async function confirmBiometricLoginAfterPassword() {
  if (await isBiometricLoginEnabled()) {
    await SecureStore.setItemAsync(BIOMETRIC_READY_KEY, '1');
  }
}

export async function disableBiometricLogin() {
  await Promise.all([
    SecureStore.deleteItemAsync(BIOMETRIC_LOGIN_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_READY_KEY),
  ]);
}

export async function isBiometricLoginEnabled() {
  return (await SecureStore.getItemAsync(BIOMETRIC_LOGIN_KEY)) === '1';
}

export async function isBiometricLoginReady() {
  return (
    (await isBiometricLoginEnabled()) &&
    (await SecureStore.getItemAsync(BIOMETRIC_READY_KEY)) === '1'
  );
}

export async function saveSession(accessToken: string, user: User) {
  await Promise.all([saveAccessToken(accessToken), saveCurrentUser(user)]);
}

export function lockSessionForBiometricLogin() {
  return clearCurrentUser();
}

export async function clearSession() {
  await Promise.all([clearAccessToken(), clearCurrentUser()]);
}
