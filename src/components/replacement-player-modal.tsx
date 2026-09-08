import { Modal, Pressable, ScrollView } from 'react-native';
import { Button, Text, YStack } from 'tamagui';

import type { GroupMember } from '../lib/api';

type ReplacementPlayerModalProps = {
  visible: boolean;
  departedName: string;
  departedUserId: string;
  candidates: GroupMember[];
  selectedUserId: string | null;
  loading?: boolean;
  onSelect: (userId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReplacementPlayerModal({
  visible,
  departedName,
  departedUserId,
  candidates,
  selectedUserId,
  loading = false,
  onSelect,
  onCancel,
  onConfirm,
}: ReplacementPlayerModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <Pressable
        onPress={loading ? undefined : onCancel}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.42)',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <YStack
            backgroundColor="$onzeSurface"
            borderRadius="$7"
            gap="$4"
            maxHeight="85%"
            padding="$6"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 10 }}
            shadowOpacity={0.16}
            shadowRadius={24}
          >
            <YStack gap="$2">
              <Text color="$onzeInk" fontSize={22} fontWeight="900">
                Preencher vaga
              </Text>
              <Text color="$onzeMuted" fontSize={14} lineHeight={21}>
                Escolha quem entrará no lugar de {departedName}. Também é possível readicionar o próprio jogador.
              </Text>
            </YStack>

            <ScrollView style={{ maxHeight: 320 }}>
              <YStack gap="$2">
                {loading ? (
                  <Text color="$onzeMuted" fontSize={13}>Carregando membros...</Text>
                ) : candidates.length ? candidates.map((candidate) => {
                  const selected = candidate.userId === selectedUserId;
                  const samePlayer = candidate.userId === departedUserId;
                  return (
                    <Button
                      key={candidate.userId}
                      backgroundColor={selected ? '#EAF7EF' : '$onzeSurface'}
                      borderColor="$onzeGreen"
                      borderWidth={selected ? 2 : 1}
                      disabled={loading}
                      height={52}
                      justifyContent="flex-start"
                      onPress={() => onSelect(candidate.userId)}
                    >
                      <Text color="$onzeInk" fontWeight="800">
                        {selected ? '✓ ' : ''}{candidate.displayName}{samePlayer ? ' · readicionar' : ''}
                      </Text>
                    </Button>
                  );
                }) : (
                  <Text color="$onzeDanger" fontSize={13} lineHeight={19}>
                    Não há outro membro disponível para preencher esta vaga.
                  </Text>
                )}
              </YStack>
            </ScrollView>

            <Button
              backgroundColor="$onzeGreen"
              disabled={loading || !selectedUserId}
              height={50}
              onPress={onConfirm}
            >
              <Text color="$onzeSurface" fontWeight="900">
                {loading ? 'Adicionando...' : 'Adicionar à lista'}
              </Text>
            </Button>
            <Button
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderWidth={1}
              disabled={loading}
              height={48}
              onPress={onCancel}
            >
              <Text color="$onzeInk" fontWeight="800">Cancelar</Text>
            </Button>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
