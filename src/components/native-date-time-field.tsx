import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform } from 'react-native';
import { Input, Text, XStack, YStack } from 'tamagui';

import { DateTimeInputMode, formatDateInput, formatTimeInput, pickerDateFromInput, pickerInputValue } from '../lib/date-format';
import { AppButton } from './app-button';

type Props = {
  mode: DateTimeInputMode;
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  width?: number;
};

export function NativeDateTimeField({ mode, value, onChange, label, disabled = false, width }: Props) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(() => pickerDateFromInput(value, mode));
  const androidOpen = useRef(false);
  const placeholder = mode === 'date' ? 'DD/MM/AAAA' : 'HH:MM';

  useEffect(() => () => {
    if (Platform.OS === 'android' && androidOpen.current) {
      void DateTimePickerAndroid.dismiss(mode).catch(() => undefined);
    }
  }, [mode]);

  function open() {
    if (disabled || androidOpen.current) return;
    const initial = pickerDateFromInput(value, mode);
    if (Platform.OS === 'android') {
      androidOpen.current = true;
      DateTimePickerAndroid.open({
        mode,
        value: initial,
        display: 'default',
        is24Hour: true,
        positiveButton: { label: 'Confirmar' },
        negativeButton: { label: 'Cancelar' },
        onValueChange: (_event, selected) => {
          androidOpen.current = false;
          onChange(pickerInputValue(selected, mode));
        },
        onDismiss: () => { androidOpen.current = false; },
        onError: () => { androidOpen.current = false; },
      });
      return;
    }
    setDraft(initial);
    setVisible(true);
  }

  if (Platform.OS === 'web') {
    return (
      <Input
        accessibilityLabel={label}
        backgroundColor="$onzeSurface"
        borderColor="$onzeBorder"
        color="$onzeInk"
        disabled={disabled}
        keyboardType="number-pad"
        maxLength={mode === 'date' ? 10 : 5}
        onChangeText={(text) => onChange(mode === 'date' ? formatDateInput(text) : formatTimeInput(text))}
        placeholder={placeholder}
        value={value}
        width={width}
      />
    );
  }

  return (
    <>
      <AppButton
        accessibilityLabel={`${label}: ${value || 'Selecionar'}`}
        accessibilityHint={mode === 'date' ? 'Abre o calendário do sistema' : 'Abre o relógio do sistema'}
        variant="secondary"
        disabled={disabled}
        justifyContent="flex-start"
        onPress={open}
        paddingHorizontal="$3"
        width={width}
      >
        <Text color={value ? '$onzeInk' : '$onzeMuted'} fontSize={14}>{value || placeholder}</Text>
      </AppButton>
      {Platform.OS === 'ios' ? (
        <Modal animationType="fade" transparent visible={visible} onRequestClose={() => setVisible(false)}>
          <YStack flex={1} justifyContent="center" backgroundColor="rgba(15, 23, 42, 0.42)" padding="$5">
            <YStack backgroundColor="$onzeSurface" borderRadius="$6" gap="$3" padding="$4">
              <Text color="$onzeInk" fontSize={18} fontWeight="800">{label}</Text>
              <DateTimePicker
                mode={mode}
                value={draft}
                display="spinner"
                locale="pt-BR"
                themeVariant="light"
                onValueChange={(_event, selected) => setDraft(selected)}
              />
              <XStack gap="$3">
                <AppButton variant="secondary" flex={1} onPress={() => setVisible(false)}>
                  <Text color="$onzeInk" fontWeight="800">Cancelar</Text>
                </AppButton>
                <AppButton variant="primary" flex={1} onPress={() => {
                  onChange(pickerInputValue(draft, mode));
                  setVisible(false);
                }}>
                  <Text color="$onzeSurface" fontWeight="800">Confirmar</Text>
                </AppButton>
              </XStack>
            </YStack>
          </YStack>
        </Modal>
      ) : null}
    </>
  );
}
