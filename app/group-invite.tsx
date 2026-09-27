import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, Share } from 'react-native';
import { Text, YStack } from 'tamagui';

import { ONZE_COLORS } from '../src/theme/colors';

import { getErrorMessage } from '../src/lib/errors';

import { AppButton } from '../src/components/app-button';
import { ConfirmActionModal } from '../src/components/confirm-action-modal';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  createGroupInvite,
  GroupInvite,
  regenerateGroupInvite,
} from '../src/lib/api';
import { getAccessToken } from '../src/lib/auth-storage';

export default function GroupInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string; groupName?: string }>();
  const [invite, setInvite] = useState<GroupInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateConfirmationVisible, setRegenerateConfirmationVisible] = useState(false);

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
      setError(getErrorMessage(exception, 'Não foi possível gerar o convite.'));
    } finally {
      setLoading(false);
    }
  }

  async function shareInvite() {
    if (!invite) return;
    const groupLabel = params.groupName?.trim() || 'meu grupo';
    await Share.share({
      message: `Entre no ${groupLabel} pelo Onze ⚽\n\n${invite.shareUrl}\n\nCódigo: ${invite.code}`,
      title: `Convite para ${groupLabel}`,
    });
  }

  function confirmRegenerate() {
    if (regenerating) return;
    setRegenerateConfirmationVisible(true);
  }

  async function regenerateInvite() {
    if (!params.groupId || regenerating) return;
    setRegenerating(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      setInvite(await regenerateGroupInvite(token, params.groupId));
      setMessage('Novo convite gerado. O link e o código anteriores não funcionam mais.');
    } catch (exception) {
      setError(
        getErrorMessage(exception, 'Não foi possível gerar um novo convite.'),
      );
    } finally {
      setRegenerating(false);
      setRegenerateConfirmationVisible(false);
    }
  }

  function finish() {
    if (params.groupId) {
      router.replace({ pathname: '/group', params: { groupId: params.groupId } });
      return;
    }
    router.replace('/groups');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
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
              O mesmo link pode ser usado por várias pessoas. O endereço abaixo é clicável no WhatsApp e abre a página de convite do Onze.
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
              <Text color="$onzeMuted" fontSize={12} lineHeight={18} textAlign="center">
                {invite.shareUrl}
              </Text>

              <AppButton
                alignSelf="stretch"
                variant="primary"

                marginTop="$2"
                onPress={() => void shareInvite()}
                pressStyle={{ backgroundColor: '$onzeGreenPress' }}
              >
                <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                  Compartilhar convite
                </Text>
              </AppButton>

              <AppButton
                alignSelf="stretch"
                variant="secondary"


                disabled={regenerating}

                onPress={confirmRegenerate}
              >
                <Text color="$onzeInk" fontSize={14} fontWeight="700">
                  {regenerating ? 'Gerando...' : 'Gerar novo convite'}
                </Text>
              </AppButton>

              <Text color="$onzeMuted" fontSize={12} lineHeight={18} textAlign="center">
                Gere outro somente se quiser invalidar o link que já foi compartilhado.
              </Text>
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
              <AppButton variant="primary" onPress={() => void loadInvite()}>
                <Text color="$onzeSurface" fontWeight="800">
                  Tentar novamente
                </Text>
              </AppButton>
            </YStack>
          )}

          {message ? (
            <Text color="$onzeGreen" fontSize={13} fontWeight="700" lineHeight={19}>
              {message}
            </Text>
          ) : null}

          {error && invite ? (
            <Text color="$onzeDanger" fontSize={13} lineHeight={19}>
              {error}
            </Text>
          ) : null}

          <AppButton
            variant="secondary"



            onPress={finish}
          >
            <Text color="$onzeInk" fontSize={15} fontWeight="700">
              Voltar ao grupo
            </Text>
          </AppButton>
        </YStack>
      </YStack>
      <ConfirmActionModal
        visible={regenerateConfirmationVisible}
        title="Gerar novo convite?"
        message="O link e o código atuais deixarão de funcionar. Quem já entrou no grupo continuará normalmente."
        confirmLabel="Gerar novo convite"
        destructive
        loading={regenerating}
        loadingLabel="Gerando..."
        onCancel={() => setRegenerateConfirmationVisible(false)}
        onConfirm={() => void regenerateInvite()}
      />
    </SafeAreaView>
  );
}
