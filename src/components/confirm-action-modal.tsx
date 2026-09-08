import { Modal, Pressable } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

type ConfirmActionModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmActionModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
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
            padding="$6"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 10 }}
            shadowOpacity={0.16}
            shadowRadius={24}
          >
            <YStack gap="$2">
              <Text color="$onzeInk" fontSize={22} fontWeight="900">
                {title}
              </Text>
              <Text color="$onzeMuted" fontSize={14} lineHeight={21}>
                {message}
              </Text>
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
                <Text color="$onzeInk" fontWeight="800">
                  {cancelLabel}
                </Text>
              </Button>
              <Button
                backgroundColor={destructive ? '$onzeDanger' : '$onzeGreen'}
                disabled={loading}
                flex={1}
                height={48}
                onPress={onConfirm}
              >
                <Text color="$onzeSurface" fontWeight="800">
                  {loading ? 'Salvando...' : confirmLabel}
                </Text>
              </Button>
            </XStack>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
