import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable() {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);

  return hasHardware && isEnrolled;
}

export async function authenticateWithBiometrics() {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Entrar no Onze',
    cancelLabel: 'Usar senha',
    disableDeviceFallback: true,
    biometricsSecurityLevel: 'strong',
  });

  return result.success;
}
