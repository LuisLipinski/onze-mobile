import { Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import { AppButton } from './app-button';
import type { GeneratedTeam, TeamStatisticType } from '../lib/api';
import { ONZE_COLORS } from '../theme/colors';

type Props = {
  visible: boolean;
  team: GeneratedTeam | null;
  type: Extract<TeamStatisticType, 'SHOTS' | 'SHOTS_ON_TARGET'>;
  playerAssignmentId: string | null;
  sentOffAssignmentIds: ReadonlySet<string>;
  saving: boolean;
  onSelectPlayer: (id: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function ShotEventModal(props: Props) {
  const insets = useSafeAreaInsets();
  const onTarget = props.type === 'SHOTS_ON_TARGET';
  return (
    <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onCancel}>
      <YStack backgroundColor="rgba(15, 23, 42, 0.48)" flex={1} justifyContent="flex-end">
        <YStack backgroundColor="$onzeSurface" borderTopLeftRadius="$7" borderTopRightRadius="$7"
          maxHeight="90%" padding="$5" paddingBottom={insets.bottom + 20}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <YStack gap="$5" paddingBottom="$3">
              <YStack gap="$1">
                <Text color="$onzeInk" fontSize={22} fontWeight="900">
                  {onTarget ? 'Chute no gol' : 'Chute'}
                </Text>
                <Text color="$onzeMuted">
                  {props.team?.name ?? 'Time'} · Selecione quem chutou.
                </Text>
              </YStack>
              <YStack gap="$2">
                <Text color="$onzeInk" fontWeight="900">Jogador</Text>
                <XStack flexWrap="wrap" gap="$2">
                  {props.team?.assignments.map((player) => {
                    const disabled = props.sentOffAssignmentIds.has(player.id);
                    const selected = props.playerAssignmentId === player.id;
                    return (
                      <Pressable key={player.id} accessibilityRole="button"
                        accessibilityState={{ disabled, selected }} disabled={disabled}
                        onPress={() => props.onSelectPlayer(player.id)}
                        style={({ pressed }) => ({
                          backgroundColor: disabled ? ONZE_COLORS.dangerBg : selected ? ONZE_COLORS.green : ONZE_COLORS.infoBg,
                          borderColor: disabled ? ONZE_COLORS.dangerBorder : selected ? ONZE_COLORS.green : ONZE_COLORS.border,
                          borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11,
                          opacity: disabled ? 0.72 : pressed ? 0.75 : 1,
                        })}>
                        <YStack alignItems="center">
                          <Text color={disabled ? '$onzeMuted' : selected ? '$onzeSurface' : '$onzeInk'} fontWeight="800">
                            {player.displayName}
                          </Text>
                          {disabled ? <Text color="$onzeDanger" fontSize={10} fontWeight="900">EXPULSO</Text> : null}
                        </YStack>
                      </Pressable>
                    );
                  })}
                </XStack>
              </YStack>
              <XStack gap="$3">
                <AppButton variant="secondary" flex={1} disabled={props.saving} onPress={props.onCancel}>
                  Cancelar
                </AppButton>
                <AppButton variant="primary" flex={1}
                  disabled={!props.playerAssignmentId || props.saving}
                  opacity={!props.playerAssignmentId || props.saving ? 0.55 : 1} onPress={props.onSave}>
                  <Text color="$onzeSurface" fontWeight="900">
                    {props.saving ? 'Salvando...' : 'Salvar chute'}
                  </Text>
                </AppButton>
              </XStack>
            </YStack>
          </ScrollView>
        </YStack>
      </YStack>
    </Modal>
  );
}
