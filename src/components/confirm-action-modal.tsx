import { Modal, Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { AppButton } from './app-button';

type ConfirmActionModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string | null;
  destructive?: boolean;
  loading?: boolean;
  loadingLabel?: string;
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
  loadingLabel = 'Salvando...',
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
              {cancelLabel ? (
                <AppButton
                  variant="secondary"
                  disabled={loading}
                  flex={1}
                  onPress={onCancel}
                >
                  <Text color="$onzeInk" fontWeight="800">
                    {cancelLabel}
                  </Text>
                </AppButton>
              ) : null}
              <AppButton
                variant={destructive ? 'destructive' : 'primary'}
                disabled={loading}
                flex={1}
                onPress={onConfirm}
              >
                <Text color="$onzeSurface" fontWeight="800">
                  {loading ? loadingLabel : confirmLabel}
                </Text>
              </AppButton>
            </XStack>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
