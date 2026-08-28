import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Switch,
} from 'react-native';
import { Button, Input, Text, TextArea, XStack, YStack } from 'tamagui';

import { createMatch } from '../src/lib/api';
import { getAccessToken } from '../src/lib/auth-storage';

const MATCH_TIME_ZONE = 'America/Sao_Paulo';

function defaultDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: MATCH_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function parseDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
}

export default function CreateMatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    groupId?: string;
    groupName?: string;
    venue?: string;
  }>();
  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState('20:00');
  const [venue, setVenue] = useState(params.venue ?? '');
  const [maxPlayers, setMaxPlayers] = useState('14');
  const [notes, setNotes] = useState('');
  const [weekly, setWeekly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (loading) return;
    setError(null);

    const parsedDate = parseDate(date);
    const parsedTime = parseTime(time);
    const parsedMaxPlayers = Number.parseInt(maxPlayers, 10);
    if (!parsedDate) {
      setError('Informe a data no formato DD/MM/AAAA.');
      return;
    }
    if (!parsedTime) {
      setError('Informe o horário no formato HH:MM.');
      return;
    }
    if (!venue.trim()) {
      setError('Informe o local do jogo.');
      return;
    }
    if (!Number.isInteger(parsedMaxPlayers) || parsedMaxPlayers < 2 || parsedMaxPlayers > 100) {
      setError('O limite deve ficar entre 2 e 100 jogadores.');
      return;
    }
    if (!params.groupId) {
      setError('Não foi possível identificar o grupo.');
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const match = await createMatch(token, params.groupId, {
        date: parsedDate,
        startTime: parsedTime,
        timeZone: MATCH_TIME_ZONE,
        venue: venue.trim(),
        maxPlayers: parsedMaxPlayers,
        notes,
        recurrence: weekly ? 'WEEKLY' : 'NONE',
      });
      router.replace({ pathname: '/match', params: { matchId: match.id } });
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível marcar o jogo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <YStack gap="$5" paddingVertical="$3">
            <Button alignSelf="flex-start" backgroundColor="transparent" onPress={() => router.back()}>
              <Text color="$onzeGreen" fontWeight="800">← Voltar</Text>
            </Button>

            <YStack gap="$1">
              <Text color="$onzeGreen" fontSize={13} fontWeight="900">MARCAR JOGO</Text>
              <Text color="$onzeInk" fontSize={29} fontWeight="900">
                {params.groupName || 'Novo jogo'}
              </Text>
              <Text color="$onzeMuted" fontSize={14} lineHeight={20}>
                Defina os dados da partida. Os membros poderão confirmar presença assim que ela for criada.
              </Text>
            </YStack>

            <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$4" padding="$5">
              <XStack gap="$3">
                <Field flex={1} label="DATA">
                  <Input
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeBorder"
                    color="$onzeInk"
                    keyboardType="numeric"
                    maxLength={10}
                    onChangeText={setDate}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="$onzeMuted"
                    value={date}
                  />
                </Field>
                <Field flex={0.7} label="HORÁRIO">
                  <Input
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeBorder"
                    color="$onzeInk"
                    keyboardType="numeric"
                    maxLength={5}
                    onChangeText={setTime}
                    placeholder="20:00"
                    placeholderTextColor="$onzeMuted"
                    value={time}
                  />
                </Field>
              </XStack>

              <Field label="LOCAL / CAMPO">
                <Input
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeBorder"
                  color="$onzeInk"
                  maxLength={255}
                  onChangeText={setVenue}
                  placeholder="Ex.: Arena dos Amigos"
                  placeholderTextColor="$onzeMuted"
                  value={venue}
                />
              </Field>

              <Field label="LIMITE DE JOGADORES">
                <Input
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeBorder"
                  color="$onzeInk"
                  keyboardType="number-pad"
                  maxLength={3}
                  onChangeText={(value) => setMaxPlayers(value.replace(/\D/g, ''))}
                  placeholder="14"
                  placeholderTextColor="$onzeMuted"
                  value={maxPlayers}
                />
              </Field>

              <Field label="OBSERVAÇÕES (OPCIONAL)">
                <TextArea
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeBorder"
                  color="$onzeInk"
                  maxLength={1000}
                  minHeight={96}
                  onChangeText={setNotes}
                  placeholder="Ex.: levar colete, chegar 15 minutos antes..."
                  placeholderTextColor="$onzeMuted"
                  textAlignVertical="top"
                  value={notes}
                />
              </Field>
            </YStack>

            <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
              <XStack alignItems="center" gap="$4" justifyContent="space-between">
                <YStack flex={1} gap="$1">
                  <Text color="$onzeInk" fontSize={17} fontWeight="900">Repetir toda semana</Text>
                  <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                    Mantém o mesmo dia, horário e local nos próximos jogos.
                  </Text>
                </YStack>
                <Switch
                  accessibilityLabel="Repetir jogo toda semana"
                  onValueChange={setWeekly}
                  thumbColor="#FFFFFF"
                  trackColor={{ false: '#C9D2CC', true: '#148A4A' }}
                  value={weekly}
                />
              </XStack>
              {weekly ? (
                <YStack backgroundColor="$onzeCanvas" borderRadius="$4" gap="$1" padding="$4">
                  <Text color="$onzeGreen" fontSize={13} fontWeight="900">Como funciona</Text>
                  <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                    No dia seguinte a cada jogo, às 09:00, a presença da próxima semana será liberada e os membros receberão uma notificação.
                  </Text>
                </YStack>
              ) : null}
            </YStack>

            {error ? <Text color="$onzeDanger" fontSize={13} lineHeight={19}>{error}</Text> : null}

            <Button backgroundColor="$onzeGreen" disabled={loading} height={54} onPress={() => void submit()}>
              <Text color="$onzeSurface" fontSize={16} fontWeight="900">
                {loading ? 'Marcando jogo...' : weekly ? 'Criar jogos semanais' : 'Marcar jogo'}
              </Text>
            </Button>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
  flex,
}: {
  label: string;
  children: React.ReactNode;
  flex?: number;
}) {
  return (
    <YStack flex={flex} gap="$2">
      <Text color="$onzeMuted" fontSize={11} fontWeight="900">{label}</Text>
      {children}
    </YStack>
  );
}
