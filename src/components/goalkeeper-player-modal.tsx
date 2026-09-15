import { Modal, Pressable, ScrollView } from 'react-native';
import { Button, Text, YStack } from 'tamagui';

import type { MatchAttendance } from '../lib/api';

type GoalkeeperPlayerModalProps = {
  visible: boolean;
  title: string;
  description: string;
  candidates: MatchAttendance[];
  onSelect: (attendance: MatchAttendance) => void;
  onCancel: () => void;
};

export function GoalkeeperPlayerModal({
  visible,
  title,
  description,
  candidates,
  onSelect,
  onCancel,
}: GoalkeeperPlayerModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.42)',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <YStack backgroundColor="$onzeSurface" borderRadius="$7" gap="$4" maxHeight="85%" padding="$6">
            <YStack gap="$2">
              <Text color="$onzeInk" fontSize={22} fontWeight="900">{title}</Text>
              <Text color="$onzeMuted" fontSize={14} lineHeight={21}>{description}</Text>
            </YStack>
            <ScrollView style={{ maxHeight: 360 }}>
              <YStack gap="$2">
                {candidates.length ? candidates.map((candidate) => (
                  <Button
                    key={candidate.userId}
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeGreen"
                    borderWidth={1}
                    height={52}
                    justifyContent="flex-start"
                    onPress={() => onSelect(candidate)}
                  >
                    <Text color="$onzeInk" fontWeight="800">{candidate.displayName}</Text>
                  </Button>
                )) : (
                  <Text color="$onzeDanger" fontSize={13} lineHeight={19}>
                    Nenhum jogador confirmado está disponível para esta escolha.
                  </Text>
                )}
              </YStack>
            </ScrollView>
            <Button backgroundColor="$onzeCanvas" onPress={onCancel}>
              <Text color="$onzeInk" fontWeight="800">Cancelar</Text>
            </Button>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
