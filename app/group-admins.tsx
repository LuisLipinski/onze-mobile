import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ConfirmActionModal } from '../src/components/confirm-action-modal';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  demoteGroupAdmin,
  GroupAdminPermission,
  GroupMember,
  GroupRole,
  hasGroupPermission,
  listGroupMembers,
  promoteGroupMember,
  removeGroupMember,
  transferPrimaryAdmin,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';

const ROLE_LABELS: Record<GroupRole, string> = {
  PRIMARY_ADMIN: 'Administrador principal',
  ADMIN: 'Admin',
  MEMBER: 'Membro',
};

const PERMISSION_LABELS: Record<GroupAdminPermission, string> = {
  ADD_MEMBERS: 'Adicionar membros',
  REMOVE_MEMBERS: 'Remover membros',
  PROMOTE_MEMBERS: 'Promover membros',
  EDIT_GROUP: 'Editar grupo',
  SCHEDULE_GAMES: 'Marcar jogos',
};

type PendingAction = {
  type: 'promote' | 'remove' | 'demote' | 'transfer';
  member: GroupMember;
} | null;

export default function GroupAdminsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string; groupName?: string }>();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadMembers();
    }, [params.groupId]),
  );

  const currentMember = members.find((member) => member.currentUser) ?? null;
  const isPrimaryAdmin = currentMember?.role === 'PRIMARY_ADMIN';
  const canPromoteMembers = currentMember
    ? hasGroupPermission(currentMember, 'PROMOTE_MEMBERS')
    : false;
  const canRemoveMembers = currentMember
    ? hasGroupPermission(currentMember, 'REMOVE_MEMBERS')
    : false;

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

  async function runPendingAction() {
    if (!pendingAction || !params.groupId || actionId) return;
    const { member, type } = pendingAction;
    setActionId(member.membershipId);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }

      if (type === 'promote') {
        await promoteGroupMember(token, params.groupId, member.membershipId);
        setPendingAction(null);
        await loadMembers();
        return;
      }

      if (type === 'demote') {
        await demoteGroupAdmin(token, params.groupId, member.membershipId);
        setPendingAction(null);
        await loadMembers();
        return;
      }

      if (type === 'remove') {
        await removeGroupMember(token, params.groupId, member.membershipId);
        setPendingAction(null);
        await loadMembers();
        return;
      }

      await transferPrimaryAdmin(token, params.groupId, member.membershipId);
      setPendingAction(null);
      router.replace({ pathname: '/group', params: { groupId: params.groupId } });
    } catch (exception) {
      setPendingAction(null);
      const fallbackMessage = type === 'transfer'
        ? 'Não foi possível transferir a administração principal.'
        : type === 'remove'
          ? 'Não foi possível remover este membro.'
          : 'Não foi possível alterar a função deste jogador.';
      setError(
        exception instanceof Error
          ? exception.message
          : fallbackMessage,
      );
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return <ServerLoadingScreen title="Carregando membros..." message="Buscando os jogadores e permissões do grupo." />;
  }

  const modalCopy = getModalCopy(pendingAction);

  function editPermissions(member: GroupMember) {
    if (!params.groupId) return;
    router.push({
      pathname: '/group-admin-permissions',
      params: {
        groupId: params.groupId,
        groupName: params.groupName ?? '',
        membershipId: member.membershipId,
        memberName: member.displayName,
      },
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
        <YStack gap="$5" paddingVertical="$3">
          <Button alignSelf="flex-start" backgroundColor="transparent" onPress={() => router.back()}>
            <Text color="$onzeGreen" fontWeight="700">← Voltar</Text>
          </Button>

          <YStack gap="$1">
            <Text color="$onzeGreen" fontSize={14} fontWeight="800">MEMBROS</Text>
            <Text color="$onzeInk" fontSize={28} fontWeight="900">
              {params.groupName?.trim() || 'Seu grupo'}
            </Text>
            <Text color="$onzeMuted" fontSize={14} lineHeight={21}>
              O Administrador Principal define as funções de cada admin. Um administrador comum só pode executar as ações que foram liberadas para ele.
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
                canPromoteMembers={canPromoteMembers}
                canRemoveMembers={canRemoveMembers}
                busy={actionId === member.membershipId}
                onPromoteMember={() => setPendingAction({ type: 'promote', member })}
                onRemoveMember={() => setPendingAction({ type: 'remove', member })}
                onEditPermissions={() => editPermissions(member)}
                onPromoteToPrimary={() => setPendingAction({ type: 'transfer', member })}
                onDemote={() => setPendingAction({ type: 'demote', member })}
              />
            ))}
          </YStack>
        </YStack>
      </ScrollView>

      <ConfirmActionModal
        visible={Boolean(pendingAction)}
        title={modalCopy.title}
        message={modalCopy.message}
        confirmLabel={modalCopy.confirmLabel}
        destructive={pendingAction?.type === 'remove' || pendingAction?.type === 'demote' || pendingAction?.type === 'transfer'}
        loading={Boolean(actionId)}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void runPendingAction()}
      />
    </SafeAreaView>
  );
}

