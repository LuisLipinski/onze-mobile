import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { ApiRequestError, getCurrentUser, User } from '../src/lib/api';
import {
  clearSession,
  disableBiometricLogin,
  enableBiometricLogin,
  getAccessToken,
  getStoredCurrentUser,
  isBiometricLoginEnabled,
  saveCurrentUser,
} from '../src/lib/auth-storage';
import { authenticateWithBiometrics, isBiometricAvailable } from '../src/lib/biometrics';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState<string | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    void loadUser();
    void loadBiometricState();
  }, []);

  async function loadBiometricState() {
    try {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      setBiometricEnabled(available && (await isBiometricLoginEnabled()));
    } catch {
      setBiometricAvailable(false);
      setBiometricEnabled(false);
    }
  }

  async function loadUser() {
    setError(null);

    try {
      const storedUser = await getStoredCurrentUser();
      if (storedUser) {
        setUser(storedUser);
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const currentUser = await getCurrentUser(token);
      await saveCurrentUser(currentUser);
      setUser(currentUser);
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }

      setError(
        exception instanceof Error ? exception.message : 'Sua sessão não pôde ser carregada.',
      );
    }
  }

  async function activateBiometricLogin() {
    if (biometricLoading) return;
    setBiometricMessage(null);
    setBiometricLoading(true);

    try {
      if (!(await isBiometricAvailable())) {
        setBiometricAvailable(false);
        setBiometricMessage('Não encontramos uma biometria cadastrada neste aparelho.');
        return;
      }

      if (!(await authenticateWithBiometrics())) {
        setBiometricMessage('Biometria não confirmada. A opção continua desativada.');
        return;
      }

      await enableBiometricLogin();
      setBiometricEnabled(true);
      setBiometricMessage('Login com biometria ativado.');
    } catch (exception) {
      setBiometricMessage(
        exception instanceof Error
          ? exception.message
          : 'Não foi possível ativar o login com biometria.',
      );
    } finally {
      setBiometricLoading(false);
    }
  }

  async function deactivateBiometricLogin() {
    await disableBiometricLogin();
    setBiometricEnabled(false);
    setBiometricMessage('Login com biometria desativado.');
  }

  async function logout() {
    await clearSession();
    router.replace('/');
  }

  if (!user && !error) {
    return (
      <ServerLoadingScreen
        title="Carregando o Onze..."
        message="Estamos preparando sua sessão."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>ONZE</Text>
        {user ? (
          <>
            <Text style={styles.title}>Olá, {user.displayName}</Text>
            <Text style={styles.subtitle}>Sua conta está conectada à API do Onze.</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Não foi possível carregar sua sessão</Text>
            <Text style={styles.subtitle}>{error}</Text>
            <Pressable onPress={() => void loadUser()} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Tentar novamente</Text>
            </Pressable>
          </>
        )}

        {user && biometricAvailable ? (
          <View style={styles.biometricCard}>
            <Text style={styles.biometricTitle}>Login com biometria</Text>
            <Text style={styles.biometricDescription}>
              {biometricEnabled
                ? 'Ativado neste aparelho. Na próxima abertura você poderá entrar com sua biometria.'
                : 'Use a biometria cadastrada no aparelho para entrar sem digitar sua senha.'}
            </Text>

            <Pressable
              onPress={() =>
                void (biometricEnabled ? deactivateBiometricLogin() : activateBiometricLogin())
              }
              style={styles.biometricButton}
            >
              <Text style={styles.biometricButtonText}>
                {biometricLoading
                  ? 'Validando...'
                  : biometricEnabled
                    ? 'Desativar biometria'
                    : 'Ativar login com biometria'}
              </Text>
            </Pressable>

            {biometricMessage ? (
              <Text style={styles.biometricMessage}>{biometricMessage}</Text>
            ) : null}
          </View>
        ) : null}

        <Pressable onPress={logout} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Sair</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F5' },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  brand: { color: '#148A4A', fontSize: 18, fontWeight: '800', marginBottom: 18 },
  title: { color: '#10231A', fontSize: 30, fontWeight: '800' },
  subtitle: { color: '#65756D', fontSize: 16, marginTop: 8, lineHeight: 23 },
  primaryButton: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    backgroundColor: '#148A4A',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  biometricCard: {
    marginTop: 28,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDE6E1',
    backgroundColor: '#FFFFFF',
  },
  biometricTitle: { color: '#10231A', fontSize: 17, fontWeight: '800' },
  biometricDescription: { color: '#65756D', fontSize: 14, lineHeight: 20, marginTop: 6 },
  biometricButton: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#148A4A',
    backgroundColor: '#FFFFFF',
  },
  biometricButtonText: { color: '#148A4A', fontSize: 14, fontWeight: '700' },
  biometricMessage: { color: '#65756D', fontSize: 13, lineHeight: 18, marginTop: 10 },
  secondaryButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#DDE6E1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: { color: '#10231A', fontSize: 16, fontWeight: '700' },
});
