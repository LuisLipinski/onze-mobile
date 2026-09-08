import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Button, Input, Text, XStack, YStack } from 'tamagui';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { GroupDayOfWeek, GroupSchedule, updateGroupDetails } from '../src/lib/api';
import { getAccessToken } from '../src/lib/auth-storage';
import { parsePaymentAmount, sanitizePaymentAmountInput } from '../src/lib/payment';

const DAYS: { value: GroupDayOfWeek; label: string; fullLabel: string }[] = [
  { value: 'MONDAY', label: 'Seg', fullLabel: 'Segunda-feira' },
  { value: 'TUESDAY', label: 'Ter', fullLabel: 'Terça-feira' },
  { value: 'WEDNESDAY', label: 'Qua', fullLabel: 'Quarta-feira' },
  { value: 'THURSDAY', label: 'Qui', fullLabel: 'Quinta-feira' },
  { value: 'FRIDAY', label: 'Sex', fullLabel: 'Sexta-feira' },
  { value: 'SATURDAY', label: 'Sáb', fullLabel: 'Sábado' },
  { value: 'SUNDAY', label: 'Dom', fullLabel: 'Domingo' },
];

export default function CreateGroupDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    groupId: string;
    groupName?: string;
    photoWarning?: string;
  }>();
  const [city, setCity] = useState('');
  const [mascot, setMascot] = useState('');
  const [venue, setVenue] = useState('');
  const [defaultPaymentAmount, setDefaultPaymentAmount] = useState('');
  const [defaultPixKey, setDefaultPixKey] = useState('');
  const [times, setTimes] = useState<Partial<Record<GroupDayOfWeek, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedDays = useMemo(
    () => DAYS.filter((day) => times[day.value] !== undefined),
    [times],
  );

  function toggleDay(day: GroupDayOfWeek) {
    setTimes((current) => {
      const next = { ...current };
      if (next[day] !== undefined) {
        delete next[day];
      } else {
        next[day] = '';
      }
      return next;
    });
  }

  function changeTime(day: GroupDayOfWeek, value: string) {
    const sanitized = value.replace(/[^0-9:]/g, '').slice(0, 5);
    setTimes((current) => ({ ...current, [day]: sanitized }));
  }

  function buildSchedules(): GroupSchedule[] | null {
    const schedules: GroupSchedule[] = [];
    for (const day of selectedDays) {
      const value = times[day.value]?.trim() ?? '';
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
        setError(`Informe um horário válido para ${day.fullLabel}, no formato HH:MM.`);
        return null;
      }
      schedules.push({ dayOfWeek: day.value, startTime: `${value}:00` });
    }
    return schedules;
  }

  async function continueSetup() {
    if (loading) return;
    if (!params.groupId) {
      setError('Não foi possível identificar o grupo criado.');
      return;
    }

    const schedules = buildSchedules();
    if (!schedules) return;

    const hasPaymentAmount = Boolean(defaultPaymentAmount.trim());
    const hasPixKey = Boolean(defaultPixKey.trim());
    if (hasPaymentAmount !== hasPixKey) {
      setError('Informe o valor padrão e a chave PIX juntos, ou deixe os dois vazios.');
      return;
    }
    const parsedPaymentAmount = hasPaymentAmount
      ? parsePaymentAmount(defaultPaymentAmount)
      : undefined;
    if (hasPaymentAmount && parsedPaymentAmount == null) {
      setError('Informe um valor padrão válido, como 25,00.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }

      await updateGroupDetails(token, params.groupId, {
        city: city.trim() || undefined,
        mascot: mascot.trim() || undefined,
        venue: venue.trim() || undefined,
        defaultPaymentAmount: parsedPaymentAmount ?? undefined,
        defaultPixKey: defaultPixKey.trim() || undefined,
        schedules,
      });

      goToInvite();
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Não foi possível salvar as informações do grupo.',
      );
      setLoading(false);
    }
  }

  function goToInvite() {
    router.replace({
      pathname: '/create-group-invite',
      params: { groupId: params.groupId, groupName: params.groupName ?? '' },
    });
  }

  function skip() {
    Alert.alert(
      'Você pode configurar depois',
      'Cidade, dias, horários, mascote, local e cobrança podem ser alterados em Grupo > Configurações.',
      [{ text: 'Continuar', onPress: goToInvite }],
    );
  }

  if (loading) {
    return (
      <ServerLoadingScreen
        title="Salvando o grupo..."
        message="Estamos guardando as informações opcionais da sua pelada."
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <YStack gap="$5" paddingVertical="$4">
            <YStack gap="$1">
              <Text color="$onzeGreen" fontSize={14} fontWeight="800">
                ETAPA 2 DE 3
              </Text>
              <Text color="$onzeInk" fontSize={30} fontWeight="800">
                Complete o grupo
              </Text>
              <Text color="$onzeMuted" fontSize={15} lineHeight={22}>
                Tudo aqui é opcional. Preencha agora ou pule e configure depois.
              </Text>
            </YStack>

            {params.photoWarning ? (
              <YStack
                backgroundColor="#FFF7E8"
                borderColor="#F0D9A8"
                borderRadius="$4"
                borderWidth={1}
                padding="$3"
              >
                <Text color="#765A20" fontSize={13} lineHeight={19}>
                  {params.photoWarning}
                </Text>
              </YStack>
            ) : null}

            <YStack
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$6"
              borderWidth={1}
              gap="$4"
              padding="$5"
            >
              <OptionalInput
                label="Cidade"
                placeholder="Ex.: Curitiba"
                value={city}
                onChangeText={setCity}
              />
              <OptionalInput
                label="Mascote"
                placeholder="Ex.: Leão"
                value={mascot}
                onChangeText={setMascot}
              />
              <OptionalInput
                label="Local / campo onde joga"
                placeholder="Ex.: Arena dos Amigos"
                value={venue}
                onChangeText={setVenue}
              />

              <YStack backgroundColor="$onzeCanvas" borderRadius="$5" gap="$3" padding="$4">
                <YStack gap="$1">
                  <Text color="$onzeInk" fontSize={16} fontWeight="900">Cobrança padrão</Text>
                  <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                    Opcional. Usaremos estes dados como sugestão ao marcar cada jogo.
                  </Text>
                </YStack>
                <OptionalInput
                  keyboardType="decimal-pad"
                  label="Valor por jogador"
                  placeholder="Ex.: 25,00"
                  value={defaultPaymentAmount}
                  onChangeText={(value) => setDefaultPaymentAmount(sanitizePaymentAmountInput(value))}
                />
                <OptionalInput
                  label="Chave PIX"
                  placeholder="Email, telefone, CPF ou chave aleatória"
                  value={defaultPixKey}
                  onChangeText={setDefaultPixKey}
                />
              </YStack>

              <YStack gap="$3">
                <XStack alignItems="center" justifyContent="space-between">
                  <Text color="$onzeInk" fontSize={14} fontWeight="700">
                    Dias e horários habituais
                  </Text>
                  <Text color="$onzeMuted" fontSize={12}>
                    Opcional
                  </Text>
                </XStack>

                <XStack flexWrap="wrap" gap="$2">
                  {DAYS.map((day) => {
                    const selected = times[day.value] !== undefined;
                    return (
                      <Button
                        key={day.value}
                        backgroundColor={selected ? '$onzeGreen' : '$onzeSurface'}
                        borderColor="$onzeGreen"
                        borderWidth={1}
                        minWidth={58}
                        onPress={() => toggleDay(day.value)}
                        pressStyle={{ opacity: 0.85 }}
                      >
                        <Text
                          color={selected ? '$onzeSurface' : '$onzeGreen'}
                          fontWeight="700"
                        >
                          {day.label}
                        </Text>
                      </Button>
                    );
                  })}
                </XStack>

                {selectedDays.map((day) => (
                  <XStack key={day.value} alignItems="center" gap="$3">
                    <Text color="$onzeInk" flex={1} fontSize={14}>
                      {day.fullLabel}
                    </Text>
                    <Input
                      backgroundColor="$onzeSurface"
                      borderColor="$onzeBorder"
                      color="$onzeInk"
                      focusStyle={{ borderColor: '$onzeGreen' }}
                      maxLength={5}
                      onChangeText={(value) => changeTime(day.value, value)}
                      placeholder="20:00"
                      placeholderTextColor="$onzeMuted"
                      textAlign="center"
                      value={times[day.value] ?? ''}
                      width={105}
                    />
                  </XStack>
                ))}
              </YStack>

              {error ? (
                <Text color="$onzeDanger" fontSize={14}>
                  {error}
                </Text>
              ) : null}

              <Button
                backgroundColor="$onzeGreen"
                height={52}
                onPress={() => void continueSetup()}
                pressStyle={{ backgroundColor: '$onzeGreenPress' }}
              >
                <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                  Salvar e continuar
                </Text>
              </Button>

              <Button
                backgroundColor="$onzeSurface"
                borderColor="$onzeBorder"
                borderWidth={1}
                height={50}
                onPress={skip}
              >
                <Text color="$onzeInk" fontSize={15} fontWeight="700">
                  Pular
                </Text>
              </Button>
            </YStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function OptionalInput({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <YStack gap="$2">
      <XStack alignItems="center" justifyContent="space-between">
        <Text color="$onzeInk" fontSize={14} fontWeight="700">
          {label}
        </Text>
        <Text color="$onzeMuted" fontSize={12}>
          Opcional
        </Text>
      </XStack>
      <Input
        backgroundColor="$onzeSurface"
        borderColor="$onzeBorder"
        color="$onzeInk"
        focusStyle={{ borderColor: '$onzeGreen' }}
        height={50}
        keyboardType={keyboardType}
        maxLength={255}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="$onzeMuted"
        value={value}
      />
    </YStack>
  );
}
