import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Text, XStack, YStack } from 'tamagui';

import type { FootballMatch, LiveMatchState, MatchPeriodType } from '../lib/api';
import {
  activeMatchPeriod,
  formatMatchTimer,
  periodClock,
  periodLabel,
} from '../lib/live-match';
import { AppButton } from './app-button';

type Props = {
  match: FootballMatch;
  state: LiveMatchState;
  busy: boolean;
  onSetAddedTime: (minutes: number) => Promise<boolean>;
  onFinishPeriod: () => Promise<void>;
  onStartNextPeriod: () => Promise<void>;
};

function scoresAreTied(state: LiveMatchState) {
  return state.scores.length === 2 && state.scores[0].score === state.scores[1].score;
}

function nextPeriod(match: FootballMatch, state: LiveMatchState) {
  const regulationCount = state.periods.filter(
    (period) => period.periodType === 'REGULATION',
  ).length;
  if (regulationCount < (match.periodCount ?? 0)) {
    return { type: 'REGULATION' as MatchPeriodType, number: regulationCount + 1 };
  }

  const overtimeCount = state.periods.filter(
    (period) => period.periodType === 'OVERTIME',
  ).length;
  if (scoresAreTied(state)
      && match.overtimeEnabled
      && overtimeCount < (match.overtimePeriodCount ?? 0)) {
    return { type: 'OVERTIME' as MatchPeriodType, number: overtimeCount + 1 };
  }
  return null;
}

function hasStageAfterCurrent(match: FootballMatch, state: LiveMatchState) {
  const current = activeMatchPeriod(state);
  if (!current) return false;
  const tied = scoresAreTied(state);
  if (current.periodType === 'REGULATION') {
    if (current.periodNumber < (match.periodCount ?? 0)) return true;
    return tied && (match.overtimeEnabled || match.penaltyShootoutEnabled);
  }
  if (current.periodNumber < (match.overtimePeriodCount ?? 0)) return true;
  return tied && match.penaltyShootoutEnabled;
}

