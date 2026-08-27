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

import { register } from '../src/lib/api';
import { saveAccessToken } from '../src/lib/auth-storage';

export default function RegisterScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const response = await register(displayName, email, password);
      await saveAccessToken(response.accessToken);
      router.replace('/home');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Criar conta</Text>
        <TextInput
          autoCapitalize="words"
          onChangeText={setDisplayName}
          placeholder="Seu nome"
          style={styles.input}
          value={displayName}
        />
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
          autoComplete="new-password"
          onChangeText={setPassword}
          placeholder="Senha (mínimo 8 caracteres)"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable disabled={loading} onPress={submit} style={styles.primaryButton}>
          {loading ? <ActivityIndicator /> : <Text style={styles.primaryButtonText}>Criar conta</Text>}
        </Pressable>

        <Text style={styles.helper}>
          Já tem conta?{' '}
          <Link href="/" style={styles.link}>
            Entrar
          </Link>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 14 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  primaryButton: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111111', marginTop: 4 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  helper: { textAlign: 'center', marginTop: 4 },
  link: { fontWeight: '700', textDecorationLine: 'underline' },
  error: { fontSize: 14 },
});
