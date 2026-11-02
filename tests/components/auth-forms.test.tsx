import React from 'react';
import RegisterScreen from '../../app/register';
import ForgotPasswordScreen from '../../app/forgot-password';
import ResetPasswordScreen from '../../app/reset-password';
import { GlobalLoadingOverlay } from '../../src/components/global-loading-overlay';
import { getGlobalLoadingSnapshot, resetGlobalLoadingForTests } from '../../src/lib/global-loading';
import { renderApp, screen, userEvent, act, waitFor } from '../support/render';
import { navigation, route } from '../support/router';
import { respond, fetchMock, deferred, pendingResponse } from '../support/network';

beforeEach(() => resetGlobalLoadingForTests());

async function type(placeholder: string, value: string) {
  await userEvent.type(screen.getByPlaceholderText(placeholder), value);
}

test('cadastro envia os valores digitados e preserva o destino do convite', async () => {
  route.params = { joinCode: 'TIME10', matchId: 'match-1', destination: 'live' };
  respond('/api/auth/register', { message: 'Criado' }, 201);
  await renderApp(<RegisterScreen />);
  expect(screen.getByText('Crie seu acesso para aceitar o convite da pelada.')).toBeOnTheScreen();
  await type('Seu nome', 'Ana Silva');
  await type('E-mail', 'ana@onze.test');
  await type('Senha (mínimo 8 caracteres)', 'Senha123!');
  await userEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledWith({
      pathname: '/',
      params: { registered: '1', ...route.params },
    }),
  );
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
    displayName: 'Ana Silva',
    email: 'ana@onze.test',
    password: 'Senha123!',
  });
});

test('erro do cadastro aparece na tela e permite corrigir e reenviar', async () => {
  respond('/api/auth/register', { message: 'E-mail já cadastrado.' }, 409);
  await renderApp(<RegisterScreen />);
  await type('E-mail', 'duplicado@onze.test');
  await userEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
  expect(await screen.findByText('E-mail já cadastrado.')).toBeOnTheScreen();
  expect(navigation.replace).not.toHaveBeenCalled();
  await userEvent.clear(screen.getByPlaceholderText('E-mail'));
  await type('E-mail', 'novo@onze.test');
  respond('/api/auth/register', {}, 201);
  await userEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledWith({ pathname: '/', params: { registered: '1' } }),
  );
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('cadastro pendente mantém um único loading e bloqueia novo envio', async () => {
  jest.useFakeTimers();
  const reply = deferred<unknown>();
  pendingResponse('/api/auth/register', reply.promise);
  await renderApp(
    <>
      <RegisterScreen />
      <GlobalLoadingOverlay />
    </>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
  await act(() => {
    jest.advanceTimersByTime(180);
  });
  expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Criar conta' })).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(() => reply.resolve({}));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalled());
  expect(getGlobalLoadingSnapshot().visible).toBe(false);
});

test('recuperação envia e-mail e abre o formulário de código', async () => {
  respond('/api/auth/password-reset/request', {}, 202);
  await renderApp(<ForgotPasswordScreen />);
  await type('E-mail', 'ana@onze.test');
  await userEvent.press(screen.getByRole('button', { name: 'Enviar código' }));
  await waitFor(() =>
    expect(navigation.push).toHaveBeenCalledWith({
      pathname: '/reset-password',
      params: { email: 'ana@onze.test' },
    }),
  );
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ email: 'ana@onze.test' });
});

test('falha de recuperação preserva formulário e permite tentar novamente', async () => {
  respond('/api/auth/password-reset/request', { message: 'Tente mais tarde.' }, 503);
  await renderApp(<ForgotPasswordScreen />);
  await type('E-mail', 'ana@onze.test');
  await userEvent.press(screen.getByRole('button', { name: 'Enviar código' }));
  expect(await screen.findByText('Tente mais tarde.')).toBeOnTheScreen();
  expect(screen.getByPlaceholderText('E-mail')).toHaveDisplayValue('ana@onze.test');
  expect(navigation.push).not.toHaveBeenCalled();
});

test('redefinição aproveita e-mail recebido, filtra código e confirma nova senha', async () => {
  route.params = { email: 'ana@onze.test' };
  respond('/api/auth/password-reset/confirm', {});
  await renderApp(<ResetPasswordScreen />);
  expect(screen.getByPlaceholderText('E-mail')).toHaveDisplayValue('ana@onze.test');
  await type('Código de 6 dígitos', 'a12b34');
  await type('Nova senha (mínimo 8 caracteres)', 'NovaSenha123!');
  await userEvent.press(screen.getByRole('button', { name: 'Alterar senha' }));
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledWith({
      pathname: '/',
      params: { passwordReset: '1' },
    }),
  );
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
    email: 'ana@onze.test',
    code: '1234',
    newPassword: 'NovaSenha123!',
  });
});

test('código inválido mostra erro sem navegar', async () => {
  respond('/api/auth/password-reset/confirm', { message: 'Código inválido ou expirado.' }, 400);
  await renderApp(<ResetPasswordScreen />);
  await userEvent.press(screen.getByRole('button', { name: 'Alterar senha' }));
  expect(await screen.findByText('Código inválido ou expirado.')).toBeOnTheScreen();
  expect(navigation.replace).not.toHaveBeenCalled();
});

test('reenvio pendente desabilita o botão e mostra resultado sem sair da tela', async () => {
  route.params = { email: 'ana@onze.test' };
  const reply = deferred<unknown>();
  pendingResponse('/api/auth/password-reset/request', reply.promise);
  await renderApp(<ResetPasswordScreen />);
  await userEvent.press(screen.getByRole('button', { name: 'Reenviar código' }));
  expect(screen.getByRole('button', { name: 'Solicitando...' })).toBeDisabled();
  await act(() => reply.resolve({}));
  expect(
    await screen.findByText(
      'Se o reenvio estiver liberado, um novo código será enviado para seu e-mail.',
    ),
  ).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Reenviar código' })).toBeEnabled();
  expect(navigation.replace).not.toHaveBeenCalled();
});

test('erro ao reenviar libera nova tentativa', async () => {
  respond('/api/auth/password-reset/request', { message: 'Aguarde antes de reenviar.' }, 429);
  await renderApp(<ResetPasswordScreen />);
  await userEvent.press(screen.getByRole('button', { name: 'Reenviar código' }));
  expect(await screen.findByText('Aguarde antes de reenviar.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Reenviar código' })).toBeEnabled();
});
