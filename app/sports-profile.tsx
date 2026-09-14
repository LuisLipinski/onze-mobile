import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Switch } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  getMemberSportsProfile,
  getOwnSportsProfile,
  updateMemberSportsProfile,
  updateOwnSportsProfile,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';
import {
  DOMINANT_FOOT_OPTIONS,
  DominantFoot,
  formatTechnicalLevel,
  getSportsProfileValidationError,
  PLAYER_POSITION_OPTIONS,
  PlayerPosition,
  TECHNICAL_LEVEL_OPTIONS,
  togglePlayerPosition,
} from '../src/lib/sports-profile';

export default function SportsProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    groupId: string;
    groupName?: string;
    membershipId?: string;
    memberName?: string;
  }>();
  const adminMode = Boolean(params.membershipId);
  const [displayName, setDisplayName] = useState(params.memberName?.trim() || 'Jogador');
  const [positions, setPositions] = useState<PlayerPosition[]>([]);
  const [canPlayGoalkeeper, setCanPlayGoalkeeper] = useState(false);
  const [dominantFoot, setDominantFoot] = useState<DominantFoot | null>(null);
  const [technicalLevel, setTechnicalLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [params.groupId, params.membershipId]),
  );

  async function loadProfile() {
    if (!params.groupId) {
      setError('Não foi possível identificar o grupo.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const profile = adminMode && params.membershipId
        ? await getMemberSportsProfile(token, params.groupId, params.membershipId)
        : await getOwnSportsProfile(token, params.groupId);
      setDisplayName(profile.displayName);
      setPositions(profile.positions ?? []);
      setCanPlayGoalkeeper(profile.canPlayGoalkeeper);
      setDominantFoot(profile.dominantFoot);
      setTechnicalLevel(profile.technicalLevel);
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setError(exception instanceof Error ? exception.message : 'Não foi possível carregar o perfil esportivo.');
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!params.groupId || saving) return;
    const validationError = getSportsProfileValidationError(
      positions,
      canPlayGoalkeeper,
      dominantFoot,
    );
    if (validationError) {
      setError(validationError);
      setMessage(null);
      return;
    }
    if (adminMode && technicalLevel == null) {
      setError('Escolha o nível técnico do jogador.');
      setMessage(null);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }

      if (adminMode && params.membershipId) {
        await updateMemberSportsProfile(token, params.groupId, params.membershipId, {
          positions,
          canPlayGoalkeeper,
          dominantFoot: dominantFoot!,
          technicalLevel: technicalLevel!,
        });
      } else {
        await updateOwnSportsProfile(token, params.groupId, {
          positions,
          canPlayGoalkeeper,
          dominantFoot: dominantFoot!,
        });
      }
      setMessage(adminMode
        ? 'Perfil e avaliação técnica atualizados.'
        : 'Seu perfil esportivo foi atualizado neste grupo.');
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setError(exception instanceof Error ? exception.message : 'Não foi possível salvar o perfil esportivo.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <ServerLoadingScreen title="Carregando perfil..." message="Buscando posições e preferências do jogador." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
        <YStack gap="$5" paddingVertical="$3">
          <Button alignSelf="flex-start" backgroundColor="transparent" onPress={() => router.back()}>
            <Text color="$onzeGreen" fontWeight="700">← Voltar</Text>
          </Button>

          <YStack gap="$1">
            <Text color="$onzeGreen" fontSize={14} fontWeight="900">
              {adminMode ? 'PERFIL DO JOGADOR' : 'MEU PERFIL ESPORTIVO'}
            </Text>
            <Text color="$onzeInk" fontSize={28} fontWeight="900">{displayName}</Text>
            <Text color="$onzeMuted" fontSize={14} lineHeight={21}>
              {adminMode
                ? `Atualize as características de ${displayName} em ${params.groupName?.trim() || 'este grupo'}.`
                : `Estas informações valem somente em ${params.groupName?.trim() || 'este grupo'} e ajudarão na formação dos times.`}
            </Text>
          </YStack>

          {error ? (
            <YStack backgroundColor="$onzeSurface" borderColor="$onzeDanger" borderRadius="$5" borderWidth={1} padding="$4">
              <Text color="$onzeDanger" fontSize={13} lineHeight={19}>{error}</Text>
            </YStack>
          ) : null}
          {message ? (
            <YStack backgroundColor="$onzeSurface" borderColor="$onzeGreen" borderRadius="$5" borderWidth={1} padding="$4">
              <Text color="$onzeGreen" fontSize={13} fontWeight="700" lineHeight={19}>{message}</Text>
            </YStack>
          ) : null}

          <ProfileSection
            title="Posições de linha"
            description="Você pode escolher mais de uma."
          >
            <XStack flexWrap="wrap" gap="$2">
              {PLAYER_POSITION_OPTIONS.map((option) => (
                <ChoiceButton
                  key={option.value}
                  label={option.label}
                  selected={positions.includes(option.value)}
                  onPress={() => {
                    setPositions((current) => togglePlayerPosition(current, option.value));
                    setError(null);
                    setMessage(null);
                  }}
                />
              ))}
            </XStack>
          </ProfileSection>

          <ProfileSection
            title="Goleiro"
            description="Esta opção é independente e pode ser combinada com posições de linha."
          >
            <XStack alignItems="center" justifyContent="space-between" gap="$4">
              <Text color="$onzeInk" flex={1} fontSize={14} fontWeight="700">Também jogo como goleiro</Text>
              <Switch
                accessibilityLabel="Também jogo como goleiro"
                disabled={saving}
                onValueChange={(enabled) => {
                  setCanPlayGoalkeeper(enabled);
                  setError(null);
                  setMessage(null);
                }}
                thumbColor="#FFFFFF"
                trackColor={{ false: '#C9D2CC', true: '#148A4A' }}
                value={canPlayGoalkeeper}
              />
            </XStack>
          </ProfileSection>

          <ProfileSection title="Pé dominante" description="Escolha a opção que melhor representa seu jogo.">
            <XStack flexWrap="wrap" gap="$2">
              {DOMINANT_FOOT_OPTIONS.map((option) => (
                <ChoiceButton
                  key={option.value}
                  label={option.label}
                  selected={dominantFoot === option.value}
                  onPress={() => {
                    setDominantFoot(option.value);
                    setError(null);
                    setMessage(null);
                  }}
                />
              ))}
            </XStack>
          </ProfileSection>

          {adminMode ? (
            <ProfileSection
              title="Nível técnico"
              description="Avaliação administrativa usada para equilibrar os times, de 1 a 5."
            >
              <YStack gap="$2">
                {TECHNICAL_LEVEL_OPTIONS.map((option) => (
                  <ChoiceButton
                    key={option.value}
                    label={`${option.value} — ${option.label}`}
                    selected={technicalLevel === option.value}
                    fullWidth
                    onPress={() => {
                      setTechnicalLevel(option.value);
                      setError(null);
                      setMessage(null);
                    }}
                  />
                ))}
              </YStack>
            </ProfileSection>
          ) : (
            <YStack backgroundColor="$onzeCanvas" borderColor="$onzeBorder" borderRadius="$5" borderWidth={1} gap="$1" padding="$4">
              <Text color="$onzeMuted" fontSize={11} fontWeight="900">AVALIAÇÃO TÉCNICA</Text>
              <Text color="$onzeInk" fontSize={15} fontWeight="800">{formatTechnicalLevel(technicalLevel)}</Text>
              <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                O Administrador Principal ou um admin autorizado define esta avaliação.
              </Text>
            </YStack>
          )}

          <Button backgroundColor="$onzeGreen" disabled={saving} height={52} onPress={() => void saveProfile()}>
            <Text color="$onzeSurface" fontSize={16} fontWeight="800">
              {saving ? 'Salvando...' : 'Salvar perfil esportivo'}
            </Text>
          </Button>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$4" padding="$5">
      <YStack gap="$1">
        <Text color="$onzeInk" fontSize={17} fontWeight="800">{title}</Text>
        <Text color="$onzeMuted" fontSize={12} lineHeight={18}>{description}</Text>
      </YStack>
      {children}
    </YStack>
  );
}

function ChoiceButton({
  label,
  selected,
  fullWidth = false,
  onPress,
}: {
  label: string;
  selected: boolean;
  fullWidth?: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      accessibilityState={{ selected }}
      backgroundColor={selected ? '$onzeGreen' : '$onzeSurface'}
      borderColor={selected ? '$onzeGreen' : '$onzeBorder'}
      borderWidth={1}
      flex={fullWidth ? undefined : 1}
      minWidth={fullWidth ? undefined : 138}
      onPress={onPress}
      width={fullWidth ? '100%' : undefined}
    >
      <Text color={selected ? '$onzeSurface' : '$onzeInk'} fontSize={13} fontWeight="800">
        {label}
      </Text>
    </Button>
  );
}
