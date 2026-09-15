import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Input, Text, XStack, YStack } from 'tamagui';

import {
  FootballMatch,
  getMatch,
  MatchModality,
  updateMatchPlayerConfiguration,
} from '../src/lib/api';
import { getAccessToken } from '../src/lib/auth-storage';
import {
  idealPlayers,
  MATCH_MODALITY_OPTIONS,
  minimumPlayersValidationError,
} from '../src/lib/match-modality';

export default function EditMatchPlayerConfigScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const [match, setMatch] = useState<FootballMatch | null>(null);
  const [modality, setModality] = useState<MatchModality>('FUT7');
  const [minimumPlayers, setMinimumPlayers] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.matchId) {
      setError('Não foi possível identificar a partida.');
      return;
    }
    void getAccessToken().then(async (token) => {
      if (!token) {
        router.replace('/');
        return;
      }
      const loaded = await getMatch(token, params.matchId!);
      setMatch(loaded);
      setModality(loaded.modality);
      setMinimumPlayers(String(loaded.minimumPlayers));
    }).catch((exception) => {
      setError(exception instanceof Error ? exception.message : 'Não foi possível carregar a partida.');
    });
  }, [params.matchId, router]);

  async function submit() {
    if (!params.matchId || !match || saving) return;
    const parsedMinimum = Number.parseInt(minimumPlayers, 10);
    const validation = minimumPlayersValidationError(parsedMinimum, match.maxPlayers);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      await updateMatchPlayerConfiguration(token, params.matchId, modality, parsedMinimum);
      router.back();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  const suggestedIdeal = match
    ? idealPlayers(modality, match.matchType, match.teamCount)
    : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <YStack gap="$5" paddingVertical="$3">
          <Button alignSelf="flex-start" backgroundColor="transparent" onPress={() => router.back()}>
            <Text color="$onzeGreen" fontWeight="800">← Voltar</Text>
          </Button>
          <YStack gap="$1">
            <Text color="$onzeGreen" fontSize={13} fontWeight="900">CONFIGURAÇÃO DE JOGADORES</Text>
            <Text color="$onzeInk" fontSize={28} fontWeight="900">Modalidade e mínimo</Text>
          </YStack>
          <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$4" padding="$5">
            <Text color="$onzeMuted" fontSize={11} fontWeight="900">MODALIDADE *</Text>
            <YStack gap="$2">
              {MATCH_MODALITY_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  backgroundColor={modality === option.value ? '#EAF7EF' : '$onzeSurface'}
                  borderColor={modality === option.value ? '$onzeGreen' : '$onzeBorder'}
                  borderWidth={modality === option.value ? 2 : 1}
                  justifyContent="flex-start"
                  onPress={() => setModality(option.value)}
                >
                  <Text color="$onzeInk" fontWeight="800">
                    {modality === option.value ? '✓ ' : ''}{option.label}
                  </Text>
                </Button>
              ))}
            </YStack>
            <YStack gap="$2">
              <Text color="$onzeMuted" fontSize={11} fontWeight="900">QUANTIDADE MÍNIMA *</Text>
              <Input
                backgroundColor="$onzeSurface"
                borderColor="$onzeBorder"
                color="$onzeInk"
                inputMode="numeric"
                onChangeText={(value) => setMinimumPlayers(value.replace(/\D/g, '').slice(0, 3))}
                value={minimumPlayers}
              />
              <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                Ideal para esta configuração: {suggestedIdeal}. O mínimo pode ser menor, mas nunca ultrapassar {match?.maxPlayers ?? 'o limite'}.
              </Text>
            </YStack>
          </YStack>
          {error ? <Text color="$onzeDanger" fontSize={13}>{error}</Text> : null}
          <Button backgroundColor="$onzeGreen" disabled={!match || saving} height={54} onPress={() => void submit()}>
            <Text color="$onzeSurface" fontWeight="900">{saving ? 'Salvando...' : 'Salvar configuração'}</Text>
          </Button>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
