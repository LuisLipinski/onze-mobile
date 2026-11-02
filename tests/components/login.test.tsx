import React from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import LoginScreen from '../../app/index';
import {
  getAccessToken,
  getBiometricCredential,
  getStoredCurrentUser,
  saveSession,
  enableBiometricLogin,
} from '../../src/lib/auth-storage';
import { resetGlobalLoadingForTests } from '../../src/lib/global-loading';
import { renderApp, screen, userEvent, waitFor, act } from '../support/render';
import { navigation, route } from '../support/router';
import { user, authResponse } from '../support/fixtures';
import { respond, fetchMock, deferred, pendingResponse, networkFailure } from '../support/network';

beforeEach(() => {
  resetGlobalLoadingForTests();
  jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockResolvedValue(false);
  jest.spyOn(LocalAuthentication, 'isEnrolledAsync').mockResolvedValue(false);
  jest.spyOn(LocalAuthentication, 'authenticateAsync').mockResolvedValue({ success: true });
});
async function biometricAccount() {
  jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
  jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
  await saveSession('expired-access', user, 'r'.repeat(43));
  await enableBiometricLogin();
}
async function passwordLogin(email = user.email) {
  await userEvent.type(screen.getByPlaceholderText('E-mail'), email);
  await userEvent.type(screen.getByPlaceholderText('Senha'), 'Senha123!');
  await userEvent.press(screen.getByRole('button', { name: 'Entrar' }));
}

test('login persiste a sessão e abre a Home após a resposta', async () => {
  respond('/api/auth/login', authResponse());
  await renderApp(<LoginScreen />);
  await passwordLogin();
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/home'));
  expect(await getAccessToken()).toBe('new-access');
  expect(await getStoredCurrentUser()).toEqual(user);
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
    email: user.email,
    password: 'Senha123!',
  });
});

test.each([
  [{ joinCode: 'TIME10' }, { pathname: '/join-group', params: { code: 'TIME10' } }],
  [
    { matchId: 'match-1', destination: 'live' },
    { pathname: '/live-match', params: { matchId: 'match-1' } },
  ],
  [{ matchId: 'match-1' }, { pathname: '/match', params: { matchId: 'match-1' } }],
])('login preserva o destino do link %j', async (params, destination) => {
  route.params = params;
  respond('/api/auth/login', authResponse());
  await renderApp(<LoginScreen />);
  await passwordLogin();
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(destination));
});

test('credenciais inválidas mantêm o formulário para nova tentativa', async () => {
  respond('/api/auth/login', { message: 'E-mail ou senha inválidos.' }, 401);
  await renderApp(<LoginScreen />);
  await passwordLogin();
  expect(await screen.findByText('E-mail ou senha inválidos.')).toBeOnTheScreen();
  expect(screen.getByPlaceholderText('E-mail')).toHaveDisplayValue(user.email);
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(await getAccessToken()).toBeNull();
});

test('sessão comum válida é restaurada sem preencher senha', async () => {
  await saveSession('active-access', user, 'r'.repeat(43));
  respond('/api/auth/me', user, 200, 'GET');
  await renderApp(<LoginScreen />);
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/home'));
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
    Authorization: 'Bearer active-access',
  });
});

test('sessão comum expirada limpa o acesso e mostra login', async () => {
  await saveSession('expired-access', user, 'r'.repeat(43));
  respond('/api/auth/me', {}, 401, 'GET');
  await renderApp(<LoginScreen />);
  expect(await screen.findByPlaceholderText('Senha')).toBeOnTheScreen();
  expect(await getAccessToken()).toBeNull();
  expect(navigation.replace).not.toHaveBeenCalled();
});

test('recados de cadastro e senha redefinida são exibidos no login', async () => {
  route.params = { registered: '1', passwordReset: '1' };
  await renderApp(<LoginScreen />);
  expect(
    await screen.findByText('Conta criada com sucesso. Faça login para continuar.'),
  ).toBeOnTheScreen();
  expect(
    screen.getByText('Senha alterada com sucesso. Entre com sua nova senha.'),
  ).toBeOnTheScreen();
});

test('digital renova acesso salvo sem exibir senha ou chamar API antes da confirmação', async () => {
  await biometricAccount();
  respond('/api/auth/refresh', authResponse());
  await renderApp(<LoginScreen />);
  expect(screen.queryByPlaceholderText('Senha')).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('button', { name: 'Entrar como Ana Silva' }));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/home'));
  expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
    refreshToken: 'r'.repeat(43),
  });
  expect(await getAccessToken()).toBe('new-access');
  expect((await getBiometricCredential())?.refreshToken).toBe('s'.repeat(43));
});

