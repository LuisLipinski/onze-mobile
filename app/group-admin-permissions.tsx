import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Switch } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  GroupAdminPermission,
  GroupMember,
  listGroupMembers,
  updateGroupAdminPermissions,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';

const PERMISSIONS: {
  value: GroupAdminPermission;
  label: string;
  description: string;
}[] = [
  {
    value: 'ADD_MEMBERS',
    label: 'Adicionar membros',
    description: 'Gerar, renovar e compartilhar o convite do grupo.',
  },
  {
    value: 'REMOVE_MEMBERS',
    label: 'Remover membros',
    description: 'Retirar membros comuns. Administradores precisam ser rebaixados pelo Principal antes.',
  },
  {
    value: 'PROMOTE_MEMBERS',
    label: 'Promover membros',
    description: 'Transformar um membro em administrador. O novo admin começa sem funções liberadas.',
  },
  {
    value: 'EDIT_GROUP',
    label: 'Editar grupo',
    description: 'Alterar foto, cidade, local, mascote e horários habituais.',
  },
  {
    value: 'SCHEDULE_GAMES',
    label: 'Marcar jogos',
    description: 'Liberar a marcação de partidas quando essa funcionalidade estiver disponível.',
  },
];

export default function GroupAdminPermissionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    groupId: string;
    groupName?: string;
    membershipId: string;
    memberName?: string;
  }>();
  const [member, setMember] = useState<GroupMember | null>(null);
  const [selected, setSelected] = useState<GroupAdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadAdmin();
    }, [params.groupId, params.membershipId]),
  );

  async function loadAdmin() {
    if (!params.groupId || !params.membershipId) {
      setError('Não foi possível identificar o administrador.');
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

      const members = await listGroupMembers(token, params.groupId);
      const current = members.find((item) => item.currentUser);
      if (current?.role !== 'PRIMARY_ADMIN') {
        setError('Somente o Administrador Principal pode editar as funções de outros administradores.');
        return;
      }

      const target = members.find((item) => item.membershipId === params.membershipId);
      if (!target || target.role !== 'ADMIN') {
        setError('Este administrador não está mais disponível para edição.');
        return;
      }

      setMember(target);
      setSelected(target.permissions ?? []);
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setError(exception instanceof Error ? exception.message : 'Não foi possível carregar as permissões.');
    } finally {
      setLoading(false);
    }
  }

  function togglePermission(permission: GroupAdminPermission, enabled: boolean) {
    setMessage(null);
    setSelected((current) => {
      if (enabled) {
        return current.includes(permission) ? current : [...current, permission];
      }
      return current.filter((item) => item !== permission);
    });
  }

  async function savePermissions() {
    if (!member || !params.groupId || saving) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const updated = await updateGroupAdminPermissions(
        token,
        params.groupId,
        member.membershipId,
        selected,
      );
      setMember(updated);
      setSelected(updated.permissions ?? []);
      setMessage('Permissões atualizadas. As novas regras já estão valendo para este administrador.');
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setError(exception instanceof Error ? exception.message : 'Não foi possível salvar as permissões.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <ServerLoadingScreen title="Carregando permissões..." message="Buscando as funções deste administrador." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
        <YStack gap="$5" paddingVertical="$3">
          <Button alignSelf="flex-start" backgroundColor="transparent" onPress={() => router.back()}>
            <Text color="$onzeGreen" fontWeight="700">← Voltar</Text>
          </Button>

          <YStack gap="$1">
            <Text color="$onzeGreen" fontSize={14} fontWeight="900">EDITAR ADMINISTRADOR</Text>
            <Text color="$onzeInk" fontSize={28} fontWeight="900">
              {member?.displayName || params.memberName?.trim() || 'Administrador'}
            </Text>
            <Text color="$onzeMuted" fontSize={14} lineHeight={21}>
              Escolha exatamente o que este administrador poderá fazer em {params.groupName?.trim() || 'seu grupo'}.
            </Text>
          </YStack>

          <YStack
            backgroundColor="$onzeCanvas"
            borderColor="$onzeBorder"
            borderRadius="$5"
            borderWidth={1}
            gap="$1"
            padding="$4"
          >
            <Text color="$onzeInk" fontSize={13} fontWeight="800">Ações que nunca são delegadas</Text>
            <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
              Editar permissões, rebaixar administradores e transferir o cargo principal continuam exclusivos do Administrador Principal.
            </Text>
          </YStack>

          {member ? (
            <YStack
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$6"
              borderWidth={1}
              paddingHorizontal="$5"
            >
              {PERMISSIONS.map((permission, index) => (
                <XStack
                  key={permission.value}
                  alignItems="center"
                  borderBottomColor="$onzeBorder"
                  borderBottomWidth={index === PERMISSIONS.length - 1 ? 0 : 1}
                  gap="$4"
                  justifyContent="space-between"
                  paddingVertical="$4"
                >
                  <YStack flex={1} gap="$1">
                    <Text color="$onzeInk" fontSize={15} fontWeight="800">{permission.label}</Text>
                    <Text color="$onzeMuted" fontSize={12} lineHeight={18}>{permission.description}</Text>
                  </YStack>
                  <Switch
                    accessibilityLabel={permission.label}
                    disabled={saving}
                    onValueChange={(enabled) => togglePermission(permission.value, enabled)}
                    thumbColor="#FFFFFF"
                    trackColor={{ false: '#C9D2CC', true: '#148A4A' }}
                    value={selected.includes(permission.value)}
                  />
                </XStack>
              ))}
            </YStack>
          ) : (
            <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$5" borderWidth={1} gap="$3" padding="$5">
              <Text color="$onzeDanger" fontSize={14} lineHeight={20}>
                {error ?? 'Não foi possível abrir este administrador.'}
              </Text>
              <Button backgroundColor="$onzeGreen" onPress={() => void loadAdmin()}>
                <Text color="$onzeSurface" fontWeight="800">Tentar novamente</Text>
              </Button>
            </YStack>
          )}

          {error && member ? <Text color="$onzeDanger" fontSize={13} lineHeight={19}>{error}</Text> : null}
          {message ? <Text color="$onzeGreen" fontSize={13} fontWeight="700" lineHeight={19}>{message}</Text> : null}

          {member ? (
            <Button backgroundColor="$onzeGreen" disabled={saving} height={52} onPress={() => void savePermissions()}>
              <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                {saving ? 'Salvando...' : 'Salvar permissões'}
              </Text>
            </Button>
          ) : null}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
