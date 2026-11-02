import React from 'react';
import * as Notifications from 'expo-notifications';
import { AccessibilityInfo } from 'react-native';
import { GroupDeletionNotices } from '../../src/components/group-deletion-notices';
import { AppOpening } from '../../src/components/app-opening';
import { saveSession } from '../../src/lib/auth-storage';
import { renderApp, screen, userEvent, waitFor, act, fireEvent } from '../support/render';
import { user } from '../support/fixtures';
import { respond, fetchMock, deferred, pendingResponse } from '../support/network';
import { navigation } from '../support/router';
jest.mock('expo-notifications', () => ({
  // Native delivery/scheduling is a boundary; the notice component and API stay real.
  setNotificationHandler: jest.fn(),
  AndroidNotificationPriority: { HIGH: 'high' },
  getAllScheduledNotificationsAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
}));
const notice = {
  id: 'notice-1',
  groupId: 'group-1',
  groupName: 'Time da Vila',
  deletedAt: '2026-11-02T18:00:00Z',
};
beforeEach(() => {
  jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]);
  jest.mocked(Notifications.addNotificationReceivedListener).mockReturnValue({ remove: jest.fn() });
});
test('aviso de exclusão confirma leitura no servidor antes de abrir os grupos', async () => {
  await saveSession('access', user);
  respond('/api/groups/deletion-notices', [notice], 200, 'GET');
  const response = deferred<unknown>();
  pendingResponse('/api/groups/deletion-notices/notice-1/acknowledge', response.promise);
  await renderApp(<GroupDeletionNotices />);
  expect(await screen.findByText(/O grupo “Time da Vila” foi excluído/)).toBeOnTheScreen();
  await waitFor(() =>
    expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1),
  );
  await userEvent.press(screen.getByRole('button', { name: 'Ver meus grupos' }));
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Concluindo...' })).toBeDisabled();
  await act(() => response.resolve(undefined));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/groups'));
  expect(screen.queryByText('Grupo excluído')).toBeNull();
});
test('falha ao confirmar conserva aviso e permite tentar novamente', async () => {
  await saveSession('access', user);
  respond('/api/groups/deletion-notices', [notice], 200, 'GET');
  respond('/api/groups/deletion-notices/notice-1/acknowledge', {}, 503);
  respond('/api/groups/deletion-notices/notice-1/acknowledge', undefined, 204);
  await renderApp(<GroupDeletionNotices />);
  await userEvent.press(await screen.findByRole('button', { name: 'Ver meus grupos' }));
  expect(await screen.findByText(/Não foi possível concluir. Tente novamente./)).toBeOnTheScreen();
  expect(navigation.replace).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('button', { name: 'Ver meus grupos' }));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/groups'));
});
test('resposta de aviso de outra sessão é descartada', async () => {
  await saveSession('access-old', user);
  const response = deferred<unknown>();
  pendingResponse('/api/groups/deletion-notices', response.promise, 'GET');
  await renderApp(<GroupDeletionNotices />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await saveSession('access-new', { ...user, id: 'user-2', email: 'bruno@onze.test' });
  await act(() => response.resolve([notice]));
  expect(screen.queryByText('Grupo excluído')).toBeNull();
  expect(Notifications.getAllScheduledNotificationsAsync).not.toHaveBeenCalled();
});
test('sem sessão não consulta avisos; desmontagem remove o listener nativo', async () => {
  const ui = await renderApp(<GroupDeletionNotices />);
  expect(fetchMock).not.toHaveBeenCalled();
  const subscription = jest.mocked(Notifications.addNotificationReceivedListener).mock.results[0]
    .value;
  await ui.unmount();
  expect(subscription.remove).toHaveBeenCalledTimes(1);
});

test('abertura com movimento reduzido só libera a tela quando o app estiver pronto', async () => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const props = {
    ready: false,
    onReady: jest.fn(),
    onSequenceComplete: jest.fn(),
    onFinished: jest.fn(),
  };
  const ui = await renderApp(<AppOpening {...props} />);
  expect(props.onReady).not.toHaveBeenCalled();
  await fireEvent(screen.getByRole('image', { name: 'Onze' }), 'layout', {
    nativeEvent: { layout: { width: 400, height: 800 } },
  });
  expect(props.onReady).toHaveBeenCalledTimes(1);
  await act(() => {
    jest.advanceTimersByTime(400);
  });
  expect(props.onSequenceComplete).toHaveBeenCalledTimes(1);
  expect(props.onFinished).not.toHaveBeenCalled();
  await ui.rerender(<AppOpening {...props} ready />);
  await act(() => {
    jest.advanceTimersByTime(200);
  });
  expect(props.onFinished).toHaveBeenCalledTimes(1);
});
test('consulta de acessibilidade pendente usa prazo de segurança sem repetir callbacks', async () => {
  jest.useFakeTimers();
  const response = deferred<boolean>();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(response.promise);
  const props = {
    ready: false,
    onReady: jest.fn(),
    onSequenceComplete: jest.fn(),
    onFinished: jest.fn(),
  };
  const ui = await renderApp(<AppOpening {...props} />);
  await fireEvent(screen.getByRole('image', { name: 'Onze' }), 'layout', {
    nativeEvent: { layout: { width: 400, height: 800 } },
  });
  await act(() => {
    jest.advanceTimersByTime(1200);
  });
  expect(props.onReady).toHaveBeenCalledTimes(1);
  expect(props.onSequenceComplete).toHaveBeenCalledTimes(1);
  await act(() => response.resolve(false));
  await act(() => {
    jest.advanceTimersByTime(6000);
  });
  expect(props.onReady).toHaveBeenCalledTimes(1);
  expect(props.onSequenceComplete).toHaveBeenCalledTimes(1);
  await ui.unmount();
  expect(props.onFinished).not.toHaveBeenCalled();
});
