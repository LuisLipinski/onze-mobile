import * as SecureStore from 'expo-secure-store';

import type { User } from './api';

const ACCESS_TOKEN_KEY = 'onze.accessToken';
const CURRENT_USER_KEY = 'onze.currentUser';
const BIOMETRIC_LOGIN_KEY = 'onze.biometricLoginEnabled';

export function saveAccessToken(accessToken: string) {
  return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
}

export function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export function clearAccessToken() {
  return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export function saveCurrentUser(user: User) {
  return SecureStore.setItemAsync(CURRENT_USER_KEY, JSON.stringify(user));
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

export function enableBiometricLogin() {
  return SecureStore.setItemAsync(BIOMETRIC_LOGIN_KEY, '1');
}

export function disableBiometricLogin() {
  return SecureStore.deleteItemAsync(BIOMETRIC_LOGIN_KEY);
}

export async function isBiometricLoginEnabled() {
  return (await SecureStore.getItemAsync(BIOMETRIC_LOGIN_KEY)) === '1';
}

export async function saveSession(accessToken: string, user: User) {
  await Promise.all([saveAccessToken(accessToken), saveCurrentUser(user)]);
}

export async function clearSession() {
  await Promise.all([clearAccessToken(), clearCurrentUser(), disableBiometricLogin()]);
}
