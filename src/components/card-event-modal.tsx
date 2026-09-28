import { Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import { AppButton } from './app-button';

import type { GeneratedTeam, MatchCardType } from '../lib/api';
import { ONZE_COLORS } from '../theme/colors';

type Props = {
  visible: boolean;
  team: GeneratedTeam | null;
  sentOffAssignmentIds: ReadonlySet<string>;
  playerAssignmentId: string | null;
  cardType: MatchCardType;
  saving: boolean;
  onSelectPlayer: (assignmentId: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

function Choice({ label, selected, disabled = false, onPress }: {
  label: string; selected: boolean; disabled?: boolean; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} hitSlop={6} accessibilityState={{ disabled, selected }} style={({ pressed }) => ({
      backgroundColor: disabled ? ONZE_COLORS.dangerBg : selected ? ONZE_COLORS.green : ONZE_COLORS.infoBg,
      borderColor: disabled ? ONZE_COLORS.dangerBorder : selected ? ONZE_COLORS.green : ONZE_COLORS.border,
      borderRadius: 12, borderWidth: 1, opacity: disabled ? 0.72 : pressed ? 0.75 : 1,
      paddingHorizontal: 14, paddingVertical: 11,
    })}>
      <YStack alignItems="center">
        <Text color={disabled ? '$onzeMuted' : selected ? '$onzeSurface' : '$onzeInk'} fontWeight="800">{label}</Text>
        {disabled ? <Text color="$onzeDanger" fontSize={10} fontWeight="900">EXPULSO</Text> : null}
      </YStack>
    </Pressable>
  );
}

export function CardEventModal(props: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onCancel}>
      <YStack backgroundColor="rgba(15, 23, 42, 0.48)" flex={1} justifyContent="flex-end">
        <YStack
          backgroundColor="$onzeSurface"
          borderTopLeftRadius="$7"
          borderTopRightRadius="$7"
          maxHeight="90%"
          padding="$5"
          paddingBottom={insets.bottom + 20}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <YStack gap="$5" paddingBottom="$3">
              <YStack gap="$1">
                <Text color={props.cardType === 'YELLOW' ? '$onzeWarningText' : '$onzeDanger'} fontSize={22} fontWeight="900">
                  Cartão {props.cardType === 'YELLOW' ? 'amarelo' : 'vermelho'}
                </Text>
                <Text color="$onzeMuted">{props.team?.name ?? 'Time'} · O tempo do jogo será salvo automaticamente.</Text>
              </YStack>
              {props.team ? <YStack gap="$2">
                <Text color="$onzeInk" fontWeight="900">Jogador</Text>
                <XStack flexWrap="wrap" gap="$2">
                  {props.team.assignments.map((player) => <Choice key={player.id} label={player.displayName} disabled={props.sentOffAssignmentIds.has(player.id)} selected={props.playerAssignmentId === player.id} onPress={() => props.onSelectPlayer(player.id)} />)}
                </XStack>
              </YStack> : null}
              <XStack gap="$3">
                <AppButton variant="secondary" flex={1} disabled={props.saving} onPress={props.onCancel}>Cancelar</AppButton>
                <AppButton variant="primary" flex={1} disabled={!props.team || !props.playerAssignmentId || props.saving} opacity={!props.team || !props.playerAssignmentId || props.saving ? 0.55 : 1} onPress={props.onSave}>
                  <Text color="$onzeSurface" fontWeight="900">{props.saving ? 'Salvando...' : 'Salvar cartão'}</Text>
                </AppButton>
              </XStack>
            </YStack>
          </ScrollView>
        </YStack>
      </YStack>
    </Modal>
  );
}
