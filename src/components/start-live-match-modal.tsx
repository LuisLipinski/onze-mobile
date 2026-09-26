import { Fragment } from 'react';
import { Image, Modal, Pressable, ScrollView } from 'react-native';
import { Button, Input, Spinner, Text, XStack, YStack } from 'tamagui';

import type { MatchTeamIdentity } from '../lib/api';

const DEFAULT_TEAM_IMAGE = require('../../assets/onze-icon.png');

function TeamEditor({
  identity,
  disabled,
  uploading,
  onChangeName,
  onSelectImage,
}: {
  identity: MatchTeamIdentity;
  disabled: boolean;
  uploading: boolean;
  onChangeName: (name: string) => void;
  onSelectImage: () => void;
}) {
  return (
    <YStack alignItems="center" gap="$3" width={138}>
      <Pressable
        accessibilityLabel={`Trocar imagem de ${identity.name}`}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onSelectImage}
        style={({ pressed }) => ({ opacity: disabled ? 0.55 : pressed ? 0.72 : 1 })}
      >
        <YStack
          alignItems="center"
          backgroundColor="#E8F7EE"
          borderColor="$onzeGreen"
          borderRadius={24}
          borderWidth={2}
          height={104}
          justifyContent="center"
          overflow="hidden"
          width={104}
        >
          <Image
            resizeMode="cover"
            source={identity.imageUrl ? { uri: identity.imageUrl } : DEFAULT_TEAM_IMAGE}
            style={{ width: 100, height: 100 }}
          />
          {uploading ? (
            <YStack
              alignItems="center"
              backgroundColor="rgba(17, 64, 44, 0.72)"
              bottom={0}
              justifyContent="center"
              left={0}
              position="absolute"
              right={0}
              top={0}
            >
              <Spinner color="$onzeSurface" size="large" />
            </YStack>
          ) : null}
        </YStack>
      </Pressable>
      <Text color="$onzeGreen" fontSize={11} fontWeight="900" textAlign="center">
        Toque na imagem para trocar
      </Text>
      <Input
        accessibilityLabel={`Nome do time ${identity.teamNumber}`}
        backgroundColor="$onzeCanvas"
        borderColor="$onzeBorder"
        disabled={disabled}
        maxLength={80}
        onChangeText={onChangeName}
        returnKeyType="done"
        textAlign="center"
        value={identity.name}
        width="100%"
      />
    </YStack>
  );
}

export function StartLiveMatchModal({
  visible,
  identities,
  loading,
  saving,
  uploadingTeamNumber,
  error,
  onChangeName,
  onSelectImage,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  identities: MatchTeamIdentity[];
  loading: boolean;
  saving: boolean;
  uploadingTeamNumber: number | null;
  error: string | null;
  onChangeName: (teamNumber: number, name: string) => void;
  onSelectImage: (teamNumber: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const disabled = loading || saving || uploadingTeamNumber != null;
  const invalidName = identities.some((identity) => !identity.name.trim());

  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent visible={visible}>
      <YStack backgroundColor="rgba(15, 23, 42, 0.52)" flex={1} justifyContent="flex-end">
        <YStack
          backgroundColor="$onzeSurface"
          borderTopLeftRadius="$7"
          borderTopRightRadius="$7"
          maxHeight="92%"
          padding="$5"
        >
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <YStack gap="$5" paddingBottom="$3">
              <YStack gap="$1">
                <Text color="$onzeInk" fontSize={22} fontWeight="900">Iniciar partida</Text>
                <Text color="$onzeMuted" lineHeight={20}>
                  Confira a identidade dos times. Nomes e imagens serão reutilizados nos próximos jogos e nas escalações.
                </Text>
              </YStack>

              {loading ? (
                <YStack alignItems="center" gap="$3" paddingVertical="$7">
                  <Spinner color="$onzeGreen" size="large" />
                  <Text color="$onzeMuted">Carregando os times...</Text>
                </YStack>
              ) : (
                <ScrollView
                  contentContainerStyle={{ alignItems: 'flex-start', paddingHorizontal: 2 }}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  <XStack alignItems="flex-start" gap="$3">
                    {identities.map((identity, index) => (
                      <Fragment key={identity.teamNumber}>
                        {index > 0 ? (
                          <Text
                            color="$onzeMuted"
                            fontSize={30}
                            fontWeight="900"
                            marginTop={34}
                          >
                            ×
                          </Text>
                        ) : null}
                        <TeamEditor
                          identity={identity}
                          disabled={disabled}
                          uploading={uploadingTeamNumber === identity.teamNumber}
                          onChangeName={(name) => onChangeName(identity.teamNumber, name)}
                          onSelectImage={() => onSelectImage(identity.teamNumber)}
                        />
                      </Fragment>
                    ))}
                  </XStack>
                </ScrollView>
              )}

              {error ? (
                <YStack backgroundColor="#FDECEC" borderRadius="$4" padding="$3">
                  <Text color="$onzeDanger" fontSize={12} lineHeight={18}>{error}</Text>
                </YStack>
              ) : null}

              <XStack gap="$3">
                <Button flex={1} height={52} disabled={saving} onPress={onCancel}>
                  Agora não
                </Button>
                <Button
                  backgroundColor="$onzeGreen"
                  disabled={disabled || invalidName || identities.length < 2}
                  flex={1}
                  height={52}
                  opacity={disabled || invalidName || identities.length < 2 ? 0.55 : 1}
                  onPress={onConfirm}
                >
                  <Text color="$onzeSurface" fontWeight="900">
                    {saving ? 'Iniciando...' : 'Iniciar partida'}
                  </Text>
                </Button>
              </XStack>
            </YStack>
          </ScrollView>
        </YStack>
      </YStack>
    </Modal>
  );
}