test('cancelar a digital mostra senha sem consumir renovação', async () => {
  await biometricAccount();
  jest
    .mocked(LocalAuthentication.authenticateAsync)
    .mockResolvedValue({ success: false, error: 'user_cancel' });
  await renderApp(<LoginScreen />);
  await userEvent.press(screen.getByRole('button', { name: 'Entrar como Ana Silva' }));
  expect(
    await screen.findByText(
      'Biometria não confirmada. Você também pode entrar com e-mail e senha.',
    ),
  ).toBeOnTheScreen();
  expect(screen.getByPlaceholderText('Senha')).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
  expect((await getBiometricCredential())?.refreshToken).toBe('r'.repeat(43));
});

test('falha temporária mantém botão biométrico e a próxima digital entra', async () => {
  await biometricAccount();
  respond('/api/auth/refresh', { message: 'Tente novamente em instantes.' }, 503);
  await renderApp(<LoginScreen />);
  await userEvent.press(screen.getByRole('button', { name: 'Entrar como Ana Silva' }));
  expect(await screen.findByText('Tente novamente em instantes.')).toBeOnTheScreen();
  expect(screen.queryByPlaceholderText('Senha')).toBeNull();
  respond('/api/auth/refresh', authResponse());
  await userEvent.press(screen.getByRole('button', { name: 'Entrar como Ana Silva' }));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/home'));
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('renovação revogada pede senha e o login restaura a preferência biométrica', async () => {
  await biometricAccount();
  respond('/api/auth/refresh', {}, 401);
  await renderApp(<LoginScreen />);
  await userEvent.press(screen.getByRole('button', { name: 'Entrar como Ana Silva' }));
  expect(await screen.findByPlaceholderText('Senha')).toBeOnTheScreen();
  expect(await getBiometricCredential()).toBeNull();
  expect(await getAccessToken()).toBeNull();
  respond('/api/auth/login', authResponse());
  await userEvent.type(screen.getByPlaceholderText('Senha'), 'Senha123!');
  await userEvent.press(screen.getByRole('button', { name: 'Entrar' }));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/home'));
  expect((await getBiometricCredential())?.refreshToken).toBe('s'.repeat(43));
});

test('troca de conta com senha preserva o vínculo biométrico anterior', async () => {
  await biometricAccount();
  const other = { ...user, id: 'user-2', email: 'bruno@onze.test', displayName: 'Bruno' };
  respond('/api/auth/login', authResponse({ user: other }));
  await renderApp(<LoginScreen />);
  await userEvent.press(screen.getByRole('button', { name: 'Entrar com outra conta' }));
  await passwordLogin(other.email);
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/home'));
  expect((await getStoredCurrentUser())?.id).toBe('user-2');
  expect((await getBiometricCredential())?.email).toBe(user.email);
  expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
});

test('renovação pendente impede toques duplicados', async () => {
  await biometricAccount();
  const reply = deferred<unknown>();
  pendingResponse('/api/auth/refresh', reply.promise);
  await renderApp(<LoginScreen />);
  const button = screen.getByRole('button', { name: 'Entrar como Ana Silva' });
  await userEvent.press(button);
  expect(button).toBeDisabled();
  await userEvent.press(button);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(1);
  await act(() => reply.resolve(authResponse()));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/home'));
});

test('indisponibilidade do sensor oferece senha e não usa a credencial biométrica', async () => {
  await biometricAccount();
  jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);
  await renderApp(<LoginScreen />);
  expect(
    await screen.findByText(
      'A biometria não está disponível neste aparelho. Entre novamente com e-mail e senha.',
    ),
  ).toBeOnTheScreen();
  expect(screen.getByPlaceholderText('Senha')).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('erro de conexão mantém a opção de digital', async () => {
  await biometricAccount();
  networkFailure('/api/auth/refresh', new TypeError('Network request failed'));
  await renderApp(<LoginScreen />);
  await userEvent.press(screen.getByRole('button', { name: 'Entrar como Ana Silva' }));
  expect(await screen.findByRole('button', { name: 'Entrar como Ana Silva' })).toBeEnabled();
  expect(screen.queryByPlaceholderText('Senha')).toBeNull();
  expect(navigation.replace).not.toHaveBeenCalled();
});
