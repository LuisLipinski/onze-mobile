import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { ApiRequestError, getCurrentUser, User } from '../src/lib/api';
import {
  clearSession,
  getAccessToken,
  getStoredCurrentUser,
  saveCurrentUser,
} from '../src/lib/auth-storage';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadUser();
  }, []);

  async function loadUser() {
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
          </>
        )}

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
  secondaryButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#DDE6E1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: { color: '#10231A', fontSize: 16, fontWeight: '700' },
});
