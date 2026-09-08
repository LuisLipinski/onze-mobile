import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, SafeAreaView } from 'react-native';
import { Button, Text, YStack } from 'tamagui';

export default function CreateGroupInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string; groupName?: string }>();

  function skip() {
    Alert.alert(
      'Você pode convidar depois',
      'Novos jogadores podem ser adicionados a qualquer momento no menu do grupo > Jogadores e convites.',
      [{ text: 'Ir para meus grupos', onPress: () => router.replace('/groups') }],
    );
  }

  function addPlayers() {
    router.replace({
      pathname: '/group-invite',
      params: { groupId: params.groupId, groupName: params.groupName ?? '' },
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
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

            <Button
              backgroundColor="$onzeGreen"
              height={52}
              onPress={addPlayers}
              pressStyle={{ backgroundColor: '$onzeGreenPress' }}
            >
              <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                Adicionar jogadores
              </Text>
            </Button>

            <Button
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderWidth={1}
              height={50}
              onPress={skip}
            >
              <Text color="$onzeInk" fontSize={15} fontWeight="700">
                Pular
              </Text>
            </Button>
          </YStack>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
