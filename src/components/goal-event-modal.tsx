import { Modal, Pressable, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import type { GeneratedTeam, TeamAssignment } from '../lib/api';

type Props = {
  visible: boolean;
  teams: GeneratedTeam[];
  selectedTeamNumber: number | null;
  sentOffAssignmentIds: ReadonlySet<string>;
  scorerAssignmentId: string | null;
  assistAssignmentId: string | null;
  penalty: boolean;
  saving: boolean;
  onSelectScorer: (assignmentId: string) => void;
  onSelectAssist: (assignmentId: string | null) => void;
  onChangePenalty: (penalty: boolean) => void;
  onCancel: () => void;
  onSave: () => void;
};

type ChoiceProps = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function Choice({ label, selected, disabled = false, onPress }: ChoiceProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: disabled ? '#FFF1F1' : selected ? '#148A4A' : '#F7FAF8',
        borderColor: disabled ? '#E7A3A3' : selected ? '#148A4A' : '#DDE6E1',
        borderRadius: 12,
        borderWidth: 1,
        opacity: disabled ? 0.72 : pressed ? 0.75 : 1,
        paddingHorizontal: 14,
        paddingVertical: 11,
      })}
    >
      <YStack alignItems="center">
        <Text color={disabled ? '$onzeMuted' : selected ? '$onzeSurface' : '$onzeInk'} fontWeight="800">
          {label}
        </Text>
        {disabled ? <Text color="$onzeDanger" fontSize={10} fontWeight="900">EXPULSO</Text> : null}
      </YStack>
    </Pressable>
  );
}

function PlayerChoices({ assignments, sentOffAssignmentIds, selectedId, onSelect }: {
  assignments: TeamAssignment[];
  sentOffAssignmentIds: ReadonlySet<string>;
  selectedId: string | null;
  onSelect: (assignmentId: string) => void;
}) {
  return (
    <XStack flexWrap="wrap" gap="$2">
      {assignments.map((assignment) => (
        <Choice
          key={assignment.id}
          label={assignment.displayName}
          disabled={sentOffAssignmentIds.has(assignment.id)}
          selected={selectedId === assignment.id}
          onPress={() => onSelect(assignment.id)}
        />
      ))}
    </XStack>
  );
}

export function GoalEventModal(props: Props) {
  const selectedTeam = props.teams.find((team) => team.teamNumber === props.selectedTeamNumber);
  const assistCandidates = selectedTeam?.assignments.filter(
    (assignment) => assignment.id !== props.scorerAssignmentId,
  ) ?? [];

  return (
    <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onCancel}>
      <YStack backgroundColor="rgba(15, 23, 42, 0.48)" flex={1} justifyContent="flex-end">
        <YStack
          backgroundColor="$onzeSurface"
          borderTopLeftRadius="$7"
          borderTopRightRadius="$7"
          maxHeight="90%"
          padding="$5"
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <YStack gap="$5" paddingBottom="$3">
              <YStack gap="$1">
                <Text color="$onzeInk" fontSize={22} fontWeight="900">Registrar gol</Text>
                <Text color="$onzeMuted" lineHeight={20}>
                  O tempo do jogo será salvo automaticamente ao confirmar.
                </Text>
              </YStack>

              <YStack gap="$2">
                <Text color="$onzeInk" fontWeight="900">Time</Text>
                <YStack backgroundColor="#E8F7EE" borderRadius="$4" padding="$3">
                  <Text color="$onzeGreen" fontSize={16} fontWeight="900">
                    Time {props.selectedTeamNumber}
                  </Text>
                  <Text color="$onzeMuted" fontSize={12}>
                    Definido pelo botão + que você tocou.
                  </Text>
                </YStack>
              </YStack>

              {selectedTeam ? (
                <YStack gap="$2">
                  <Text color="$onzeInk" fontWeight="900">Quem fez o gol?</Text>
                  <PlayerChoices
                    assignments={selectedTeam.assignments}
                    sentOffAssignmentIds={props.sentOffAssignmentIds}
                    selectedId={props.scorerAssignmentId}
                    onSelect={props.onSelectScorer}
                  />
                </YStack>
              ) : null}

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: props.penalty }}
                hitSlop={8}
                onPress={() => props.onChangePenalty(!props.penalty)}
              >
                <XStack alignItems="center" gap="$3">
                  <YStack
                    alignItems="center"
                    backgroundColor={props.penalty ? '$onzeGreen' : '$onzeSurface'}
                    borderColor={props.penalty ? '$onzeGreen' : '$onzeBorder'}
                    borderRadius="$2"
                    borderWidth={2}
                    height={26}
                    justifyContent="center"
                    width={26}
                  >
                    {props.penalty ? <Text color="$onzeSurface" fontWeight="900">✓</Text> : null}
                  </YStack>
                  <YStack flex={1}>
                    <Text color="$onzeInk" fontWeight="900">Gol de pênalti</Text>
                    <Text color="$onzeMuted" fontSize={12}>Pênalti não registra assistência.</Text>
                  </YStack>
                </XStack>
              </Pressable>

              {selectedTeam && props.scorerAssignmentId && !props.penalty ? (
                <YStack gap="$2">
                  <Text color="$onzeInk" fontWeight="900">Assistência (opcional)</Text>
                  <XStack flexWrap="wrap" gap="$2">
                    <Choice
                      label="Sem assistência"
                      selected={props.assistAssignmentId == null}
                      onPress={() => props.onSelectAssist(null)}
                    />
                    {assistCandidates.map((assignment) => (
                      <Choice
                      key={assignment.id}
                      label={assignment.displayName}
                      disabled={props.sentOffAssignmentIds.has(assignment.id)}
                      selected={props.assistAssignmentId === assignment.id}
                        onPress={() => props.onSelectAssist(assignment.id)}
                      />
                    ))}
                  </XStack>
                </YStack>
              ) : null}

              <XStack gap="$3">
                <Button
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeBorder"
                  borderWidth={1}
                  disabled={props.saving}
                  flex={1}
                  height={52}
                  onPress={props.onCancel}
                >
                  <Text color="$onzeInk" fontWeight="800">Cancelar</Text>
                </Button>
                <Button
                  backgroundColor="$onzeGreen"
                  disabled={!props.scorerAssignmentId || props.saving}
                  flex={1}
                  height={52}
                  opacity={!props.scorerAssignmentId || props.saving ? 0.55 : 1}
                  onPress={props.onSave}
                >
                  <Text color="$onzeSurface" fontWeight="900">
                    {props.saving ? 'Salvando...' : 'Salvar gol'}
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
