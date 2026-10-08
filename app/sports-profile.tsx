import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Switch } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { ONZE_COLORS } from '../src/theme/colors';

import { getErrorMessage } from '../src/lib/errors';

import { AppButton } from '../src/components/app-button';

import { PlayerPositionSelect } from '../src/components/player-position-select';
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
  getSportsProfileValidationError,
  normalizedCanPlayGoalkeeper,
  PlayerPosition,
  shouldOfferGoalkeeperAvailability,
} from '../src/lib/sports-profile';

export default function SportsProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    groupId: string;
    groupName?: string;
    membershipId?: string;
    memberName?: string;
    required?: string;
  }>();
  const adminMode = Boolean(params.membershipId);
  const requiredMode = !adminMode && params.required === 'true';
  const [displayName, setDisplayName] = useState(params.memberName?.trim() || 'Jogador');
  const [primaryPosition, setPrimaryPosition] = useState<PlayerPosition | null>(null);
  const [secondaryPosition, setSecondaryPosition] = useState<PlayerPosition | null>(null);
  const [wantsSecondaryPosition, setWantsSecondaryPosition] = useState(false);
  const [positionPicker, setPositionPicker] = useState<'primary' | 'secondary' | null>(null);
  const [canPlayGoalkeeper, setCanPlayGoalkeeper] = useState(false);
  const [dominantFoot, setDominantFoot] = useState<DominantFoot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
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
      const loadedPrimary = profile.primaryPosition ?? profile.positions?.[0] ?? null;
      const loadedSecondary = profile.secondaryPosition ?? profile.positions?.[1] ?? null;
      setPrimaryPosition(loadedPrimary);
      setSecondaryPosition(loadedSecondary);
      setWantsSecondaryPosition(loadedSecondary != null);
      setCanPlayGoalkeeper(profile.canPlayGoalkeeper);
      setDominantFoot(profile.dominantFoot);
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setError(getErrorMessage(exception, 'Não foi possível carregar o perfil esportivo.'));
    } finally {
      setLoading(false);
    }
  }, [adminMode, params.groupId, params.membershipId, router]);

  useFocusEffect(useCallback(() => {
    void loadProfile();
  }, [loadProfile]));

  async function saveProfile() {
    if (!params.groupId || saving) return;
    const validationError = getSportsProfileValidationError(
      primaryPosition,
      secondaryPosition,
      wantsSecondaryPosition,
      dominantFoot,
    );
    if (validationError) {
      setError(validationError);
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

      const effectiveSecondary = wantsSecondaryPosition ? secondaryPosition ?? undefined : undefined;
      const effectiveCanPlayGoalkeeper = normalizedCanPlayGoalkeeper(
        primaryPosition,
        effectiveSecondary ?? null,
        canPlayGoalkeeper,
      );
      if (adminMode && params.membershipId) {
        await updateMemberSportsProfile(token, params.groupId, params.membershipId, {
          primaryPosition: primaryPosition!,
          secondaryPosition: effectiveSecondary,
          canPlayGoalkeeper: effectiveCanPlayGoalkeeper,
          dominantFoot: dominantFoot!,
        });
      } else {
        await updateOwnSportsProfile(token, params.groupId, {
          primaryPosition: primaryPosition!,
          secondaryPosition: effectiveSecondary,
          canPlayGoalkeeper: effectiveCanPlayGoalkeeper,
          dominantFoot: dominantFoot!,
        });
      }
      if (requiredMode) {
        router.replace({ pathname: '/group', params: { groupId: params.groupId } });
        return;
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
      setError(getErrorMessage(exception, 'Não foi possível salvar o perfil esportivo.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <ServerLoadingScreen title="Carregando perfil..." message="Buscando posições e preferências do jogador." />;
  }

  const showGoalkeeperAvailability = shouldOfferGoalkeeperAvailability(
    primaryPosition,
    wantsSecondaryPosition ? secondaryPosition : null,
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
        <YStack gap="$5" paddingVertical="$3">
          <AppButton
            alignSelf="flex-start"
            variant="ghost"
            onPress={() => requiredMode ? router.replace('/groups') : router.back()}
          >
            <Text color="$onzeGreen" fontWeight="700">← Voltar</Text>
          </AppButton>

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
            title="Posições"
            description="Defina uma posição principal e, se quiser, uma segunda posição diferente."
          >
            <YStack gap="$2">
              <Text color="$onzeMuted" fontSize={11} fontWeight="900">POSIÇÃO PRINCIPAL *</Text>
              <PlayerPositionSelect
                label="Posição principal"
                value={primaryPosition}
                visible={positionPicker === 'primary'}
                disabledPosition={wantsSecondaryPosition ? secondaryPosition : null}
                disabled={saving}
                onOpen={() => setPositionPicker('primary')}
                onClose={() => setPositionPicker(null)}
                onSelect={(position) => {
                  setPrimaryPosition(position);
                  if (position === secondaryPosition) {
                    setSecondaryPosition(null);
                  }
                  if (position === 'GOALKEEPER') setCanPlayGoalkeeper(false);
                  setError(null);
                  setMessage(null);
                }}
              />
            </YStack>

            <XStack alignItems="center" gap="$4" justifyContent="space-between">
              <Text color="$onzeInk" flex={1} fontSize={14} fontWeight="700">
                Deseja adicionar uma segunda posição?
              </Text>
              <Switch
                accessibilityLabel="Deseja adicionar uma segunda posição?"
                disabled={saving}
                onValueChange={(enabled) => {
                  setWantsSecondaryPosition(enabled);
                  if (!enabled) setSecondaryPosition(null);
                  setError(null);
                  setMessage(null);
                }}
                thumbColor={ONZE_COLORS.surface}
                trackColor={{ false: ONZE_COLORS.switchTrack, true: ONZE_COLORS.green }}
                value={wantsSecondaryPosition}
              />
            </XStack>

            {wantsSecondaryPosition ? (
              <YStack gap="$2">
                <Text color="$onzeMuted" fontSize={11} fontWeight="900">SEGUNDA POSIÇÃO *</Text>
                <PlayerPositionSelect
                  label="Segunda posição"
                  value={secondaryPosition}
                  visible={positionPicker === 'secondary'}
                  disabledPosition={primaryPosition}
                  disabled={saving}
                  onOpen={() => setPositionPicker('secondary')}
                  onClose={() => setPositionPicker(null)}
                  onSelect={(position) => {
                    setSecondaryPosition(position);
                    if (position === 'GOALKEEPER') setCanPlayGoalkeeper(false);
                    setError(null);
                    setMessage(null);
                  }}
                />
              </YStack>
            ) : null}
          </ProfileSection>

          {showGoalkeeperAvailability ? (
            <ProfileSection
              title="Disponibilidade no gol"
              description="Isso só informa que você aceita jogar no gol quando necessário; o administrador ainda define seu papel em cada jogo."
            >
              <XStack alignItems="center" justifyContent="space-between" gap="$4">
                <Text color="$onzeInk" flex={1} fontSize={14} fontWeight="700">
                  Posso jogar no gol quando necessário
                </Text>
                <Switch
                  accessibilityLabel="Posso jogar no gol quando necessário"
                  disabled={saving}
                  onValueChange={(enabled) => {
                    setCanPlayGoalkeeper(enabled);
                    setError(null);
                    setMessage(null);
                  }}
                  thumbColor={ONZE_COLORS.surface}
                  trackColor={{ false: ONZE_COLORS.switchTrack, true: ONZE_COLORS.green }}
                  value={canPlayGoalkeeper}
                />
              </XStack>
            </ProfileSection>
          ) : null}

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

          {adminMode && params.membershipId ? (
            <ProfileSection
              title="Avaliação técnica privada"
              description="Avalie 17 habilidades em intervalos de meia estrela. O backend calcula overall, cobertura e aptidão por posição."
            >
              <AppButton
                variant="outline"

                onPress={() => router.push({
                  pathname: '/technical-profile',
                  params: {
                    groupId: params.groupId,
                    membershipId: params.membershipId,
                    memberName: displayName,
                  },
                })}
              >
                <Text color="$onzeGreen" fontWeight="900">Avaliar habilidades e ver overalls</Text>
              </AppButton>
            </ProfileSection>
          ) : null}

          <AppButton variant="primary" disabled={saving}  onPress={() => void saveProfile()}>
            <Text color="$onzeSurface" fontSize={16} fontWeight="800">
              {saving ? 'Salvando...' : 'Salvar perfil esportivo'}
            </Text>
          </AppButton>
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
    <AppButton
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
    </AppButton>
  );
}
