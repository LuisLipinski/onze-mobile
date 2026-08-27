import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { login } from '../src/lib/api';
import { saveAccessToken } from '../src/lib/auth-storage';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const response = await login(email, password);
      await saveAccessToken(response.accessToken);
      router.replace('/home');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>ONZE</Text>
          <Text style={styles.subtitle}>Organizador de Pelada</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Entrar</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="E-mail"
            style={styles.input}
            value={email}
          />
          <TextInput
            autoComplete="password"
            onChangeText={setPassword}
            placeholder="Senha"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={loading} onPress={submit} style={styles.primaryButton}>
            {loading ? <ActivityIndicator /> : <Text style={styles.primaryButtonText}>Entrar</Text>}
          </Pressable>

          <Text style={styles.helper}>
            Ainda não tem conta?{' '}
            <Link href="/register" style={styles.link}>
              Criar conta
            </Link>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 40 },
  header: { alignItems: 'center' },
  brand: { fontSize: 40, fontWeight: '800' },
  subtitle: { marginTop: 6, fontSize: 17, fontWeight: '600' },
  form: { gap: 14 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  primaryButton: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111111' },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  helper: { textAlign: 'center', marginTop: 4 },
  link: { fontWeight: '700', textDecorationLine: 'underline' },
  error: { fontSize: 14 },
});
