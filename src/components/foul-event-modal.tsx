import { Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import type { GeneratedTeam } from '../lib/api';
import { ONZE_COLORS } from '../theme/colors';
import { AppButton } from './app-button';

type Props = {
  visible: boolean;
  teams: GeneratedTeam[];
  offenderTeamNumber: number | null;
  victimTeamNumber: number | null;
  penalty: boolean;
  stage: 'AWARD' | 'TAKER' | 'RESULT';
  offenderId: string | null;
  victimId: string | null;
  takerId: string | null;
  scored: boolean | null;
  sentOffAssignmentIds: ReadonlySet<string>;
  saving: boolean;
  onSelectOffender: (id: string) => void;
  onSelectVictim: (teamNumber: number, id: string) => void;
  onSelectTaker: (id: string) => void;
  onSelectResult: (scored: boolean) => void;
  onAward: () => void;
  onContinue: () => void;
  onResolve: () => void;
  onClose: () => void;
};

function PlayerChoice({ name, selected, disabled, onPress }: {
  name: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => ({
      backgroundColor: disabled ? ONZE_COLORS.dangerBg : selected ? ONZE_COLORS.green : ONZE_COLORS.infoBg,
      borderColor: disabled ? ONZE_COLORS.dangerBorder : selected ? ONZE_COLORS.green : ONZE_COLORS.border,
      borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
      opacity: disabled ? 0.6 : pressed ? 0.7 : 1,
    })}>
    <Text color={selected ? '$onzeSurface' : '$onzeInk'} fontWeight="800">
      {name}{disabled ? ' · Expulso' : ''}
    </Text>
  </Pressable>;
}

export function FoulEventModal(props: Props) {
  const insets = useSafeAreaInsets();
  const offenderTeam = props.teams.find((team) => team.teamNumber === props.offenderTeamNumber);
  const victimTeam = props.teams.find((team) => team.teamNumber === props.victimTeamNumber);
  const opponents = props.teams.filter((team) => team.teamNumber !== props.offenderTeamNumber);
  const title = props.stage === 'AWARD'
    ? props.penalty ? 'Marcar pênalti' : 'Registrar falta'
    : props.stage === 'TAKER' ? 'Quem vai cobrar?' : 'Foi gol?';
  return <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onClose}>
    <YStack backgroundColor="rgba(15, 23, 42, 0.48)" flex={1} justifyContent="flex-end">
      <YStack backgroundColor="$onzeSurface" borderTopLeftRadius="$7" borderTopRightRadius="$7"
        maxHeight="90%" padding="$5" paddingBottom={insets.bottom + 20}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack gap="$4" paddingBottom="$3">
            <YStack gap="$1">
              <Text color="$onzeInk" fontSize={22} fontWeight="900">{title}</Text>
              <Text color="$onzeMuted" fontSize={13}>
                {props.stage === 'AWARD'
                  ? `Falta cometida por ${offenderTeam?.name ?? 'este time'}.`
                  : `Cobrança para ${victimTeam?.name ?? 'o time que sofreu a falta'}.`}
              </Text>
            </YStack>
            {props.stage === 'AWARD' ? <>
              <YStack gap="$2">
                <Text color="$onzeInk" fontWeight="900">Quem fez a falta?</Text>
                <XStack flexWrap="wrap" gap="$2">
                  {offenderTeam?.assignments.map((player) => <PlayerChoice key={player.id}
                    name={player.displayName} selected={props.offenderId === player.id}
                    disabled={props.sentOffAssignmentIds.has(player.id)}
                    onPress={() => props.onSelectOffender(player.id)} />)}
                </XStack>
              </YStack>
              <YStack gap="$2">
                <Text color="$onzeInk" fontWeight="900">
                  {props.penalty ? 'Quem sofreu o pênalti?' : 'Quem sofreu a falta? (opcional)'}
                </Text>
                {opponents.map((team) => <YStack key={team.teamNumber} gap="$2">
                  {opponents.length > 1 ? <Text color="$onzeGreen" fontWeight="800">{team.name}</Text> : null}
                  <XStack flexWrap="wrap" gap="$2">
                    {team.assignments.map((player) => <PlayerChoice key={player.id}
                      name={player.displayName} selected={props.victimId === player.id}
                      disabled={props.sentOffAssignmentIds.has(player.id)}
                      onPress={() => props.onSelectVictim(team.teamNumber, player.id)} />)}
                  </XStack>
                </YStack>)}
              </YStack>
            </> : null}
            {props.stage === 'TAKER' ? <YStack gap="$2">
              <Text color="$onzeInk" fontWeight="900">Jogador que vai cobrar</Text>
              <XStack flexWrap="wrap" gap="$2">
                {victimTeam?.assignments.map((player) => <PlayerChoice key={player.id}
                  name={player.displayName} selected={props.takerId === player.id}
                  disabled={props.sentOffAssignmentIds.has(player.id)}
                  onPress={() => props.onSelectTaker(player.id)} />)}
              </XStack>
            </YStack> : null}
            {props.stage === 'RESULT' ? <YStack gap="$3">
              <Text color="$onzeInk" fontWeight="800">
                {victimTeam?.assignments.find((player) => player.id === props.takerId)?.displayName} cobrou o pênalti. Foi gol?
              </Text>
              <XStack gap="$3">
                {[true, false].map((value) => <Pressable key={String(value)} accessibilityRole="button"
                  accessibilityState={{ selected: props.scored === value }}
                  onPress={() => props.onSelectResult(value)} style={{ flex: 1 }}>
                  <YStack alignItems="center" backgroundColor={props.scored === value ? '$onzeGreen' : '$onzeCanvas'}
                    borderColor="$onzeBorder" borderRadius="$4" borderWidth={1} padding="$4">
                    <Text color={props.scored === value ? '$onzeSurface' : '$onzeInk'} fontWeight="900">
                      {value ? 'Sim, gol' : 'Não, perdeu'}
                    </Text>
                  </YStack>
                </Pressable>)}
              </XStack>
            </YStack> : null}
            <XStack gap="$3">
              <AppButton variant="secondary" flex={1} disabled={props.saving} onPress={props.onClose}>
                {props.stage === 'AWARD' ? 'Cancelar' : 'Depois'}
              </AppButton>
              <AppButton variant="primary" flex={1} disabled={props.saving || (
                props.stage === 'AWARD' ? !props.offenderId || (props.penalty && !props.victimId)
                  : props.stage === 'TAKER' ? !props.takerId : props.scored == null
              )} onPress={props.stage === 'AWARD' ? props.onAward
                : props.stage === 'TAKER' ? props.onContinue : props.onResolve}>
                {props.saving ? 'Salvando...' : props.stage === 'AWARD' ? 'Registrar'
                  : props.stage === 'TAKER' ? 'Continuar' : 'Salvar resultado'}
              </AppButton>
            </XStack>
          </YStack>
        </ScrollView>
      </YStack>
    </YStack>
  </Modal>;
}
