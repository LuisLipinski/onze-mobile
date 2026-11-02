import React from 'react';
import { Platform } from 'react-native';
import {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { NativeDateTimeField } from '../../src/components/native-date-time-field';
import { renderApp, screen, userEvent, fireEvent, act } from '../support/render';

test('Android abre um seletor por vez e só altera valor ao confirmar', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const change = jest.fn();
  await renderApp(
    <NativeDateTimeField mode="date" label="Data do jogo" value="02/11/2026" onChange={change} />,
  );
  const button = screen.getByRole('button', { name: 'Data do jogo: 02/11/2026' });
  await userEvent.press(button);
  await userEvent.press(button);
  expect(DateTimePickerAndroid.open).toHaveBeenCalledTimes(1);
  const options = jest.mocked(DateTimePickerAndroid.open).mock.calls[0][0];
  expect(change).not.toHaveBeenCalled();
  await act(() => options.onDismiss?.());
  expect(change).not.toHaveBeenCalled();
  await userEvent.press(button);
  const next = jest.mocked(DateTimePickerAndroid.open).mock.calls[1][0];
  await act(() => next.onValueChange?.({} as DateTimePickerEvent, new Date(2026, 10, 5)));
  expect(change).toHaveBeenCalledWith('05/11/2026');
});

test('seletor Android pendente é fechado ao desmontar o campo', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const ui = await renderApp(
    <NativeDateTimeField mode="time" label="Horário" value="18:00" onChange={jest.fn()} />,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Horário: 18:00' }));
  await ui.unmount();
  expect(DateTimePickerAndroid.dismiss).toHaveBeenCalledWith('time');
});

test('campo desabilitado não abre recurso nativo', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  await renderApp(
    <NativeDateTimeField mode="date" label="Data" value="" disabled onChange={jest.fn()} />,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Data: Selecionar' }));
  expect(DateTimePickerAndroid.open).not.toHaveBeenCalled();
});

test('iOS mantém alteração em rascunho até confirmar e descarta cancelamento', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const change = jest.fn();
  await renderApp(
    <NativeDateTimeField mode="time" label="Horário" value="18:00" onChange={change} />,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Horário: 18:00' }));
  await fireEvent(
    screen.getByLabelText('Seletor nativo de data e hora'),
    'valueChange',
    {},
    new Date(2026, 10, 2, 19, 30),
  );
  expect(change).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
  expect(change).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('button', { name: 'Horário: 18:00' }));
  await fireEvent(
    screen.getByLabelText('Seletor nativo de data e hora'),
    'valueChange',
    {},
    new Date(2026, 10, 2, 20, 15),
  );
  await userEvent.press(screen.getByRole('button', { name: 'Confirmar' }));
  expect(change).toHaveBeenCalledWith('20:15');
  expect(screen.queryByLabelText('Seletor nativo de data e hora')).toBeNull();
});

test('campo web aplica máscara antes de devolver o valor', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  const change = jest.fn();
  await renderApp(
    <NativeDateTimeField mode="date" label="Data do jogo" value="" onChange={change} />,
  );
  await fireEvent.changeText(screen.getByLabelText('Data do jogo'), '05112026');
  expect(change).toHaveBeenCalledWith('05/11/2026');
});
