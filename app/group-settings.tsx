import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Input, Text, XStack, YStack } from 'tamagui';

import { ONZE_COLORS } from '../src/theme/colors';

import { getErrorMessage } from '../src/lib/errors';

import { AppButton } from '../src/components/app-button';
import { BackButton } from '../src/components/back-button';
import { NativeDateTimeField } from '../src/components/native-date-time-field';
import { ConfirmActionModal } from '../src/components/confirm-action-modal';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  deleteGroup,
  Group,
  GroupDayOfWeek,
  GroupSchedule,
  hasGroupPermission,
  listGroups,
  updateGroupDetails,
  uploadGroupPhoto,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';
import { cancelGroupNotifications } from '../src/lib/notifications';
import {
  parsePaymentAmount,
  paymentAmountInputValue,
  sanitizePaymentAmountInput,
} from '../src/lib/payment';

const DAYS: { value: GroupDayOfWeek; label: string; fullLabel: string }[] = [
  { value: 'MONDAY', label: 'Seg', fullLabel: 'Segunda-feira' },
  { value: 'TUESDAY', label: 'Ter', fullLabel: 'Terça-feira' },
  { value: 'WEDNESDAY', label: 'Qua', fullLabel: 'Quarta-feira' },
  { value: 'THURSDAY', label: 'Qui', fullLabel: 'Quinta-feira' },
  { value: 'FRIDAY', label: 'Sex', fullLabel: 'Sexta-feira' },
  { value: 'SATURDAY', label: 'Sáb', fullLabel: 'Sábado' },
  { value: 'SUNDAY', label: 'Dom', fullLabel: 'Domingo' },
];

