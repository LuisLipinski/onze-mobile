import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Button, Input, Text, XStack, YStack } from 'tamagui';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  Group,
  GroupDayOfWeek,
  GroupSchedule,
  hasGroupPermission,
  listGroups,
  updateGroupDetails,
  uploadGroupPhoto,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';

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
  const [times, setTimes] = useState<Partial<Record<GroupDayOfWeek, string>>>({});
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedDays = useMemo(
    () => DAYS.filter((day) => times[day.value] !== undefined),
    [times],
  );

  useEffect(() => {
    void loadGroup();
  }, [params.groupId]);

  async function loadGroup() {
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
      setError(exception instanceof Error ? exception.message : 'Não foi possível carregar as configurações.');
    } finally {
      setLoading(false);
    }
  }

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
        schedules,
      });

      if (photo) {
        updated = await uploadGroupPhoto(token, group.id, {
          uri: photo.uri,
          fileName: photo.fileName,
          mimeType: photo.mimeType,
        });
      }

      setGroup(updated);
      setPhoto(null);
      Alert.alert('Configurações salvas', 'As informações do grupo foram atualizadas.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <ServerLoadingScreen title="Carregando configurações..." message="Preparando os dados do grupo." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <YStack gap="$5" paddingVertical="$3">
            <Button alignSelf="flex-start" backgroundColor="transparent" onPress={() => router.back()}>
              <Text color="$onzeGreen" fontWeight="700">← Voltar</Text>
            </Button>

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
                  <Button backgroundColor="$onzeSurface" borderColor="$onzeGreen" borderWidth={1} onPress={() => void choosePhoto()}>
                    <Text color="$onzeGreen" fontWeight="700">{photo ? 'Trocar foto escolhida' : 'Alterar foto do grupo'}</Text>
                  </Button>
                </YStack>

                <OptionalInput label="Cidade" placeholder="Ex.: Curitiba" value={city} onChangeText={setCity} />
                <OptionalInput label="Mascote" placeholder="Ex.: Leão" value={mascot} onChangeText={setMascot} />
                <OptionalInput label="Local / campo onde joga" placeholder="Ex.: Arena dos Amigos" value={venue} onChangeText={setVenue} />

                <YStack gap="$3">
                  <Text color="$onzeInk" fontSize={14} fontWeight="700">Dias e horários habituais</Text>
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
                        >
                          <Text color={selected ? '$onzeSurface' : '$onzeGreen'} fontWeight="700">{day.label}</Text>
                        </Button>
                      );
                    })}
                  </XStack>

                  {selectedDays.map((day) => (
                    <XStack key={day.value} alignItems="center" gap="$3">
                      <Text color="$onzeInk" flex={1} fontSize={14}>{day.fullLabel}</Text>
                      <Input
                        backgroundColor="$onzeSurface"
                        borderColor="$onzeBorder"
                        color="$onzeInk"
                        maxLength={5}
                        onChangeText={(value) => changeTime(day.value, value)}
                        placeholder="20:00"
                        textAlign="center"
                        value={times[day.value] ?? ''}
                        width={105}
                      />
                    </XStack>
                  ))}
                </YStack>

                {error ? <Text color="$onzeDanger" fontSize={14}>{error}</Text> : null}

                <Button backgroundColor="$onzeGreen" disabled={saving} height={52} onPress={() => void save()}>
                  <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                    {saving ? 'Salvando...' : 'Salvar configurações'}
                  </Text>
                </Button>
              </YStack>
            ) : (
              <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$5" borderWidth={1} gap="$3" padding="$5">
                <Text color="$onzeDanger" fontSize={14}>{error ?? 'Não foi possível abrir as configurações.'}</Text>
                <Button backgroundColor="$onzeGreen" onPress={() => void loadGroup()}>
                  <Text color="$onzeSurface" fontWeight="800">Tentar novamente</Text>
                </Button>
              </YStack>
            )}
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function OptionalInput({ label, placeholder, value, onChangeText }: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <YStack gap="$2">
      <Text color="$onzeInk" fontSize={14} fontWeight="700">{label}</Text>
      <Input
        backgroundColor="$onzeSurface"
        borderColor="$onzeBorder"
        color="$onzeInk"
        height={50}
        maxLength={255}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="$onzeMuted"
        value={value}
      />
    </YStack>
  );
}
