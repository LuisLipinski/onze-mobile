import { KeyboardAvoidingView, Modal, Platform, Pressable } from 'react-native';
import { Button, Input, Text, XStack, YStack } from 'tamagui';

type RentalGoalkeeperModalProps = {
  visible: boolean;
  name: string;
  error?: string | null;
  loading?: boolean;
  onChangeName: (name: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RentalGoalkeeperModal({
  visible,
  name,
  error = null,
  loading = false,
  onChangeName,
  onCancel,
  onConfirm,
}: RentalGoalkeeperModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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
              padding="$6"
              shadowColor="#000"
              shadowOffset={{ width: 0, height: 10 }}
              shadowOpacity={0.16}
              shadowRadius={24}
            >
              <YStack gap="$2">
                <Text color="$onzeInk" fontSize={22} fontWeight="900">
                  Adicionar goleiro de aluguel
                </Text>
                <Text color="$onzeMuted" fontSize={14} lineHeight={21}>
                  Informe somente o nome. Ele ocupará uma vaga apenas nesta partida e não terá conta, cobrança ou notificações.
                </Text>
              </YStack>

              <YStack gap="$2">
                <Text color="$onzeMuted" fontSize={11} fontWeight="900">NOME</Text>
                <Input
                  accessibilityLabel="Nome do goleiro de aluguel"
                  autoCapitalize="words"
                  autoFocus
                  backgroundColor="$onzeSurface"
                  borderColor={error ? '$onzeDanger' : '$onzeBorder'}
                  color="$onzeInk"
                  maxLength={120}
                  onChangeText={onChangeName}
                  onSubmitEditing={name.trim() ? onConfirm : undefined}
                  placeholder="Ex.: Carlos"
                  placeholderTextColor="$onzeMuted"
                  returnKeyType="done"
                  value={name}
                />
                {error ? <Text color="$onzeDanger" fontSize={12}>{error}</Text> : null}
              </YStack>

              <XStack gap="$3">
                <Button
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeBorder"
                  borderWidth={1}
                  disabled={loading}
                  flex={1}
                  height={48}
                  onPress={onCancel}
                >
                  <Text color="$onzeInk" fontWeight="800">Cancelar</Text>
                </Button>
                <Button
                  backgroundColor="$onzeGreen"
                  disabled={loading || !name.trim()}
                  flex={1}
                  height={48}
                  onPress={onConfirm}
                >
                  <Text color="$onzeSurface" fontWeight="800">
                    {loading ? 'Adicionando...' : 'Adicionar'}
                  </Text>
                </Button>
              </XStack>
            </YStack>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