export default function GroupSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [city, setCity] = useState('');
  const [mascot, setMascot] = useState('');
  const [venue, setVenue] = useState('');
  const [defaultPaymentAmount, setDefaultPaymentAmount] = useState('');
  const [defaultPixKey, setDefaultPixKey] = useState('');
  const [times, setTimes] = useState<Partial<Record<GroupDayOfWeek, string>>>({});
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedConfirmationVisible, setSavedConfirmationVisible] = useState(false);
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  const selectedDays = useMemo(
    () => DAYS.filter((day) => times[day.value] !== undefined),
    [times],
  );

  const loadGroup = useCallback(async () => {
    if (!params.groupId) {
      setError('Não foi possível identificar o grupo.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const groups = await listGroups(token);
      const selected = groups.find((item) => item.id === params.groupId);
      if (!selected) {
        setError('Grupo não encontrado.');
        return;
      }
      if (!hasGroupPermission(selected, 'EDIT_GROUP')) {
        setError('O Administrador Principal não liberou a edição do grupo para sua conta.');
        return;
      }

      setGroup(selected);
      setCity(selected.city ?? '');
      setMascot(selected.mascot ?? '');
      setVenue(selected.venue ?? '');
      setDefaultPaymentAmount(paymentAmountInputValue(selected.defaultPaymentAmount));
      setDefaultPixKey(selected.defaultPixKey ?? '');
      setTimes(
        Object.fromEntries(
          selected.schedules.map((schedule) => [schedule.dayOfWeek, schedule.startTime.slice(0, 5)]),
        ) as Partial<Record<GroupDayOfWeek, string>>,
      );
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setError(getErrorMessage(exception, 'Não foi possível carregar as configurações.'));
    } finally {
      setLoading(false);
    }
  }, [params.groupId, router]);

  useEffect(() => {
    void loadGroup();
  }, [loadGroup]);

  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0]);
    }
  }

  function toggleDay(day: GroupDayOfWeek) {
    setTimes((current) => {
      const next = { ...current };
      if (next[day] !== undefined) delete next[day];
      else next[day] = '';
      return next;
    });
  }

  function changeTime(day: GroupDayOfWeek, value: string) {
    setTimes((current) => ({
      ...current,
      [day]: value.replace(/[^0-9:]/g, '').slice(0, 5),
    }));
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

  async function save() {
    if (!group || saving) return;
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

    setSaving(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }

      let updated = await updateGroupDetails(token, group.id, {
        city: city.trim() || undefined,
        mascot: mascot.trim() || undefined,
        venue: venue.trim() || undefined,
        defaultPaymentAmount: parsedPaymentAmount ?? undefined,
        defaultPixKey: defaultPixKey.trim() || undefined,
        schedules,
      });

      if (photo) {
        try {
          updated = await uploadGroupPhoto(token, group.id, {
            uri: photo.uri,
            fileName: photo.fileName,
            mimeType: photo.mimeType,
          });
        } catch (exception) {
          setGroup(updated);
          console.warn('Falha ao enviar a nova foto do grupo.', exception);
          setError(
            'As outras configurações foram salvas, mas a foto ainda não foi enviada. Verifique sua conexão e toque em Salvar configurações novamente para tentar somente o envio da foto.',
          );
          return;
        }
      }

      setGroup(updated);
      setPhoto(null);
      setSavedConfirmationVisible(true);
    } catch (exception) {
      setError(getErrorMessage(exception, 'Não foi possível salvar as configurações.'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!group || group.role !== 'PRIMARY_ADMIN' || deleting || saving) return;
    setDeleting(true);
    setDeletionError(null);
    try {
      const token = await getAccessToken();
      if (!token) { router.replace('/'); return; }
      await deleteGroup(token, group.id);
      await cancelGroupNotifications(group.id).catch(() => undefined);
      setDeleteConfirmationVisible(false);
      router.replace('/groups');
    } catch (exception) {
      setDeletionError(getErrorMessage(exception, 'Não foi possível excluir o grupo. Tente novamente.'));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <ServerLoadingScreen title="Carregando configurações..." message="Preparando os dados do grupo." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <YStack gap="$5" paddingVertical="$3">
            <BackButton alignSelf="flex-start" onPress={() => router.back()} />

            <YStack gap="$1">
              <Text color="$onzeGreen" fontSize={14} fontWeight="800">CONFIGURAÇÕES</Text>
              <Text color="$onzeInk" fontSize={28} fontWeight="900">Complete seu grupo</Text>
              <Text color="$onzeMuted" fontSize={14} lineHeight={20}>
                Estes são os dados opcionais que você pode preencher ou alterar quando quiser.
              </Text>
            </YStack>

            {group ? (
              <YStack
                backgroundColor="$onzeSurface"
                borderColor="$onzeBorder"
                borderRadius="$6"
                borderWidth={1}
                gap="$4"
                padding="$5"
              >
                <YStack alignItems="center" gap="$3">
                  <Image
                    source={photo ? { uri: photo.uri } : group.photoUrl ? { uri: group.photoUrl } : require('../assets/icon.png')}
                    style={{ width: 104, height: 104, borderRadius: 24 }}
                  />
                  <AppButton variant="outline"   onPress={() => void choosePhoto()}>
                    <Text color="$onzeGreen" fontWeight="700">{photo ? 'Trocar foto escolhida' : 'Alterar foto do grupo'}</Text>
                  </AppButton>
                </YStack>

                <OptionalInput label="Cidade" placeholder="Ex.: Curitiba" value={city} onChangeText={setCity} />
                <OptionalInput label="Mascote" placeholder="Ex.: Leão" value={mascot} onChangeText={setMascot} />
                <OptionalInput label="Local / campo onde joga" placeholder="Ex.: Arena dos Amigos" value={venue} onChangeText={setVenue} />

                <YStack backgroundColor="$onzeCanvas" borderRadius="$5" gap="$3" padding="$4">
                  <YStack gap="$1">
                    <Text color="$onzeInk" fontSize={16} fontWeight="900">Cobrança padrão</Text>
                    <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                      Estes dados serão preenchidos automaticamente ao marcar um jogo e poderão ser alterados naquele jogo.
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
                  <Text color="$onzeInk" fontSize={14} fontWeight="700">Dias e horários habituais</Text>
                  <XStack flexWrap="wrap" gap="$2">
                    {DAYS.map((day) => {
                      const selected = times[day.value] !== undefined;
                      return (
                        <AppButton
                          key={day.value}
                          backgroundColor={selected ? '$onzeGreen' : '$onzeSurface'}
                          borderColor="$onzeGreen"
                          borderWidth={1}
                          minWidth={58}
                          onPress={() => toggleDay(day.value)}
                        >
                          <Text color={selected ? '$onzeSurface' : '$onzeGreen'} fontWeight="700">{day.label}</Text>
                        </AppButton>
                      );
                    })}
                  </XStack>

                  {selectedDays.map((day) => (
                    <XStack key={day.value} alignItems="center" gap="$3">
                      <Text color="$onzeInk" flex={1} fontSize={14}>{day.fullLabel}</Text>
                      <NativeDateTimeField mode="time" label={`Horário de ${day.fullLabel}`} value={times[day.value] ?? ''} onChange={(value) => changeTime(day.value, value)} width={115} />
                    </XStack>
                  ))}
                </YStack>

                {error ? <Text color="$onzeDanger" fontSize={14}>{error}</Text> : null}

                <AppButton variant="primary" disabled={saving}  onPress={() => void save()}>
                  <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                    {saving ? 'Salvando...' : 'Salvar configurações'}
                  </Text>
                </AppButton>
              </YStack>
            ) : (
              <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$5" borderWidth={1} gap="$3" padding="$5">
                <Text color="$onzeDanger" fontSize={14}>{error ?? 'Não foi possível abrir as configurações.'}</Text>
                <AppButton variant="primary" onPress={() => void loadGroup()}>
                  <Text color="$onzeSurface" fontWeight="800">Tentar novamente</Text>
                </AppButton>
              </YStack>
            )}

            {group?.role === 'PRIMARY_ADMIN' ? (
              <YStack backgroundColor="$onzeSurface" borderColor="$onzeDanger" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
                <Text color="$onzeDanger" fontSize={17} fontWeight="900">Excluir grupo</Text>
                <Text color="$onzeMuted" fontSize={14} lineHeight={20}>
                  Exclui este grupo para todos os membros, incluindo jogos, rankings e informações financeiras. Essa ação não pode ser desfeita.
                </Text>
                <AppButton variant="destructiveOutline" disabled={saving || deleting} onPress={() => {
                  setDeletionError(null);
                  setDeleteConfirmationVisible(true);
                }}>
                  <Text color="$onzeDanger" fontWeight="800">Excluir grupo</Text>
                </AppButton>
              </YStack>
            ) : null}
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmActionModal
        visible={deleteConfirmationVisible}
        title="Excluir este grupo?"
        message={`O grupo “${group?.name ?? ''}” e todo o seu histórico de jogos, rankings e informações financeiras serão excluídos para todos. Os membros serão avisados.\n\nEsta ação não pode ser desfeita.${deletionError ? `\n\n${deletionError}` : ''}`}
        confirmLabel="Excluir grupo"
        cancelLabel="Manter grupo"
        destructive
        loading={deleting}
        loadingLabel="Excluindo..."
        onCancel={() => { if (!deleting) setDeleteConfirmationVisible(false); }}
        onConfirm={() => void confirmDelete()}
      />
      <ConfirmActionModal
        visible={savedConfirmationVisible}
        title="Configurações salvas"
        message="As informações do grupo foram atualizadas."
        confirmLabel="Voltar"
        confirmAsBack
        cancelLabel={null}
        onCancel={() => setSavedConfirmationVisible(false)}
        onConfirm={() => router.back()}
      />
    </SafeAreaView>
  );
}

function OptionalInput({ label, placeholder, value, onChangeText, keyboardType }: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <YStack gap="$2">
      <Text color="$onzeInk" fontSize={14} fontWeight="700">{label}</Text>
      <Input
        backgroundColor="$onzeSurface"
        borderColor="$onzeBorder"
        color="$onzeInk"
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
