import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Input, Text, YStack } from 'tamagui';

import { ONZE_COLORS } from '../src/theme/colors';

import { getErrorMessage } from '../src/lib/errors';

import { AppButton } from '../src/components/app-button';

import { ApiRequestError, FootballMatch, getMatch } from '../src/lib/api';
import { getAccessToken } from '../src/lib/auth-storage';
import {
  dateTimeInputParts,
  formatDateInput,
  formatDateTime,
  formatTimeInput,
  parseBrazilianDate,
  parseTime,
} from '../src/lib/date-format';
import { extendMatchSignupDeadline } from '../src/lib/match-minimum-player-decision';

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
        setError('Não foi possível identificar o jogo.');
        setLoading(false);
        return;
      }
      try {
        const token = await getAccessToken();
        if (!token) { router.replace('/'); return; }
        const loaded = await getMatch(token, params.matchId);
        setMatch(loaded);
        const payment = dateTimeInputParts(loaded.paymentDeadline, loaded.timeZone);
        setPaymentDate(payment.date);
        setPaymentTime(payment.time);
      } catch (exception) {
        setError(getErrorMessage(exception, 'Não foi possível carregar o jogo.'));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.matchId, router]);

  async function submit() {
    if (!match || !params.matchId || saving) return;
    setError(null);
    const parsedSignupDate = parseBrazilianDate(signupDate);
    const parsedSignupTime = parseTime(signupTime);
    if (!parsedSignupDate || !parsedSignupTime) {
      setError('Informe a nova data e hora do prazo de inscrição.');
      return;
    }
    const parsedPaymentDate = match.paymentRequired ? parseBrazilianDate(paymentDate) : null;
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
        setError(getErrorMessage(exception, 'Não foi possível estender o prazo.'));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <YStack gap="$5" paddingVertical="$3">
          <AppButton alignSelf="flex-start" variant="ghost" onPress={() => router.back()}>
            <Text color="$onzeGreen" fontWeight="800">← Voltar</Text>
          </AppButton>
          <YStack gap="$1">
            <Text color="$onzeGreen" fontSize={13} fontWeight="900">PRAZO DE INSCRIÇÃO</Text>
            <Text color="$onzeInk" fontSize={28} fontWeight="900">Estender prazo</Text>
            <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
              Escolha até quando os jogadores poderão entrar na lista desta ocorrência.
            </Text>
          </YStack>

          {error ? (
            <YStack backgroundColor="$onzeDangerBg" borderRadius="$5" padding="$4">
              <Text color="$onzeDanger" fontSize={13}>{error}</Text>
            </YStack>
          ) : null}

          {loading ? <Text color="$onzeMuted">Carregando...</Text> : null}

          {match ? (
            <>
              <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
                <Text color="$onzeMuted" fontSize={11} fontWeight="900">PRAZO ANTERIOR</Text>
                <Text color="$onzeInk" fontSize={14} fontWeight="800">
                  {formatDateTime(match.signupDeadline, match.timeZone)}
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
                <YStack backgroundColor="$onzeWarningBg" borderColor="$onzeWarningBorder" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
                  <Text color="$onzeWarningText" fontSize={16} fontWeight="900">Revise o pagamento</Text>
                  <Text color="$onzeInk" fontSize={12} lineHeight={18}>
                    Como este jogo possui cobrança, o prazo de pagamento não pode ficar antes do novo prazo de inscrição. Confirme ou ajuste os campos abaixo.
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

              <AppButton variant="primary" disabled={saving}  onPress={() => void submit()}>
                <Text color="$onzeSurface" fontWeight="900">
                  {saving ? 'Salvando...' : 'Confirmar novo prazo'}
                </Text>
              </AppButton>
            </>
          ) : null}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
