import React from 'react';
import { GlobalLoadingOverlay } from '../../src/components/global-loading-overlay';
import { ServerLoadingScreen } from '../../src/components/server-loading-screen';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { BackButton } from '../../src/components/back-button';
import { beginGlobalLoading, resetGlobalLoadingForTests } from '../../src/lib/global-loading';
import { renderApp, screen, act, userEvent } from '../support/render';
import { navigation, route } from '../support/router';

beforeEach(() => resetGlobalLoadingForTests());

test('loading curto termina sem piscar um indicador na tela', async () => {
  jest.useFakeTimers();
  await renderApp(<GlobalLoadingOverlay />);
  let finish!: () => void;
  await act(() => {
    finish = beginGlobalLoading({ title: 'Consultando...' });
  });
  await act(() => {
    jest.advanceTimersByTime(100);
    finish();
    jest.advanceTimersByTime(1000);
  });
  expect(screen.queryByRole('progressbar')).toBeNull();
});

test('loading aparece após o atraso e muda a mensagem quando o servidor demora', async () => {
  jest.useFakeTimers();
  await renderApp(
    <>
      <ServerLoadingScreen title="Fallback" />
      <GlobalLoadingOverlay />
    </>,
  );
  let finish!: () => void;
  await act(() => {
    finish = beginGlobalLoading({
      title: 'Consultando jogos',
      message: 'Aguarde a lista.',
      slowMessage: 'Conexão lenta.',
    });
  });
  await act(() => {
    jest.advanceTimersByTime(179);
  });
  expect(screen.queryByRole('progressbar')).toBeNull();
  await act(() => {
    jest.advanceTimersByTime(1);
  });
  expect(screen.getAllByRole('progressbar', { name: 'Consultando jogos' })).toHaveLength(1);
  expect(screen.getByText('Aguarde a lista.')).toBeOnTheScreen();
  await act(() => {
    jest.advanceTimersByTime(7820);
  });
  expect(screen.getByText('Conexão lenta.')).toBeOnTheScreen();
  await act(() => finish());
  expect(screen.queryByRole('progressbar')).toBeNull();
});

test('operações simultâneas mantêm o indicador até a última terminar', async () => {
  jest.useFakeTimers();
  await renderApp(<GlobalLoadingOverlay />);
  let first!: () => void;
  let second!: () => void;
  await act(() => {
    first = beginGlobalLoading({ title: 'Primeira operação' });
  });
  await act(() => {
    jest.advanceTimersByTime(180);
  });
  await act(() => {
    second = beginGlobalLoading({ title: 'Segunda operação' });
  });
  expect(screen.getByRole('progressbar', { name: 'Segunda operação' })).toBeOnTheScreen();
  await act(() => first());
  expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  await act(() => second());
  expect(screen.queryByRole('progressbar')).toBeNull();
});

test('splash pode suspender o modal sem perder a operação pendente', async () => {
  jest.useFakeTimers();
  const ui = await renderApp(<GlobalLoadingOverlay suspended />);
  let finish!: () => void;
  await act(() => {
    finish = beginGlobalLoading();
    jest.advanceTimersByTime(200);
  });
  await act(() => {
    jest.advanceTimersByTime(200);
  });
  expect(screen.queryByRole('progressbar')).toBeNull();
  await ui.rerender(<GlobalLoadingOverlay />);
  expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  await act(() => finish());
});

test('navegação identifica a aba selecionada e abre o destino solicitado', async () => {
  route.pathname = '/group';
  await renderApp(<BottomNavigation active="groups" />);
  expect(screen.getByRole('tab', { name: 'Grupos', selected: true })).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('tab', { name: 'Home' }));
  expect(navigation.dismissTo).toHaveBeenCalledWith('/home');
  await userEvent.press(screen.getByRole('tab', { name: 'Configurações' }));
  expect(navigation.dismissTo).toHaveBeenCalledWith('/settings');
});

test('tocar na aba da página interna retorna à raiz, sem duplicar a própria raiz', async () => {
  route.pathname = '/match';
  const ui = await renderApp(<BottomNavigation active="groups" />);
  await userEvent.press(screen.getByRole('tab', { name: 'Grupos' }));
  expect(navigation.dismissTo).toHaveBeenCalledWith('/groups');
  navigation.dismissTo.mockClear();
  route.pathname = '/groups';
  await ui.rerender(<BottomNavigation active="groups" />);
  await userEvent.press(screen.getByRole('tab', { name: 'Grupos' }));
  expect(navigation.dismissTo).not.toHaveBeenCalled();
});

test('botão voltar conserva o rótulo acessível e a ação recebida', async () => {
  const back = jest.fn();
  await renderApp(<BackButton accessibilityLabel="Voltar para meus grupos" onPress={back} />);
  await userEvent.press(screen.getByRole('button', { name: 'Voltar para meus grupos' }));
  expect(back).toHaveBeenCalledTimes(1);
});
