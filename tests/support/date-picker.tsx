import React from 'react';

export const DateTimePickerAndroid = {
  open: jest.fn(),
  dismiss: jest.fn(async () => undefined),
};
export default function DatePicker(props: Record<string, unknown>) {
  return React.createElement('DateTimePicker', {
    ...props,
    accessible: true,
    accessibilityLabel: 'Seletor nativo de data e hora',
  });
}
