import { Modal, Pressable, ScrollView } from 'react-native';
import { Text, YStack } from 'tamagui';

import { AppButton } from './app-button';
import type { StatisticsSeason } from '../lib/api';
import { statisticsSeasonLabel } from '../lib/statistics';

type Props = {
  seasons: StatisticsSeason[];
  selectedId: string | null;
  visible: boolean;
  disabled?: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (seasonId: string | null) => void;
};

export function StatisticsSeasonSelect(props: Props) {
  const selected = props.seasons.find((season) => season.id === props.selectedId);
  const options = [
    { id: null, label: 'Geral · acumulado' },
    ...props.seasons.map((season) => ({ id: season.id, label: statisticsSeasonLabel(season) })),
  ];
  return (
    <>
      <AppButton
        accessibilityLabel="Selecionar ranking geral ou temporada"
        variant="secondary"
        disabled={props.disabled}
        justifyContent="space-between"
        onPress={props.onOpen}
      >
        <Text color="$onzeInk" fontWeight="800">{statisticsSeasonLabel(selected)}</Text>
        <Text color="$onzeMuted">⌄</Text>
      </AppButton>
      <Modal animationType="fade" transparent visible={props.visible} onRequestClose={props.onClose}>
        <Pressable
          onPress={props.onClose}
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.42)', justifyContent: 'center', padding: 24 }}
        >
          <Pressable onPress={(event) => event.stopPropagation()}>
            <YStack backgroundColor="$onzeSurface" borderRadius="$7" gap="$4" maxHeight="85%" padding="$5">
              <Text color="$onzeInk" fontSize={22} fontWeight="900">Consultar ranking</Text>
              <ScrollView>
                <YStack gap="$2">
                  {options.map((option) => (
                    <AppButton
                      key={option.id ?? 'general'}
                      variant="outline"
                      accessibilityState={{ selected: option.id === props.selectedId }}
                      justifyContent="flex-start"
                      onPress={() => { props.onSelect(option.id); props.onClose(); }}
                    >
                      <Text color="$onzeInk" fontWeight="800">
                        {option.id === props.selectedId ? '✓ ' : ''}{option.label}
                      </Text>
                    </AppButton>
                  ))}
                </YStack>
              </ScrollView>
              <AppButton variant="secondary" onPress={props.onClose}>
                <Text color="$onzeInk" fontWeight="800">Fechar</Text>
              </AppButton>
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
