import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { getAccessToken } from '../src/lib/auth-storage';
import {
  addDevTestPlayersToMatch,
  applyDevTestScenario,
  DEV_TEST_PLAYER_PRESETS,
  DEV_TEST_SCENARIOS,
  DevTestScenario,
  DevTestStatus,
  generateDevTestPlayers,
  getDevTestStatus,
  removeDevTestPlayersFromMatch,
} from '../src/lib/dev-test-data';

export default function DevTestDataScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const [status, setStatus] = useState<DevTestStatus | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params.matchId) {
      setError('Não foi possível identificar a partida.');
      return;
    }
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      setStatus(await getDevTestStatus(token, params.matchId));
      setError(null);
    } catch (exception) {
      setError(exception instanceof Error
        ? exception.message
        : 'Não foi possível carregar as ferramentas de teste.');
    }
  }, [params.matchId, router]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  async function runAction(key: string, operation: (token: string, matchId: string) => Promise<string>) {
    if (!params.matchId || running) return;
    setRunning(key);
    setError(null);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      setMessage(await operation(token, params.matchId));
      setStatus(await getDevTestStatus(token, params.matchId));
    } catch (exception) {
      setError(exception instanceof Error
        ? exception.message
        : 'Não foi possível concluir a operação de teste.');
    } finally {
      setRunning(null);
    }
  }

  function generate(count: number) {
    void runAction(`generate-${count}`, async (token, matchId) => {
      const result = await generateDevTestPlayers(token, matchId, count);
      return result.created > 0
        ? `${result.created} jogador(es) criado(s). O grupo agora possui ${result.totalTestPlayers} jogadores de teste.`
        : `Os ${count} jogadores já existiam e foram reaproveitados.`;
    });
  }

  function applyScenario(scenario: DevTestScenario, label: string) {
    void runAction(`scenario-${scenario}`, async (token, matchId) => {
      const result = await applyDevTestScenario(token, matchId, scenario);
      return `${label} aplicado em ${result.updatedPlayers} jogador(es) de teste.`;
    });
  }

  function addToMatch() {
    void runAction('add-attendance', async (token, matchId) => {
      const result = await addDevTestPlayersToMatch(token, matchId);
      const capacityMessage = result.skippedCapacity > 0
        ? ` ${result.skippedCapacity} ficaram de fora porque a partida atingiu o máximo.`
        : '';
      return `${result.added} jogador(es) adicionado(s) à partida.${capacityMessage}`;
    });
  }

  function removeFromMatch() {
    void runAction('remove-attendance', async (token, matchId) => {
      const result = await removeDevTestPlayersFromMatch(token, matchId);
      return `${result.removed} jogador(es) de teste removido(s) desta partida.`;
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <YStack gap="$5" paddingVertical="$3">
          <Button alignSelf="flex-start" backgroundColor="transparent" onPress={() => router.back()}>
            <Text color="$onzeGreen" fontWeight="800">← Voltar</Text>
          </Button>

          <YStack gap="$1">
            <Text color="#8A6414" fontSize={13} fontWeight="900">AMBIENTE DE TESTE</Text>
            <Text color="$onzeInk" fontSize={28} fontWeight="900">Massa de jogadores</Text>
            <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
              Crie uma massa nova, variada e com goleiros para validar a formação dos times.
            </Text>
          </YStack>

          <YStack backgroundColor="#FFF7E6" borderRadius="$5" gap="$2" padding="$4">
            <Text color="#8A6414" fontSize={13} fontWeight="900">Somente development</Text>
            <Text color="#8A6414" fontSize={12} lineHeight={18}>
              Esta ferramenta só funciona no backend de desenvolvimento e apenas para o Administrador Principal. Os cenários sobrescrevem posições e habilidades somente dos jogadores Teste XX.
            </Text>
          </YStack>

          {error ? (
            <YStack backgroundColor="#FDECEC" borderRadius="$5" padding="$4">
              <Text color="$onzeDanger" fontSize={13} lineHeight={19}>{error}</Text>
            </YStack>
          ) : null}

          {message ? (
            <YStack backgroundColor="#EAF5EE" borderRadius="$5" padding="$4">
              <Text color="$onzeGreen" fontSize={13} fontWeight="800" lineHeight={19}>{message}</Text>
            </YStack>
          ) : null}

          {status ? (
            <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
              <Text color="$onzeInk" fontSize={17} fontWeight="900">Estado atual</Text>
              <XStack gap="$2">
                <YStack backgroundColor="$onzeCanvas" borderRadius="$4" flex={1} gap="$1" padding="$3">
                  <Text color="$onzeMuted" fontSize={10} fontWeight="800">NO GRUPO</Text>
                  <Text color="$onzeInk" fontSize={18} fontWeight="900">{status.testPlayers}</Text>
                </YStack>
                <YStack backgroundColor="$onzeCanvas" borderRadius="$4" flex={1} gap="$1" padding="$3">
                  <Text color="$onzeMuted" fontSize={10} fontWeight="800">NA PARTIDA</Text>
                  <Text color="$onzeInk" fontSize={18} fontWeight="900">{status.testPlayersGoing}</Text>
                </YStack>
                <YStack backgroundColor="$onzeCanvas" borderRadius="$4" flex={1} gap="$1" padding="$3">
                  <Text color="$onzeMuted" fontSize={10} fontWeight="800">VAGAS</Text>
                  <Text color="$onzeInk" fontSize={18} fontWeight="900">
                    {status.occupiedSpots}/{status.maxPlayers}
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          ) : null}

          <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
            <YStack gap="$1">
              <Text color="$onzeInk" fontSize={17} fontWeight="900">1. Gerar jogadores</Text>
              <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                Ao gerar, todos os jogadores Teste XX anteriores deste grupo são removidos e substituídos por jogadores novos, com níveis variados e goleiros.
              </Text>
            </YStack>
            <XStack flexWrap="wrap" gap="$2">
              {DEV_TEST_PLAYER_PRESETS.map((preset) => (
                <Button
                  key={preset.count}
                  backgroundColor="$onzeCanvas"
                  disabled={Boolean(running)}
                  onPress={() => generate(preset.count)}
                >
                  <Text color="$onzeGreen" fontSize={12} fontWeight="900">
                    {running === `generate-${preset.count}` ? 'Gerando...' : preset.label}
                  </Text>
                </Button>
              ))}
            </XStack>
          </YStack>

          <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
            <YStack gap="$1">
              <Text color="$onzeInk" fontSize={17} fontWeight="900">2. Aplicar cenário</Text>
              <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                Use quando quiser restaurar uma massa conhecida ou testar um tipo específico de balanceamento.
              </Text>
            </YStack>
            {DEV_TEST_SCENARIOS.map((scenario) => (
              <Button
                key={scenario.value}
                alignItems="flex-start"
                backgroundColor="$onzeCanvas"
                disabled={Boolean(running) || !status?.testPlayers}
                height="auto"
                minHeight={58}
                onPress={() => applyScenario(scenario.value, scenario.label)}
                padding="$3"
              >
                <YStack alignItems="flex-start" gap="$1">
                  <Text color="$onzeGreen" fontSize={13} fontWeight="900">
                    {running === `scenario-${scenario.value}` ? 'Aplicando...' : scenario.label}
                  </Text>
                  <Text color="$onzeMuted" fontSize={11} lineHeight={16} textAlign="left">
                    {scenario.description}
                  </Text>
                </YStack>
              </Button>
            ))}
          </YStack>

          <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
            <YStack gap="$1">
              <Text color="$onzeInk" fontSize={17} fontWeight="900">3. Colocar na partida</Text>
              <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                Adiciona os Teste XX como “Vou jogar” até atingir o máximo configurado da partida. Times já gerados são invalidados para você gerar novamente.
              </Text>
            </YStack>
            <Button
              backgroundColor="$onzeGreen"
              disabled={Boolean(running) || !status?.testPlayers}
              height={50}
              onPress={addToMatch}
            >
              <Text color="$onzeSurface" fontWeight="900">
                {running === 'add-attendance' ? 'Adicionando...' : 'Adicionar jogadores à partida'}
              </Text>
            </Button>
            <Button
              backgroundColor="$onzeCanvas"
              disabled={Boolean(running) || !status?.testPlayersGoing}
              height={46}
              onPress={removeFromMatch}
            >
              <Text color="$onzeDanger" fontWeight="900">
                {running === 'remove-attendance' ? 'Removendo...' : 'Remover jogadores de teste da partida'}
              </Text>
            </Button>
          </YStack>

          <Button
            backgroundColor="$onzeCanvas"
            onPress={() => router.back()}
          >
            <Text color="$onzeGreen" fontWeight="900">Voltar para a escalação</Text>
          </Button>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