export function MatchPeriodControls({
  match,
  state,
  busy,
  onSetAddedTime,
  onFinishPeriod,
  onStartNextPeriod,
}: Props) {
  const insets = useSafeAreaInsets();
  const [nowMs, setNowMs] = useState(Date.now());
  const [addedTimeVisible, setAddedTimeVisible] = useState(false);
  const [addedTimeText, setAddedTimeText] = useState('0');
  const [validationError, setValidationError] = useState<string | null>(null);
  const current = activeMatchPeriod(state);
  const hasActivePeriod = current != null;
  const upcoming = useMemo(() => nextPeriod(match, state), [match, state]);
  const clock = current ? periodClock(current, nowMs) : null;

  useEffect(() => {
    setNowMs(Date.now());
    if (!hasActivePeriod) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [hasActivePeriod, current?.id, current?.endedAt]);

  if (!match.periodsEnabled || state.status !== 'IN_PROGRESS'
      || state.phase === 'PENALTY_SHOOTOUT') return null;

  const openAddedTime = () => {
    setAddedTimeText(String(current?.addedTimeMinutes ?? 0));
    setValidationError(null);
    setAddedTimeVisible(true);
  };

  const saveAddedTime = async () => {
    const minutes = Number(addedTimeText);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 180) {
      setValidationError('Informe um número inteiro entre 0 e 180 minutos.');
      return;
    }
    if (await onSetAddedTime(minutes)) {
      setAddedTimeVisible(false);
    } else {
      setValidationError('Não foi possível salvar os acréscimos. Tente novamente.');
    }
  };

  const finishLabel = current && hasStageAfterCurrent(match, state)
    ? `Encerrar ${periodLabel(current)}`
    : 'Encerrar jogo';

  return (
    <>
      <YStack
        backgroundColor="$onzeSurface"
        borderColor="$onzeBorder"
        borderRadius="$6"
        borderWidth={1}
        gap="$4"
        padding="$4"
      >
        <YStack gap="$1">
          <Text color="$onzeInk" fontSize={17} fontWeight="900">Controle dos tempos</Text>
          <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
            {current
              ? `${periodLabel(current)} em andamento.`
              : upcoming
                ? 'O cronômetro está parado no intervalo.'
                : 'Todos os tempos configurados foram concluídos.'}
          </Text>
        </YStack>

        {current && clock ? (
          <YStack gap="$3">
            <YStack backgroundColor="$onzeInfoBg" borderRadius="$4" gap="$1" padding="$3">
              <Text color="$onzeInk" fontWeight="900">
                Duração: {current.durationMinutes} min
              </Text>
              <Text color="$onzeMuted" fontSize={12}>
                Acréscimos definidos: {current.addedTimeMinutes ?? 0} min
              </Text>
              {!clock.canFinish ? (
                <Text color="$onzeMuted" fontSize={12}>
                  O encerramento será liberado em{' '}
                  {formatMatchTimer(
                    current.durationMinutes * 60
                      + (current.addedTimeMinutes ?? 0) * 60
                      - clock.elapsedSeconds,
                  )}.
                </Text>
              ) : (
                <Text color="$onzeGreen" fontSize={12} fontWeight="900">
                  O tempo pode ser encerrado. O cronômetro continuará até a confirmação.
                </Text>
              )}
            </YStack>

            {state.canManage ? (
              <YStack gap="$2">
                <AppButton variant="outline" disabled={busy} onPress={openAddedTime}>
                  <Text color="$onzeGreen" fontWeight="900">
                    {current.addedTimeMinutes == null ? 'Adicionar acréscimos' : 'Alterar acréscimos'}
                  </Text>
                </AppButton>
                {clock.canFinish ? (
                  <AppButton variant="primary" disabled={busy} onPress={() => void onFinishPeriod()}>
                    <Text color="$onzeSurface" fontWeight="900">{finishLabel}</Text>
                  </AppButton>
                ) : null}
              </YStack>
            ) : null}
          </YStack>
        ) : upcoming && state.canManage ? (
          <AppButton variant="primary" disabled={busy} onPress={() => void onStartNextPeriod()}>
            <Text color="$onzeSurface" fontWeight="900">
              Iniciar {periodLabel({ periodType: upcoming.type, periodNumber: upcoming.number })}
            </Text>
          </AppButton>
        ) : null}
      </YStack>

      <Modal
        animationType="fade"
        transparent
        visible={addedTimeVisible}
        onRequestClose={() => { if (!busy) setAddedTimeVisible(false); }}
      >
        <Pressable
          onPress={busy ? undefined : () => setAddedTimeVisible(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.42)',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Pressable onPress={(event) => event.stopPropagation()}>
            <YStack
              backgroundColor="$onzeSurface"
              borderRadius="$7"
              gap="$4"
              padding="$5"
              paddingBottom={Math.max(20, insets.bottom + 12)}
            >
              <YStack gap="$1">
                <Text color="$onzeInk" fontSize={21} fontWeight="900">Acréscimos</Text>
                <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                  Você pode definir ou alterar o total a qualquer momento deste tempo.
                </Text>
              </YStack>
              <YStack gap="$2">
                <Text color="$onzeInk" fontWeight="800">Minutos</Text>
                <Input
                  accessibilityLabel="Minutos de acréscimos"
                  backgroundColor="$onzeSurface"
                  borderColor={validationError ? '$onzeDanger' : '$onzeBorder'}
                  keyboardType="number-pad"
                  maxLength={3}
                  onChangeText={(value) => {
                    setAddedTimeText(value.replace(/\D/g, ''));
                    setValidationError(null);
                  }}
                  value={addedTimeText}
                />
                {validationError ? (
                  <Text color="$onzeDanger" fontSize={12}>{validationError}</Text>
                ) : null}
              </YStack>
              <XStack gap="$3">
                <AppButton
                  variant="secondary"
                  disabled={busy}
                  flex={1}
                  onPress={() => setAddedTimeVisible(false)}
                >
                  <Text color="$onzeInk" fontWeight="800">Cancelar</Text>
                </AppButton>
                <AppButton
                  variant="primary"
                  disabled={busy || addedTimeText.length === 0}
                  flex={1}
                  onPress={() => void saveAddedTime()}
                >
                  <Text color="$onzeSurface" fontWeight="900">
                    {busy ? 'Salvando...' : 'Salvar'}
                  </Text>
                </AppButton>
              </XStack>
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
