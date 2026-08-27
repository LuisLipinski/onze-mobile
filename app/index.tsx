import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>ONZE</Text>
      <Text style={styles.subtitle}>Organizador de Pelada</Text>
      <Text style={styles.status}>P0 — Fundação técnica</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brand: {
    fontSize: 40,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '600',
  },
  status: {
    marginTop: 24,
    fontSize: 14,
  },
});
