import { Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import { AppButton } from './app-button';

import type { GeneratedTeam, MatchCardType } from '../lib/api';
import { ONZE_COLORS } from '../theme/colors';

type Props = {
  visible: boolean;
  teams: GeneratedTeam[];
  sentOffAssignmentIds: ReadonlySet<string>;
  teamNumber: number | null;
  playerAssignmentId: string | null;
  cardType: MatchCardType;
  saving: boolean;
  onSelectTeam: (teamNumber: number) => void;
  onSelectPlayer: (assignmentId: string) => void;
  onSelectCardType: (cardType: MatchCardType) => void;
  onCancel: () => void;
  onSave: () => void;
};

function Choice({ label, selected, color, disabled = false, onPress }: {
  label: string; selected: boolean; color?: string; disabled?: boolean; onPress: () => void;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} hitSlop={6} accessibilityState={{ disabled, selected }} style={({ pressed }) => ({
      backgroundColor: disabled ? ONZE_COLORS.dangerBg : selected ? (color ?? ONZE_COLORS.green) : ONZE_COLORS.infoBg,
      borderColor: disabled ? ONZE_COLORS.dangerBorder : selected ? (color ?? ONZE_COLORS.green) : ONZE_COLORS.border,
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
  const team = props.teams.find((item) => item.teamNumber === props.teamNumber);
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
                <Text color="$onzeInk" fontSize={22} fontWeight="900">Registrar cartão</Text>
                <Text color="$onzeMuted">O tempo do jogo será salvo automaticamente.</Text>
              </YStack>
              <YStack gap="$2">
                <Text color="$onzeInk" fontWeight="900">Cartão</Text>
                <XStack gap="$2">
                  <Choice label="Amarelo" selected={props.cardType === 'YELLOW'} color={ONZE_COLORS.warning} onPress={() => props.onSelectCardType('YELLOW')} />
                  <Choice label="Vermelho" selected={props.cardType === 'RED'} color={ONZE_COLORS.danger} onPress={() => props.onSelectCardType('RED')} />
                </XStack>
              </YStack>
              <YStack gap="$2">
                <Text color="$onzeInk" fontWeight="900">Time</Text>
                <XStack flexWrap="wrap" gap="$2">
                  {props.teams.map((item) => <Choice key={item.teamNumber} label={item.name} selected={props.teamNumber === item.teamNumber} onPress={() => props.onSelectTeam(item.teamNumber)} />)}
                </XStack>
              </YStack>
              {team ? <YStack gap="$2">
                <Text color="$onzeInk" fontWeight="900">Jogador</Text>
                <XStack flexWrap="wrap" gap="$2">
                  {team.assignments.map((player) => <Choice key={player.id} label={player.displayName} disabled={props.sentOffAssignmentIds.has(player.id)} selected={props.playerAssignmentId === player.id} onPress={() => props.onSelectPlayer(player.id)} />)}
                </XStack>
              </YStack> : null}
              <XStack gap="$3">
                <AppButton variant="secondary" flex={1} disabled={props.saving} onPress={props.onCancel}>Cancelar</AppButton>
                <AppButton variant="primary" flex={1}  disabled={!props.playerAssignmentId || props.saving} opacity={!props.playerAssignmentId || props.saving ? 0.55 : 1} onPress={props.onSave}>
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
