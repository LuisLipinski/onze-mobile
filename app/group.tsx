import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Modal, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ConfirmActionModal } from '../src/components/confirm-action-modal';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  Group,
  GroupDayOfWeek,
  GroupRole,
  hasGroupPermission,
  leaveGroup,
  listGroups,
} from '../src/lib/api';
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

const ROLE_LABELS: Record<GroupRole, string> = {
  PRIMARY_ADMIN: 'ADMINISTRADOR PRINCIPAL',
  ADMIN: 'ADMINISTRADOR',
  MEMBER: 'MEMBRO',
};

export default function GroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

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

  function openLeaveFlow() {
    setMenuVisible(false);
    setLeaveModalVisible(true);
  }

  async function confirmLeave() {
    if (!group || leaving) return;

    if (group.role === 'PRIMARY_ADMIN') {
      setLeaveModalVisible(false);
      router.push({ pathname: '/group-admins', params: { groupId: group.id, groupName: group.name } });
      return;
    }

    setLeaving(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      await leaveGroup(token, group.id);
      setLeaveModalVisible(false);
      router.replace('/groups');
    } catch (exception) {
      setLeaveModalVisible(false);
      setError(exception instanceof Error ? exception.message : 'Não foi possível sair do grupo.');
    } finally {
      setLeaving(false);
    }
  }

  if (loading) {
    return <ServerLoadingScreen title="Carregando grupo..." message="Buscando as informações da sua pelada." />;
  }

  const isAdmin = group?.role === 'ADMIN' || group?.role === 'PRIMARY_ADMIN';
  const canAddMembers = group ? hasGroupPermission(group, 'ADD_MEMBERS') : false;
  const canEditGroup = group ? hasGroupPermission(group, 'EDIT_GROUP') : false;
  const canScheduleGames = group ? hasGroupPermission(group, 'SCHEDULE_GAMES') : false;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <YStack gap="$5" paddingVertical="$3">
          <XStack alignItems="center" justifyContent="space-between">
            <Button backgroundColor="transparent" onPress={() => router.replace('/groups')}>
              <Text color="$onzeGreen" fontWeight="700">← Grupos</Text>
            </Button>
            {group ? (
              <Button
                circular
                backgroundColor="$onzeSurface"
                borderColor="$onzeBorder"
                borderWidth={1}
                height={44}
                onPress={() => setMenuVisible(true)}
                width={44}
              >
                <Text color="$onzeInk" fontSize={21} fontWeight="900">☰</Text>
              </Button>
            ) : null}
          </XStack>

          {group ? (
            <>
              <YStack alignItems="center" gap="$3">
                <Image
                  source={group.photoUrl ? { uri: group.photoUrl } : require('../assets/icon.png')}
                  style={{ width: 112, height: 112, borderRadius: 26 }}
                />
                <Text color="$onzeInk" fontSize={28} fontWeight="900" textAlign="center">{group.name}</Text>
                <Text color={isAdmin ? '$onzeGreen' : '$onzeMuted'} fontSize={12} fontWeight="800">
                  {ROLE_LABELS[group.role]}
                </Text>
                {group.description ? (
                  <Text color="$onzeMuted" fontSize={14} lineHeight={20} textAlign="center">
                    {group.description}
                  </Text>
                ) : null}
              </YStack>

              {error ? (
                <YStack backgroundColor="$onzeSurface" borderColor="$onzeDanger" borderRadius="$5" borderWidth={1} padding="$4">
                  <Text color="$onzeDanger" fontSize={13}>{error}</Text>
                </YStack>
              ) : null}

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
                        <Text color="$onzeInk" fontSize={14} fontWeight="700">{schedule.startTime.slice(0, 5)}</Text>
                      </XStack>
                    ))
                  ) : (
                    <Text color="$onzeMuted" fontSize={14}>Nenhum horário configurado.</Text>
                  )}
                </YStack>
              </YStack>
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

      {group ? (
        <Modal animationType="fade" transparent visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
          <Pressable
            onPress={() => setMenuVisible(false)}
            style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.30)', alignItems: 'flex-end' }}
          >
            <Pressable onPress={(event) => event.stopPropagation()} style={{ width: '82%', maxWidth: 360 }}>
              <YStack
                backgroundColor="$onzeSurface"
                borderBottomLeftRadius="$7"
                gap="$2"
                padding="$5"
                paddingTop="$8"
                minHeight="100%"
              >
                <XStack alignItems="center" justifyContent="space-between" marginBottom="$3">
                  <YStack flex={1} gap="$1">
                    <Text color="$onzeMuted" fontSize={11} fontWeight="800">MENU DO GRUPO</Text>
                    <Text color="$onzeInk" fontSize={20} fontWeight="900" numberOfLines={1}>{group.name}</Text>
                  </YStack>
                  <Button circular backgroundColor="$onzeCanvas" onPress={() => setMenuVisible(false)}>
                    <Text color="$onzeInk" fontSize={18}>×</Text>
                  </Button>
                </XStack>

                {isAdmin ? (
                  <MenuButton label="Ver membros" onPress={() => {
                    setMenuVisible(false);
                    router.push({ pathname: '/group-admins', params: { groupId: group.id, groupName: group.name } });
                  }} />
                ) : null}

                {canAddMembers ? (
                  <MenuButton label="Jogadores e convites" onPress={() => {
                    setMenuVisible(false);
                    router.push({ pathname: '/group-invite', params: { groupId: group.id, groupName: group.name } });
                  }} />
                ) : null}

                {canScheduleGames ? (
                  <YStack backgroundColor="$onzeCanvas" borderRadius="$4" gap="$1" opacity={0.62} padding="$4">
                    <Text color="$onzeInk" fontWeight="800">Marcar jogo</Text>
                    <Text color="$onzeMuted" fontSize={11}>Em breve nesta etapa</Text>
                  </YStack>
                ) : null}

                {canEditGroup ? (
                  <MenuButton label="Configurações do grupo" onPress={() => {
                    setMenuVisible(false);
                    router.push({ pathname: '/group-settings', params: { groupId: group.id } });
                  }} />
                ) : null}

                {group.role === 'ADMIN' && !(group.permissions ?? []).length ? (
                  <YStack backgroundColor="$onzeCanvas" borderRadius="$4" gap="$1" padding="$4">
                    <Text color="$onzeInk" fontWeight="800">Administrador sem funções liberadas</Text>
                    <Text color="$onzeMuted" fontSize={11} lineHeight={17}>
                      O Administrador Principal ainda não liberou ações para sua conta.
                    </Text>
                  </YStack>
                ) : null}

                <YStack flex={1} />

                <Button
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeDanger"
                  borderWidth={1}
                  height={50}
                  marginTop="$4"
                  onPress={openLeaveFlow}
                >
                  <Text color="$onzeDanger" fontWeight="800">Sair do grupo</Text>
                </Button>
              </YStack>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {group ? (
        <ConfirmActionModal
          visible={leaveModalVisible}
          title={group.role === 'PRIMARY_ADMIN' ? 'Transfira o grupo antes de sair' : 'Sair deste grupo?'}
          message={
            group.role === 'PRIMARY_ADMIN'
              ? 'Como Administrador Principal, você precisa promover outro administrador a Principal antes de sair. Vamos abrir a lista de membros para você fazer a transferência.'
              : `Você deixará de participar de ${group.name}. Para voltar depois, será necessário usar um novo convite do grupo.`
          }
          confirmLabel={group.role === 'PRIMARY_ADMIN' ? 'Ver membros' : 'Sair do grupo'}
          destructive={group.role !== 'PRIMARY_ADMIN'}
          loading={leaving}
          onCancel={() => setLeaveModalVisible(false)}
          onConfirm={() => void confirmLeave()}
        />
      ) : null}
    </SafeAreaView>
  );
}

function MenuButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Button
      backgroundColor="$onzeSurface"
      borderColor="$onzeBorder"
      borderWidth={1}
      height={50}
      justifyContent="flex-start"
      onPress={onPress}
    >
      <Text color="$onzeInk" fontWeight="800">{label}</Text>
    </Button>
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
