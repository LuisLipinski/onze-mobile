import { Modal, Pressable } from 'react-native';
import { Button, Text, YStack } from 'tamagui';

import type { PaymentSettlementResolution } from '../lib/api';

type PaymentSettlementModalProps = {
  visible: boolean;
  playerName: string;
  reviewRequired: boolean;
  loading?: boolean;
  onCancel: () => void;
  onResolve: (resolution: PaymentSettlementResolution) => void;
};

export function PaymentSettlementModal({
  visible,
  playerName,
  reviewRequired,
  loading = false,
  onCancel,
  onResolve,
}: PaymentSettlementModalProps) {
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
                Resolver acerto
              </Text>
              <Text color="$onzeMuted" fontSize={14} lineHeight={21}>
                {reviewRequired
                  ? `${playerName} informou o pagamento, mas saiu antes da validação. Confira o PIX e registre o resultado.`
                  : `O pagamento de ${playerName} já foi confirmado. Registre como o valor será acertado.`}
              </Text>
            </YStack>

            <YStack gap="$2">
              {reviewRequired ? (
                <SettlementButton
                  label="Pagamento não localizado"
                  color="$onzeDanger"
                  disabled={loading}
                  onPress={() => onResolve('NOT_RECEIVED')}
                />
              ) : null}
              <SettlementButton
                label="Marcar como reembolsado"
                color="$onzeGreen"
                disabled={loading}
                onPress={() => onResolve('REFUNDED')}
              />
              <SettlementButton
                label="Registrar crédito para próxima partida"
                color="$onzeGreen"
                disabled={loading}
                onPress={() => onResolve('CREDITED')}
              />
              <SettlementButton
                label="Manter pagamento"
                color="#8A6414"
                disabled={loading}
                onPress={() => onResolve('RETAINED')}
              />
            </YStack>

            <Button
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderWidth={1}
              disabled={loading}
              height={48}
              onPress={onCancel}
            >
              <Text color="$onzeInk" fontWeight="800">
                {loading ? 'Salvando...' : 'Cancelar'}
              </Text>
            </Button>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SettlementButton({
  label,
  color,
  disabled,
  onPress,
}: {
  label: string;
  color: '$onzeDanger' | '$onzeGreen' | '#8A6414';
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      backgroundColor="$onzeSurface"
      borderColor={color}
      borderWidth={1}
      disabled={disabled}
      height={48}
      onPress={onPress}
    >
      <Text color={color} fontWeight="900">{label}</Text>
    </Button>
  );
}
