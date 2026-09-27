import { Modal, Pressable, ScrollView } from 'react-native';
import { Text, YStack } from 'tamagui';

import { AppButton } from './app-button';

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
                  <AppButton
                    key={candidate.userId}
                    variant="outline"



                    justifyContent="flex-start"
                    onPress={() => onSelect(candidate)}
                  >
                    <Text color="$onzeInk" fontWeight="800">{candidate.displayName}</Text>
                  </AppButton>
                )) : (
                  <Text color="$onzeDanger" fontSize={13} lineHeight={19}>
                    Nenhum jogador confirmado está disponível para esta escolha.
                  </Text>
                )}
              </YStack>
            </ScrollView>
            <AppButton backgroundColor="$onzeCanvas" onPress={onCancel}>
              <Text color="$onzeInk" fontWeight="800">Cancelar</Text>
            </AppButton>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
