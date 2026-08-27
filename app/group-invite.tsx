import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, Share } from 'react-native';
import { Button, Text, YStack } from 'tamagui';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { createGroupInvite, GroupInvite } from '../src/lib/api';
import { getAccessToken } from '../src/lib/auth-storage';

export default function GroupInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string; groupName?: string }>();
  const [invite, setInvite] = useState<GroupInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadInvite();
  }, [params.groupId]);

  async function loadInvite() {
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
      setInvite(await createGroupInvite(token, params.groupId));
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível gerar o convite.');
    } finally {
      setLoading(false);
    }
  }

  async function shareInvite() {
    if (!invite) return;
    const groupLabel = params.groupName?.trim() || 'meu grupo';
    await Share.share({
      message: `Entre no ${groupLabel} pelo Onze.\n\nCódigo: ${invite.code}\nLink: ${invite.deepLink}`,
      title: `Convite para ${groupLabel}`,
    });
  }

  if (loading) {
    return (
      <ServerLoadingScreen
        title="Preparando convite..."
        message="Estamos gerando o código para seus jogadores."
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <YStack flex={1} justifyContent="center" padding="$5">
        <YStack gap="$5">
          <YStack gap="$1">
            <Text color="$onzeGreen" fontSize={14} fontWeight="800">
              CONVIDAR JOGADORES
            </Text>
            <Text color="$onzeInk" fontSize={30} fontWeight="800">
              Compartilhe o convite
            </Text>
            <Text color="$onzeMuted" fontSize={15} lineHeight={22}>
              Envie o link ou passe o código para quem você quer adicionar ao grupo.
            </Text>
          </YStack>

          {invite ? (
            <YStack
              alignItems="center"
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$6"
              borderWidth={1}
              gap="$3"
              padding="$6"
            >
              <Text color="$onzeMuted" fontSize={13} fontWeight="700">
                CÓDIGO DO GRUPO
              </Text>
              <Text
                color="$onzeGreen"
                fontSize={34}
                fontWeight="900"
                letterSpacing={4}
                textAlign="center"
              >
                {invite.code}
              </Text>
              <Text color="$onzeMuted" fontSize={12} textAlign="center">
                {invite.deepLink}
              </Text>

              <Button
                alignSelf="stretch"
                backgroundColor="$onzeGreen"
                height={52}
                marginTop="$2"
                onPress={() => void shareInvite()}
                pressStyle={{ backgroundColor: '$onzeGreenPress' }}
              >
                <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                  Compartilhar convite
                </Text>
              </Button>
            </YStack>
          ) : (
            <YStack
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$6"
              borderWidth={1}
              gap="$3"
              padding="$5"
            >
              <Text color="$onzeDanger" fontSize={14} lineHeight={20}>
                {error ?? 'Não foi possível gerar o convite.'}
              </Text>
              <Button
                backgroundColor="$onzeGreen"
                onPress={() => void loadInvite()}
              >
                <Text color="$onzeSurface" fontWeight="800">
                  Tentar novamente
                </Text>
              </Button>
            </YStack>
          )}

          <Button
            backgroundColor="$onzeSurface"
            borderColor="$onzeBorder"
            borderWidth={1}
            height={50}
            onPress={() => router.replace('/home')}
          >
            <Text color="$onzeInk" fontSize={15} fontWeight="700">
              Concluir
            </Text>
          </Button>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
