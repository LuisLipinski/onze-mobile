import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { getCurrentUser, User } from '../src/lib/api';
import { clearAccessToken, getAccessToken } from '../src/lib/auth-storage';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadUser();
  }, []);

  async function loadUser() {
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      setUser(await getCurrentUser(token));
    } catch (exception) {
      await clearAccessToken();
      setError(exception instanceof Error ? exception.message : 'Sua sessão não pôde ser carregada.');
    }
  }

  async function logout() {
    await clearAccessToken();
    router.replace('/');
  }

  if (!user && !error) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>ONZE</Text>
        {user ? (
          <>
            <Text style={styles.title}>Olá, {user.displayName}</Text>
            <Text style={styles.subtitle}>Sua conta já está conectada à API do Onze.</Text>
          </>
        ) : (
          <Text style={styles.subtitle}>{error}</Text>
        )}

        <Pressable onPress={logout} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Sair</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  brand: { fontSize: 18, fontWeight: '800', marginBottom: 18 },
  title: { fontSize: 30, fontWeight: '800' },
  subtitle: { fontSize: 16, marginTop: 8, lineHeight: 23 },
  secondaryButton: { minHeight: 50, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  secondaryButtonText: { fontSize: 16, fontWeight: '700' },
});
