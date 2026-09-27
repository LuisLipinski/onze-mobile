import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { ONZE_COLORS } from '../src/theme/colors';

import { getErrorMessage } from '../src/lib/errors';

import { AppButton } from '../src/components/app-button';

import { BottomNavigation } from '../src/components/bottom-navigation';
import { ApiRequestError, Group, listGroups } from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';

export default function GroupsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadGroups();
    }, []),
  );

  async function loadGroups() {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      setGroups(await listGroups(token));
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setError(getErrorMessage(exception, 'Não foi possível carregar seus grupos.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
      <YStack flex={1}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
          <YStack gap="$5" paddingVertical="$3">
            <YStack gap="$1">
              <Text color="$onzeGreen" fontSize={14} fontWeight="900">GRUPOS</Text>
              <Text color="$onzeInk" fontSize={30} fontWeight="900">Suas peladas</Text>
              <Text color="$onzeMuted" fontSize={14} lineHeight={20}>
                Entre em um grupo ou crie uma nova pelada para organizar com seus amigos.
              </Text>
            </YStack>

            <XStack gap="$2">
              <AppButton
                variant="outline"


                flex={1}

                onPress={() => router.push('/join-group')}
              >
                <Text color="$onzeGreen" fontSize={13} fontWeight="800">Entrar em grupo</Text>
              </AppButton>
              <AppButton
                variant="primary"
                flex={1}

                onPress={() => router.push('/create-group')}
              >
                <Text color="$onzeSurface" fontSize={13} fontWeight="800">+ Criar grupo</Text>
              </AppButton>
            </XStack>

            {loading ? (
              <YStack alignItems="center" padding="$6">
                <Text color="$onzeMuted">Carregando grupos...</Text>
              </YStack>
            ) : error ? (
              <YStack
                backgroundColor="$onzeSurface"
                borderColor="$onzeDanger"
                borderRadius="$5"
                borderWidth={1}
                gap="$3"
                padding="$4"
              >
                <Text color="$onzeDanger" fontSize={13}>{error}</Text>
                <AppButton variant="primary" onPress={() => void loadGroups()}>
                  <Text color="$onzeSurface" fontWeight="800">Tentar novamente</Text>
                </AppButton>
              </YStack>
            ) : groups.length === 0 ? (
              <YStack
                alignItems="center"
                backgroundColor="$onzeSurface"
                borderColor="$onzeBorder"
                borderRadius="$6"
                borderWidth={1}
                gap="$3"
                padding="$6"
              >
                <Image
                  source={require('../assets/icon.png')}
                  style={{ width: 82, height: 82, borderRadius: 20 }}
                />
                <Text color="$onzeInk" fontSize={18} fontWeight="800" textAlign="center">
                  Você ainda não participa de um grupo
                </Text>
                <Text color="$onzeMuted" fontSize={14} lineHeight={20} textAlign="center">
                  Crie sua pelada ou entre usando o convite de um amigo.
                </Text>
              </YStack>
            ) : (
              <YStack gap="$3">
                {groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onPress={() => router.push({ pathname: '/group', params: { groupId: group.id } })}
                  />
                ))}
              </YStack>
            )}
          </YStack>
        </ScrollView>
        <BottomNavigation active="groups" />
      </YStack>
    </SafeAreaView>
  );
}

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const roleLabel =
    group.role === 'PRIMARY_ADMIN'
      ? 'ADMIN PRINCIPAL'
      : group.role === 'ADMIN'
        ? 'ADMIN'
        : 'MEMBRO';

  return (
    <Pressable onPress={onPress}>
      <XStack
        alignItems="center"
        backgroundColor="$onzeSurface"
        borderColor="$onzeBorder"
        borderRadius="$5"
        borderWidth={1}
        gap="$3"
        padding="$4"
      >
        <Image
          source={group.photoUrl ? { uri: group.photoUrl } : require('../assets/icon.png')}
          style={{ width: 62, height: 62, borderRadius: 16 }}
        />
        <YStack flex={1} gap="$1">
          <Text color="$onzeInk" fontSize={17} fontWeight="800">{group.name}</Text>
          <Text color="$onzeMuted" fontSize={13} numberOfLines={1}>
            {group.city || group.venue || 'Local ainda não configurado'}
          </Text>
          <Text color={group.role === 'MEMBER' ? '$onzeMuted' : '$onzeGreen'} fontSize={11} fontWeight="800">
            {roleLabel}
          </Text>
        </YStack>
        <Text color="$onzeMuted" fontSize={24} fontWeight="700">›</Text>
      </XStack>
    </Pressable>
  );
}
