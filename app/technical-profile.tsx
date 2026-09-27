import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { ONZE_COLORS } from '../src/theme/colors';

import { getErrorMessage } from '../src/lib/errors';

import { AppButton } from '../src/components/app-button';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { TechnicalRatingEditor } from '../src/components/technical-rating-editor';
import {
  ApiRequestError,
  getMemberTechnicalProfile,
  PlayerSkill,
  TechnicalProfile,
  updateMemberTechnicalProfile,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';
import { positionLabel } from '../src/lib/sports-profile';

export default function TechnicalProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    groupId?: string;
    membershipId?: string;
    memberName?: string;
  }>();
  const [profile, setProfile] = useState<TechnicalProfile | null>(null);
  const [ratings, setRatings] = useState<Partial<Record<PlayerSkill, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void load();
  }, [params.groupId, params.membershipId]));

  async function load() {
    if (!params.groupId || !params.membershipId) {
      setError('Não foi possível identificar o jogador.');
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
      const loaded = await getMemberTechnicalProfile(token, params.groupId, params.membershipId);
      setProfile(loaded);
      setRatings(loaded.ratings ?? {});
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setError(getErrorMessage(exception, 'Não foi possível carregar a avaliação.'));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!params.groupId || !params.membershipId || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const updated = await updateMemberTechnicalProfile(
        token,
        params.groupId,
        params.membershipId,
        ratings,
      );
      setProfile(updated);
      setRatings(updated.ratings ?? {});
      setMessage('Avaliação técnica atualizada. Habilidades não avaliadas continuaram sem nota.');
    } catch (exception) {
      setError(getErrorMessage(exception, 'Não foi possível salvar a avaliação.'));
    } finally {
      setSaving(false);
    }
  }

  const importantSkills = useMemo(() => new Set<PlayerSkill>(
    Object.values(profile?.importantSkills ?? {}).flatMap((skills) => skills ?? []),
  ), [profile]);

  if (loading) {
    return <ServerLoadingScreen title="Carregando avaliação..." message="Calculando overalls e cobertura." />;
  }

  const positionSummaries = profile?.positionOveralls.filter((item) => (
    item.position === profile.primaryPosition || item.position === profile.secondaryPosition
  )) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <YStack gap="$5" paddingVertical="$3">
          <AppButton alignSelf="flex-start" variant="ghost" onPress={() => router.back()}>
            <Text color="$onzeGreen" fontWeight="800">← Voltar</Text>
          </AppButton>

          <YStack gap="$1">
            <Text color="$onzeGreen" fontSize={13} fontWeight="900">AVALIAÇÃO TÉCNICA PRIVADA</Text>
            <Text color="$onzeInk" fontSize={28} fontWeight="900">
              {profile?.displayName || params.memberName || 'Jogador'}
            </Text>
            <Text color="$onzeMuted" fontSize={13} lineHeight={20}>
              Somente o Administrador Principal e admins com permissão para editar perfis visualizam estas notas.
            </Text>
          </YStack>

          {error ? (
            <YStack backgroundColor="$onzeSurface" borderColor="$onzeDanger" borderRadius="$5" borderWidth={1} padding="$4">
              <Text color="$onzeDanger" fontSize={13}>{error}</Text>
            </YStack>
          ) : null}
          {message ? (
            <YStack backgroundColor="$onzeSuccessBg" borderRadius="$5" padding="$4">
              <Text color="$onzeGreen" fontSize={13} fontWeight="800">{message}</Text>
            </YStack>
          ) : null}

          {profile ? (
            <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$4" padding="$5">
              <YStack gap="$1">
                <Text color="$onzeMuted" fontSize={11} fontWeight="900">OVERALL GERAL</Text>
                <Text color="$onzeInk" fontSize={24} fontWeight="900">
                  {profile.generalOverall.overall == null ? 'Sem dados' : `${profile.generalOverall.overall}/50`}
                </Text>
                <Text color="$onzeMuted" fontSize={13}>
                  Cobertura: {profile.generalOverall.coverage}%
                </Text>
              </YStack>
              {positionSummaries.map((summary) => (
                <XStack key={summary.position} alignItems="center" gap="$3" justifyContent="space-between">
                  <YStack flex={1}>
                    <Text color="$onzeInk" fontSize={14} fontWeight="900">
                      {positionLabel(summary.position)}
                    </Text>
                    <Text color={summary.reliable ? '$onzeGreen' : '$onzeWarningText'} fontSize={12} fontWeight="800">
                      {summary.reliable ? 'Avaliação confiável' : 'Avaliação incompleta'}
                    </Text>
                  </YStack>
                  <Text color="$onzeInk" fontSize={14} fontWeight="900">
                    {summary.overall == null ? '—' : `${summary.overall}/50`} · {summary.coverage}%
                  </Text>
                </XStack>
              ))}
            </YStack>
          ) : null}

          <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$4" padding="$5">
            <YStack gap="$1">
              <Text color="$onzeInk" fontSize={18} fontWeight="900">Habilidades</Text>
              <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                Use os botões de meia estrela. Você pode salvar parcialmente ou marcar qualquer item como “Não avaliado”.
              </Text>
            </YStack>
            <TechnicalRatingEditor
              ratings={ratings}
              importantSkills={importantSkills}
              disabled={saving}
              onChange={(skill, value) => setRatings((current) => {
                const next = { ...current };
                if (value == null) delete next[skill];
                else next[skill] = value;
                return next;
              })}
            />
          </YStack>

          <AppButton variant="primary" disabled={saving || !profile}  onPress={() => void save()}>
            <Text color="$onzeSurface" fontSize={16} fontWeight="900">
              {saving ? 'Salvando...' : 'Salvar avaliação'}
            </Text>
          </AppButton>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
