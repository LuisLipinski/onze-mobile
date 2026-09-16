import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Input, Text, YStack } from 'tamagui';

import { ApiRequestError, FootballMatch, getMatch } from '../src/lib/api';
import { getAccessToken } from '../src/lib/auth-storage';
import { extendMatchSignupDeadline } from '../src/lib/match-minimum-player-decision';

function parseDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
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

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function formatDeadline(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function inputParts(value: string | null, timeZone: string) {
  if (!value) return { date: '', time: '' };
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return {
    date: `${part('day')}/${part('month')}/${part('year')}`,
    time: `${part('hour')}:${part('minute')}`,
  };
}

export default function ExtendMatchSignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const [match, setMatch] = useState<FootballMatch | null>(null);
  const [signupDate, setSignupDate] = useState('');
  const [signupTime, setSignupTime] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentTime, setPaymentTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!params.matchId) {
        setError('Não foi possível identificar a partida.');
        setLoading(false);
        return;
      }
      try {
        const token = await getAccessToken();
        if (!token) { router.replace('/'); return; }
        const loaded = await getMatch(token, params.matchId);
        setMatch(loaded);
        const payment = inputParts(loaded.paymentDeadline, loaded.timeZone);
        setPaymentDate(payment.date);
        setPaymentTime(payment.time);
      } catch (exception) {
        setError(exception instanceof Error ? exception.message : 'Não foi possível carregar a partida.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.matchId, router]);

  async function submit() {
    if (!match || !params.matchId || saving) return;
    setError(null);
    const parsedSignupDate = parseDate(signupDate);
    const parsedSignupTime = parseTime(signupTime);
    if (!parsedSignupDate || !parsedSignupTime) {
      setError('Informe a nova data e hora do prazo de inscrição.');
      return;
    }
    const parsedPaymentDate = match.paymentRequired ? parseDate(paymentDate) : null;
    const parsedPaymentTime = match.paymentRequired ? parseTime(paymentTime) : null;
    if (match.paymentRequired && (!parsedPaymentDate || !parsedPaymentTime)) {
      setError('Revise também a data e hora limite do pagamento.');
      return;
    }

    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) { router.replace('/'); return; }
      await extendMatchSignupDeadline(token, match.id, {
        signupDeadlineDate: parsedSignupDate,
        signupDeadlineTime: parsedSignupTime,
        ...(parsedPaymentDate && parsedPaymentTime ? {
          paymentDeadlineDate: parsedPaymentDate,
          paymentDeadlineTime: parsedPaymentTime,
        } : {}),
      });
      router.back();
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.code === 'PAYMENT_DEADLINE_REVIEW_REQUIRED') {
        setError('O novo prazo de inscrição ultrapassa o prazo de pagamento. Revise também o prazo de pagamento abaixo.');
      } else {
        setError(exception instanceof Error ? exception.message : 'Não foi possível estender o prazo.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <YStack gap="$5" paddingVertical="$3">
          <Button alignSelf="flex-start" backgroundColor="transparent" onPress={() => router.back()}>
            <Text color="$onzeGreen" fontWeight="800">← Voltar</Text>
          </Button>
          <YStack gap="$1">
            <Text color="$onzeGreen" fontSize={13} fontWeight="900">PRAZO DE INSCRIÇÃO</Text>
            <Text color="$onzeInk" fontSize={28} fontWeight="900">Estender prazo</Text>
            <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
              Escolha até quando os jogadores poderão entrar na lista desta ocorrência.
            </Text>
          </YStack>

          {error ? (
            <YStack backgroundColor="#FDECEC" borderRadius="$5" padding="$4">
              <Text color="$onzeDanger" fontSize={13}>{error}</Text>
            </YStack>
          ) : null}

          {loading ? <Text color="$onzeMuted">Carregando...</Text> : null}

          {match ? (
            <>
              <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
                <Text color="$onzeMuted" fontSize={11} fontWeight="900">PRAZO ANTERIOR</Text>
                <Text color="$onzeInk" fontSize={14} fontWeight="800">
                  {formatDeadline(match.signupDeadline, match.timeZone)}
                </Text>
                <Text color="$onzeMuted" fontSize={12}>A alteração vale somente para esta ocorrência.</Text>
              </YStack>

              <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
                <Text color="$onzeInk" fontSize={17} fontWeight="900">Novo prazo de inscrição</Text>
                <Input
                  keyboardType="number-pad"
                  placeholder="DD/MM/AAAA"
                  value={signupDate}
                  onChangeText={(value) => setSignupDate(formatDateInput(value))}
                />
                <Input
                  keyboardType="number-pad"
                  placeholder="HH:MM"
                  value={signupTime}
                  onChangeText={(value) => setSignupTime(formatTimeInput(value))}
                />
              </YStack>

              {match.paymentRequired ? (
                <YStack backgroundColor="#FFF7E6" borderColor="#D8A331" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
                  <Text color="#8A6414" fontSize={16} fontWeight="900">Revise o pagamento</Text>
                  <Text color="$onzeInk" fontSize={12} lineHeight={18}>
                    Como esta partida possui cobrança, o prazo de pagamento não pode ficar antes do novo prazo de inscrição. Confirme ou ajuste os campos abaixo.
                  </Text>
                  <Input
                    keyboardType="number-pad"
                    placeholder="DD/MM/AAAA"
                    value={paymentDate}
                    onChangeText={(value) => setPaymentDate(formatDateInput(value))}
                  />
                  <Input
                    keyboardType="number-pad"
                    placeholder="HH:MM"
                    value={paymentTime}
                    onChangeText={(value) => setPaymentTime(formatTimeInput(value))}
                  />
                </YStack>
              ) : null}

              <Button backgroundColor="$onzeGreen" disabled={saving} height={52} onPress={() => void submit()}>
                <Text color="$onzeSurface" fontWeight="900">
                  {saving ? 'Salvando...' : 'Confirmar novo prazo'}
                </Text>
              </Button>
            </>
          ) : null}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
