import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  demoteGroupAdmin,
  GroupMember,
  GroupRole,
  listGroupMembers,
  promoteGroupMember,
  transferPrimaryAdmin,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';

const ROLE_LABELS: Record<GroupRole, string> = {
  PRIMARY_ADMIN: 'Administrador principal',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

export default function GroupAdminsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string; groupName?: string }>();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadMembers();
    }, [params.groupId]),
  );

  const currentMember = members.find((member) => member.currentUser) ?? null;
  const isPrimaryAdmin = currentMember?.role === 'PRIMARY_ADMIN';
  const replacementAdmins = useMemo(
    () => members.filter((member) => member.role === 'ADMIN' && !member.currentUser),
    [members],
  );

  async function loadMembers() {
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
      setMembers(await listGroupMembers(token, params.groupId));
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      if (exception instanceof ApiRequestError && exception.status === 403) {
        router.replace({ pathname: '/group', params: { groupId: params.groupId } });
        return;
      }
      setError(exception instanceof Error ? exception.message : 'Não foi possível carregar os jogadores.');
    } finally {
      setLoading(false);
    }
  }

  function confirmPromote(member: GroupMember) {
    Alert.alert(
      'Tornar administrador?',
      `${member.displayName} poderá administrar o grupo e promover outros membros.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Promover', onPress: () => void promote(member) },
      ],
    );
  }

  async function promote(member: GroupMember) {
    if (!params.groupId || actionId) return;
    setActionId(member.membershipId);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      await promoteGroupMember(token, params.groupId, member.membershipId);
      await loadMembers();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível promover este jogador.');
    } finally {
      setActionId(null);
    }
  }

  function confirmDemote(member: GroupMember) {
    Alert.alert(
      'Rebaixar administrador?',
      `${member.displayName} voltará a ser membro do grupo e perderá as permissões administrativas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Rebaixar', style: 'destructive', onPress: () => void demote(member) },
      ],
    );
  }

  async function demote(member: GroupMember) {
    if (!params.groupId || actionId) return;
    setActionId(member.membershipId);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      await demoteGroupAdmin(token, params.groupId, member.membershipId);
      await loadMembers();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível rebaixar este administrador.');
    } finally {
      setActionId(null);
    }
  }

  function confirmTransfer(member: GroupMember) {
    Alert.alert(
      'Transferir administração principal?',
      `${member.displayName} passará a ser o administrador principal. Você deixará de ser administrador e continuará no grupo como membro.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Transferir e sair da administração', style: 'destructive', onPress: () => void transfer(member) },
      ],
    );
  }

  async function transfer(member: GroupMember) {
    if (!params.groupId || actionId) return;
    setActionId(member.membershipId);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      await transferPrimaryAdmin(token, params.groupId, member.membershipId);
      Alert.alert(
        'Administração transferida',
        `${member.displayName} agora é o administrador principal. Você continua no grupo como membro.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace({ pathname: '/group', params: { groupId: params.groupId } }),
          },
        ],
      );
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível transferir a administração principal.');
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return <ServerLoadingScreen title="Carregando administradores..." message="Buscando os jogadores e permissões do grupo." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
        <YStack gap="$5" paddingVertical="$3">
          <Button alignSelf="flex-start" backgroundColor="transparent" onPress={() => router.back()}>
            <Text color="$onzeGreen" fontWeight="700">← Voltar</Text>
          </Button>

          <YStack gap="$1">
            <Text color="$onzeGreen" fontSize={14} fontWeight="800">ADMINISTRADORES</Text>
            <Text color="$onzeInk" fontSize={28} fontWeight="900">
              {params.groupName?.trim() || 'Seu grupo'}
            </Text>
            <Text color="$onzeMuted" fontSize={14} lineHeight={21}>
              Todos os administradores podem promover membros. Somente o administrador principal pode rebaixar outros administradores.
            </Text>
          </YStack>

          {error ? (
            <YStack backgroundColor="$onzeSurface" borderColor="$onzeDanger" borderRadius="$5" borderWidth={1} padding="$4">
              <Text color="$onzeDanger" fontSize={13} lineHeight={19}>{error}</Text>
            </YStack>
          ) : null}

          <YStack gap="$3">
            {members.map((member) => (
              <MemberCard
                key={member.membershipId}
                member={member}
                isPrimaryAdmin={isPrimaryAdmin}
                busy={actionId === member.membershipId}
                onPromote={() => confirmPromote(member)}
                onDemote={() => confirmDemote(member)}
              />
            ))}
          </YStack>

          {isPrimaryAdmin ? (
            <YStack
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$6"
              borderWidth={1}
              gap="$3"
              padding="$5"
            >
              <Text color="$onzeInk" fontSize={18} fontWeight="800">Deixar a administração</Text>
              <Text color="$onzeMuted" fontSize={13} lineHeight={20}>
                Para deixar o cargo de administrador principal, escolha primeiro outro administrador para assumir. Depois da transferência você continuará no grupo como membro.
              </Text>

              {replacementAdmins.length ? (
                replacementAdmins.map((member) => (
                  <Button
                    key={member.membershipId}
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeGreen"
                    borderWidth={1}
                    disabled={Boolean(actionId)}
                    minHeight={48}
                    onPress={() => confirmTransfer(member)}
                  >
                    <Text color="$onzeGreen" fontWeight="800">Transferir para {member.displayName}</Text>
                  </Button>
                ))
              ) : (
                <Text color="$onzeMuted" fontSize={13} fontWeight="700" lineHeight={19}>
                  Primeiro promova pelo menos um membro a administrador para poder transferir o cargo.
                </Text>
              )}
            </YStack>
          ) : null}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}

function MemberCard({
  member,
  isPrimaryAdmin,
  busy,
  onPromote,
  onDemote,
}: {
  member: GroupMember;
  isPrimaryAdmin: boolean;
  busy: boolean;
  onPromote: () => void;
  onDemote: () => void;
}) {
  return (
    <YStack
      backgroundColor="$onzeSurface"
      borderColor="$onzeBorder"
      borderRadius="$5"
      borderWidth={1}
      gap="$3"
      padding="$4"
    >
      <XStack alignItems="center" justifyContent="space-between" gap="$3">
        <YStack flex={1} gap="$1">
          <Text color="$onzeInk" fontSize={16} fontWeight="800">
            {member.displayName}{member.currentUser ? ' (você)' : ''}
          </Text>
          <Text
            color={member.role === 'MEMBER' ? '$onzeMuted' : '$onzeGreen'}
            fontSize={12}
            fontWeight="800"
          >
            {ROLE_LABELS[member.role].toUpperCase()}
          </Text>
        </YStack>
      </XStack>

      {member.role === 'MEMBER' ? (
        <Button
          backgroundColor="$onzeGreen"
          disabled={busy}
          height={44}
          onPress={onPromote}
        >
          <Text color="$onzeSurface" fontWeight="800">{busy ? 'Salvando...' : 'Tornar administrador'}</Text>
        </Button>
      ) : null}

      {member.role === 'ADMIN' && isPrimaryAdmin ? (
        <Button
          backgroundColor="$onzeSurface"
          borderColor="$onzeDanger"
          borderWidth={1}
          disabled={busy}
          height={44}
          onPress={onDemote}
        >
          <Text color="$onzeDanger" fontWeight="800">{busy ? 'Salvando...' : 'Rebaixar para membro'}</Text>
        </Button>
      ) : null}

      {member.role === 'ADMIN' && !isPrimaryAdmin ? (
        <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
          Apenas o administrador principal pode rebaixar administradores.
        </Text>
      ) : null}
    </YStack>
  );
}
