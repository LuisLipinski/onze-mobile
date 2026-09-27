import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native';
import { Text, YStack } from 'tamagui';

import { ONZE_COLORS } from '../src/theme/colors';

import { AppButton } from '../src/components/app-button';
import { ConfirmActionModal } from '../src/components/confirm-action-modal';

export default function CreateGroupInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string; groupName?: string }>();
  const [skipInfoVisible, setSkipInfoVisible] = useState(false);

  function skip() {
    setSkipInfoVisible(true);
  }

  function addPlayers() {
    router.replace({
      pathname: '/group-invite',
      params: { groupId: params.groupId, groupName: params.groupName ?? '' },
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
      <YStack flex={1} justifyContent="center" padding="$5">
        <YStack gap="$5">
          <YStack gap="$1">
            <Text color="$onzeGreen" fontSize={14} fontWeight="800">
              ETAPA 3 DE 3
            </Text>
            <Text color="$onzeInk" fontSize={30} fontWeight="800">
              Grupo criado! 🎉
            </Text>
            <Text color="$onzeMuted" fontSize={15} lineHeight={22}>
              {params.groupName
                ? `${params.groupName} já está pronto. Quer adicionar alguém agora?`
                : 'Seu grupo já está pronto. Quer adicionar alguém agora?'}
            </Text>
          </YStack>

          <YStack
            backgroundColor="$onzeSurface"
            borderColor="$onzeBorder"
            borderRadius="$6"
            borderWidth={1}
            gap="$3"
            padding="$5"
          >
            <Text color="$onzeInk" fontSize={17} fontWeight="800">
              Convide seus jogadores
            </Text>
            <Text color="$onzeMuted" fontSize={14} lineHeight={20}>
              Você pode gerar um convite para compartilhar com quem participa da pelada.
            </Text>

            <AppButton
              variant="primary"

              onPress={addPlayers}
              pressStyle={{ backgroundColor: '$onzeGreenPress' }}
            >
              <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                Adicionar jogadores
              </Text>
            </AppButton>

            <AppButton
              variant="secondary"



              onPress={skip}
            >
              <Text color="$onzeInk" fontSize={15} fontWeight="700">
                Pular
              </Text>
            </AppButton>
          </YStack>
        </YStack>
      </YStack>
      <ConfirmActionModal
        visible={skipInfoVisible}
        title="Você pode convidar depois"
        message="Novos jogadores podem ser adicionados a qualquer momento no menu do grupo > Jogadores e convites."
        confirmLabel="Ir para meus grupos"
        cancelLabel={null}
        onCancel={() => setSkipInfoVisible(false)}
        onConfirm={() => router.replace('/groups')}
      />
    </SafeAreaView>
  );
}