function getModalCopy(action: PendingAction) {
  if (!action) {
    return { title: '', message: '', confirmLabel: 'Confirmar' };
  }

  if (action.type === 'promote') {
    return {
      title: 'Promover para administrador?',
      message: `${action.member.displayName} passará a ser administrador, mas começará sem nenhuma função liberada. Depois você poderá escolher exatamente o que essa pessoa pode fazer.`,
      confirmLabel: 'Promover',
    };
  }

  if (action.type === 'remove') {
    return {
      title: 'Remover membro do grupo?',
      message: `${action.member.displayName} será removido do grupo e precisará de um novo convite para entrar novamente.`,
      confirmLabel: 'Remover',
    };
  }

  if (action.type === 'demote') {
    return {
      title: 'Rebaixar para membro?',
      message: `${action.member.displayName} perderá as permissões administrativas e continuará no grupo como membro normal.`,
      confirmLabel: 'Rebaixar',
    };
  }

  return {
    title: 'Tornar Administrador Principal?',
    message: `${action.member.displayName} assumirá o controle principal do grupo. Você continuará como administrador comum, sem funções liberadas, e o novo Principal decidirá quais ações poderá executar.`,
    confirmLabel: 'Transferir cargo',
  };
}

function MemberCard({
  member,
  isPrimaryAdmin,
  canPromoteMembers,
  canRemoveMembers,
  busy,
  onPromoteMember,
  onRemoveMember,
  onEditPermissions,
  onPromoteToPrimary,
  onDemote,
}: {
  member: GroupMember;
  isPrimaryAdmin: boolean;
  canPromoteMembers: boolean;
  canRemoveMembers: boolean;
  busy: boolean;
  onPromoteMember: () => void;
  onRemoveMember: () => void;
  onEditPermissions: () => void;
  onPromoteToPrimary: () => void;
  onDemote: () => void;
}) {
  const permissions = member.permissions ?? [];

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
            fontSize={11}
            fontWeight="900"
          >
            {ROLE_LABELS[member.role].toUpperCase()}
          </Text>
        </YStack>
      </XStack>

      {member.role === 'ADMIN' ? (
        <YStack backgroundColor="$onzeCanvas" borderRadius="$4" gap="$1" padding="$3">
          <Text color="$onzeMuted" fontSize={10} fontWeight="900">FUNÇÕES LIBERADAS</Text>
          <Text color={permissions.length ? '$onzeInk' : '$onzeMuted'} fontSize={12} lineHeight={18}>
            {permissions.length
              ? permissions.map((permission) => PERMISSION_LABELS[permission]).join(' • ')
              : 'Nenhuma função liberada'}
          </Text>
        </YStack>
      ) : null}

      {member.role === 'MEMBER'
        && !member.currentUser
        && (canPromoteMembers || canRemoveMembers) ? (
        <XStack gap="$2">
          {canPromoteMembers ? (
            <Button backgroundColor="$onzeGreen" disabled={busy} flex={1} height={42} onPress={onPromoteMember}>
              <Text color="$onzeSurface" fontSize={13} fontWeight="800">
                {busy ? 'Salvando...' : 'Promover'}
              </Text>
            </Button>
          ) : null}
          {canRemoveMembers ? (
            <Button
              backgroundColor="$onzeSurface"
              borderColor="$onzeDanger"
              borderWidth={1}
              disabled={busy}
              flex={1}
              height={42}
              onPress={onRemoveMember}
            >
              <Text color="$onzeDanger" fontSize={13} fontWeight="800">Remover</Text>
            </Button>
          ) : null}
        </XStack>
      ) : null}

      {member.role === 'ADMIN' && isPrimaryAdmin ? (
        <YStack gap="$2">
          <Button
            backgroundColor="$onzeSurface"
            borderColor="$onzeGreen"
            borderWidth={1}
            disabled={busy}
            height={42}
            onPress={onEditPermissions}
          >
            <Text color="$onzeGreen" fontSize={13} fontWeight="800">Editar permissões</Text>
          </Button>
          <XStack gap="$2">
            <Button backgroundColor="$onzeGreen" disabled={busy} flex={1} height={42} onPress={onPromoteToPrimary}>
              <Text color="$onzeSurface" fontSize={12} fontWeight="800">Tornar principal</Text>
            </Button>
            <Button
              backgroundColor="$onzeSurface"
              borderColor="$onzeDanger"
              borderWidth={1}
              disabled={busy}
              flex={1}
              height={42}
              onPress={onDemote}
            >
              <Text color="$onzeDanger" fontSize={13} fontWeight="800">Rebaixar</Text>
            </Button>
          </XStack>
        </YStack>
      ) : null}
    </YStack>
  );
}
