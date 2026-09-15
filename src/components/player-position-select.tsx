import { Modal, Pressable, ScrollView } from 'react-native';
import { Button, Text, YStack } from 'tamagui';

import {
  PLAYER_POSITION_GROUPS,
  PlayerPosition,
  positionLabel,
} from '../lib/sports-profile';

type PlayerPositionSelectProps = {
  label: string;
  value: PlayerPosition | null;
  visible: boolean;
  disabledPosition?: PlayerPosition | null;
  disabled?: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (position: PlayerPosition) => void;
};

export function PlayerPositionSelect({
  label,
  value,
  visible,
  disabledPosition = null,
  disabled = false,
  onOpen,
  onClose,
  onSelect,
}: PlayerPositionSelectProps) {
  return (
    <>
      <Button
        accessibilityLabel={label}
        backgroundColor="$onzeSurface"
        borderColor="$onzeBorder"
        borderWidth={1}
        disabled={disabled}
        height={52}
        justifyContent="space-between"
        onPress={onOpen}
      >
        <Text color={value ? '$onzeInk' : '$onzeMuted'} fontWeight="800">
          {value ? positionLabel(value) : 'Selecionar posição'}
        </Text>
        <Text color="$onzeMuted">⌄</Text>
      </Button>

      <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
        <Pressable
          onPress={onClose}
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.42)',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Pressable onPress={(event) => event.stopPropagation()}>
            <YStack backgroundColor="$onzeSurface" borderRadius="$7" gap="$4" maxHeight="88%" padding="$6">
              <YStack gap="$1">
                <Text color="$onzeInk" fontSize={22} fontWeight="900">{label}</Text>
                <Text color="$onzeMuted" fontSize={13}>Escolha uma opção.</Text>
              </YStack>
              <ScrollView>
                <YStack gap="$4">
                  {PLAYER_POSITION_GROUPS.map((group) => (
                    <YStack key={group.label} gap="$2">
                      <Text color="$onzeMuted" fontSize={11} fontWeight="900">{group.label}</Text>
                      {group.options.map((option) => {
                        const selected = option.value === value;
                        const optionDisabled = option.value === disabledPosition;
                        return (
                          <Button
                            key={option.value}
                            accessibilityState={{ disabled: optionDisabled, selected }}
                            backgroundColor={selected ? '#EAF7EF' : '$onzeSurface'}
                            borderColor={selected ? '$onzeGreen' : '$onzeBorder'}
                            borderWidth={selected ? 2 : 1}
                            disabled={optionDisabled}
                            justifyContent="flex-start"
                            opacity={optionDisabled ? 0.45 : 1}
                            onPress={() => {
                              onSelect(option.value);
                              onClose();
                            }}
                          >
                            <Text color="$onzeInk" fontWeight="800">
                              {selected ? '✓ ' : ''}{option.label}
                            </Text>
                          </Button>
                        );
                      })}
                    </YStack>
                  ))}
                </YStack>
              </ScrollView>
              <Button backgroundColor="$onzeCanvas" onPress={onClose}>
                <Text color="$onzeInk" fontWeight="800">Cancelar</Text>
              </Button>
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
