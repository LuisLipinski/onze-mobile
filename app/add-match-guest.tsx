import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Switch } from 'react-native';
import { Button, Input, Text, XStack, YStack } from 'tamagui';

import { PlayerPositionSelect } from '../src/components/player-position-select';
import { TechnicalRatingEditor } from '../src/components/technical-rating-editor';
import {
  addMatchGuest,
  getTechnicalConfiguration,
  PlayerSkill,
} from '../src/lib/api';
import { getAccessToken } from '../src/lib/auth-storage';
import type { PlayerPosition } from '../src/lib/sports-profile';

export default function AddMatchGuestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    matchId?: string;
    canEvaluate?: string;
  }>();
  const canEvaluate = params.canEvaluate === 'true';
  const [name, setName] = useState('');
  const [primaryPosition, setPrimaryPosition] = useState<PlayerPosition | null>(null);
  const [secondaryPosition, setSecondaryPosition] = useState<PlayerPosition | null>(null);
  const [wantsSecondary, setWantsSecondary] = useState(false);
  const [picker, setPicker] = useState<'primary' | 'secondary' | null>(null);
  const [wantsEvaluation, setWantsEvaluation] = useState(false);
  const [ratings, setRatings] = useState<Partial<Record<PlayerSkill, number>>>({});
  const [important, setImportant] = useState<ReadonlySet<PlayerSkill>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canEvaluate || !primaryPosition) {
      setImportant(new Set());
      return;
    }
    void getAccessToken().then(async (token) => {
      if (!token) return;
      const config = await getTechnicalConfiguration(token);
      setImportant(new Set([
        ...(config.positionImportantSkills[primaryPosition] ?? []),
        ...(secondaryPosition ? config.positionImportantSkills[secondaryPosition] ?? [] : []),
      ]));
    }).catch(() => setImportant(new Set()));
  }, [canEvaluate, primaryPosition, secondaryPosition]);

  async function submit() {
    if (!params.matchId || saving) return;
    if (!name.trim()) {
      setError('Informe o nome do convidado.');
      return;
    }
    if (!primaryPosition) {
      setError('Escolha a posição principal do convidado.');
      return;
    }
    if (wantsSecondary && !secondaryPosition) {
      setError('Escolha a segunda posição do convidado.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      await addMatchGuest(token, params.matchId, {
        displayName: name.trim(),
        primaryPosition,
        secondaryPosition: wantsSecondary ? secondaryPosition ?? undefined : undefined,
        ratings: canEvaluate && wantsEvaluation ? ratings : undefined,
      });
      router.back();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível adicionar o convidado.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <YStack gap="$5" paddingVertical="$3">
          <Button alignSelf="flex-start" backgroundColor="transparent" onPress={() => router.back()}>
            <Text color="$onzeGreen" fontWeight="800">← Voltar</Text>
          </Button>
          <YStack gap="$1">
            <Text color="$onzeGreen" fontSize={13} fontWeight="900">CONVIDADO DA PARTIDA</Text>
            <Text color="$onzeInk" fontSize={28} fontWeight="900">Adicionar jogador</Text>
            <Text color="$onzeMuted" fontSize={13} lineHeight={20}>
              Este cadastro vale somente para esta participação e não cria uma conta Onze.
            </Text>
          </YStack>

          <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$4" padding="$5">
            <YStack gap="$2">
              <Text color="$onzeMuted" fontSize={11} fontWeight="900">NOME *</Text>
              <Input
                autoCapitalize="words"
                backgroundColor="$onzeSurface"
                borderColor="$onzeBorder"
                color="$onzeInk"
                maxLength={120}
                onChangeText={setName}
                placeholder="Ex.: João"
                placeholderTextColor="$onzeMuted"
                value={name}
              />
            </YStack>
            <YStack gap="$2">
              <Text color="$onzeMuted" fontSize={11} fontWeight="900">POSIÇÃO PRINCIPAL *</Text>
              <PlayerPositionSelect
                label="Posição principal do convidado"
                value={primaryPosition}
                visible={picker === 'primary'}
                disabledPosition={secondaryPosition}
                disabled={saving}
                onOpen={() => setPicker('primary')}
                onClose={() => setPicker(null)}
                onSelect={setPrimaryPosition}
              />
            </YStack>
            <XStack alignItems="center" gap="$3" justifyContent="space-between">
              <Text color="$onzeInk" flex={1} fontSize={14} fontWeight="800">Adicionar segunda posição</Text>
              <Switch
                value={wantsSecondary}
                onValueChange={(value) => {
                  setWantsSecondary(value);
                  if (!value) setSecondaryPosition(null);
                }}
                trackColor={{ false: '#C9D2CC', true: '#148A4A' }}
                thumbColor="#FFFFFF"
              />
            </XStack>
            {wantsSecondary ? (
              <PlayerPositionSelect
                label="Segunda posição do convidado"
                value={secondaryPosition}
                visible={picker === 'secondary'}
                disabledPosition={primaryPosition}
                disabled={saving}
                onOpen={() => setPicker('secondary')}
                onClose={() => setPicker(null)}
                onSelect={setSecondaryPosition}
              />
            ) : null}
          </YStack>

          {canEvaluate ? (
            <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$4" padding="$5">
              <XStack alignItems="center" gap="$3" justifyContent="space-between">
                <YStack flex={1} gap="$1">
                  <Text color="$onzeInk" fontSize={17} fontWeight="900">Avaliar jogador</Text>
                  <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                    Desligue se não souber nada sobre ele. O balanceamento usará apenas o fallback estimado.
                  </Text>
                </YStack>
                <Switch
                  accessibilityLabel="Avaliar jogador convidado"
                  value={wantsEvaluation}
                  onValueChange={setWantsEvaluation}
                  trackColor={{ false: '#C9D2CC', true: '#148A4A' }}
                  thumbColor="#FFFFFF"
                />
              </XStack>
              {wantsEvaluation ? (
                <TechnicalRatingEditor
                  ratings={ratings}
                  importantSkills={important}
                  disabled={saving}
                  onChange={(skill, value) => setRatings((current) => {
                    const next = { ...current };
                    if (value == null) delete next[skill];
                    else next[skill] = value;
                    return next;
                  })}
                />
              ) : (
                <Text color="$onzeMuted" fontSize={13} fontWeight="800">
                  Não sei nada sobre esse jogador
                </Text>
              )}
            </YStack>
          ) : (
            <YStack backgroundColor="$onzeCanvas" borderRadius="$5" padding="$4">
              <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                O convidado será adicionado sem avaliação. Somente admins autorizados podem registrar habilidades.
              </Text>
            </YStack>
          )}

          {error ? <Text color="$onzeDanger" fontSize={13}>{error}</Text> : null}
          <Button backgroundColor="$onzeGreen" disabled={saving} height={54} onPress={() => void submit()}>
            <Text color="$onzeSurface" fontSize={16} fontWeight="900">
              {saving ? 'Adicionando...' : 'Adicionar convidado'}
            </Text>
          </Button>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
