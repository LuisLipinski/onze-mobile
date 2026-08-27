import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { ApiRequestError, Group, GroupDayOfWeek, listGroups } from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';

const DAY_LABELS: Record<GroupDayOfWeek, string> = {
  MONDAY: 'Segunda-feira',
  TUESDAY: 'Terça-feira',
  WEDNESDAY: 'Quarta-feira',
  THURSDAY: 'Quinta-feira',
  FRIDAY: 'Sexta-feira',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

export default function GroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      void loadGroup();
    }, [params.groupId]),
  );

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
        setError('Este grupo não foi encontrado na sua conta.');
        setGroup(null);
        return;
      }
      setGroup(selected);
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setError(exception instanceof Error ? exception.message : 'Não foi possível carregar o grupo.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <ServerLoadingScreen title="Carregando grupo..." message="Buscando as informações da sua pelada." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <YStack gap="$5" paddingVertical="$3">
          <Button alignSelf="flex-start" backgroundColor="transparent" onPress={() => router.back()}>
            <Text color="$onzeGreen" fontWeight="700">← Voltar</Text>
          </Button>

          {group ? (
            <>
              <YStack alignItems="center" gap="$3">
                <Image
                  source={group.photoUrl ? { uri: group.photoUrl } : require('../assets/icon.png')}
                  style={{ width: 112, height: 112, borderRadius: 26 }}
                />
                <Text color="$onzeInk" fontSize={28} fontWeight="900" textAlign="center">
                  {group.name}
                </Text>
                <Text color={group.role === 'ADMIN' ? '$onzeGreen' : '$onzeMuted'} fontSize={12} fontWeight="800">
                  {group.role === 'ADMIN' ? 'ADMINISTRADOR' : 'MEMBRO'}
                </Text>
                {group.description ? (
                  <Text color="$onzeMuted" fontSize={14} lineHeight={20} textAlign="center">
                    {group.description}
                  </Text>
                ) : null}
              </YStack>

              <YStack
                backgroundColor="$onzeSurface"
                borderColor="$onzeBorder"
                borderRadius="$6"
                borderWidth={1}
                gap="$3"
                padding="$5"
              >
                <Text color="$onzeInk" fontSize={18} fontWeight="800">Informações</Text>
                <InfoRow label="Cidade" value={group.city || 'Não configurada'} />
                <InfoRow label="Local / campo" value={group.venue || 'Não configurado'} />
                <InfoRow label="Mascote" value={group.mascot || 'Não configurado'} />

                <YStack gap="$2" marginTop="$2">
                  <Text color="$onzeMuted" fontSize={12} fontWeight="700">DIAS E HORÁRIOS</Text>
                  {group.schedules.length ? (
                    group.schedules.map((schedule) => (
                      <XStack key={`${schedule.dayOfWeek}-${schedule.startTime}`} justifyContent="space-between">
                        <Text color="$onzeInk" fontSize={14}>{DAY_LABELS[schedule.dayOfWeek]}</Text>
                        <Text color="$onzeInk" fontSize={14} fontWeight="700">
                          {schedule.startTime.slice(0, 5)}
                        </Text>
                      </XStack>
                    ))
                  ) : (
                    <Text color="$onzeMuted" fontSize={14}>Nenhum horário configurado.</Text>
                  )}
                </YStack>
              </YStack>

              {group.role === 'ADMIN' ? (
                <YStack gap="$3">
                  <Text color="$onzeInk" fontSize={18} fontWeight="800">Administrar grupo</Text>
                  <Button
                    backgroundColor="$onzeGreen"
                    height={52}
                    onPress={() => router.push({ pathname: '/group-invite', params: { groupId: group.id, groupName: group.name } })}
                  >
                    <Text color="$onzeSurface" fontWeight="800">Jogadores e convites</Text>
                  </Button>
                  <Button
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeGreen"
                    borderWidth={1}
                    height={52}
                    onPress={() => router.push({ pathname: '/group-settings', params: { groupId: group.id } })}
                  >
                    <Text color="$onzeGreen" fontWeight="800">Configurações</Text>
                  </Button>
                </YStack>
              ) : null}
            </>
          ) : (
            <YStack
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$5"
              borderWidth={1}
              gap="$3"
              padding="$5"
            >
              <Text color="$onzeDanger" fontSize={14}>{error ?? 'Não foi possível carregar o grupo.'}</Text>
              <Button backgroundColor="$onzeGreen" onPress={() => void loadGroup()}>
                <Text color="$onzeSurface" fontWeight="800">Tentar novamente</Text>
              </Button>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack justifyContent="space-between" gap="$3">
      <Text color="$onzeMuted" fontSize={13}>{label}</Text>
      <Text color="$onzeInk" flex={1} fontSize={14} fontWeight="600" textAlign="right">{value}</Text>
    </XStack>
  );
}
