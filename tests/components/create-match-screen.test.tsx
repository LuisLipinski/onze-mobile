import React from 'react';
import { Platform } from 'react-native';
import {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import CreateMatchScreen from '../../app/create-match';
import { saveSession, clearSession } from '../../src/lib/auth-storage';
import { resetGlobalLoadingForTests } from '../../src/lib/global-loading';
import { renderApp, screen, userEvent, fireEvent, act, waitFor } from '../support/render';
import { route, navigation } from '../support/router';
import { user, match } from '../support/fixtures';
import { fetchMock, respond, deferred, pendingResponse } from '../support/network';

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-04T18:00:00Z'));
  jest.replaceProperty(Platform, 'OS', 'android');
  resetGlobalLoadingForTests();
  await saveSession('access', user);
  route.params = { groupId: 'group-1', venue: 'Arena Teste' };
});
const endpoint = '/api/groups/group-1/matches';
const payload = () => JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body));
async function toggle(label: string, enabled = true) {
  await fireEvent(screen.getByLabelText(label), 'valueChange', enabled);
}
async function submit() {
  await userEvent.press(
    screen.getByRole('button', { name: /^(Marcar jogo|Criar jogos semanais)$/ }),
  );
}
async function clock(label: string, hour: number) {
  await userEvent.press(screen.getByRole('button', { name: new RegExp(`^${label}:`) }));
  const options = jest.mocked(DateTimePickerAndroid.open).mock.calls.at(-1)![0];
  await act(() => options.onValueChange?.({} as DateTimePickerEvent, new Date(2026, 10, 5, hour)));
}
test('cria partida avulsa com fuso, prazos, vagas e destino de compartilhamento', async () => {
  respond(endpoint, match());
  await renderApp(<CreateMatchScreen />);
  await submit();
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledWith({
      pathname: '/match',
      params: { matchId: 'match-1', sharePrompt: '1' },
    }),
  );
  expect(payload()).toEqual({
    date: '2026-11-05',
    startTime: '20:00:00',
    timeZone: 'America/Sao_Paulo',
    venue: 'Arena Teste',
    maxPlayers: 14,
    minimumPlayers: 14,
    matchType: 'INTERNAL',
    teamCount: 2,
    requiredGoalkeepers: 2,
    modality: 'FUT7',
    periodsEnabled: false,
    overtimeEnabled: false,
    penaltyShootoutEnabled: false,
    signupDeadlineDate: '2026-11-05',
    signupDeadlineTime: '12:00:00',
    paymentRequired: false,
    goalkeeperPays: true,
    notes: null,
    recurrence: 'NONE',
  });
});
test('partida semanal preserva cobrança padrão e permite isentar goleiros', async () => {
  route.params = { ...route.params, paymentAmount: '25', pixKey: ' pix@onze.test ' };
  respond(endpoint, match({ recurrence: 'WEEKLY' }));
  await renderApp(<CreateMatchScreen />);
  await toggle('Repetir jogo toda semana');
  await toggle('Cobrar pagamento dos goleiros', false);
  await submit();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(payload()).toMatchObject({
    recurrence: 'WEEKLY',
    paymentAmount: 25,
    pixKey: 'pix@onze.test',
    goalkeeperPays: false,
    paymentDeadlineDate: '2026-11-05',
    paymentDeadlineTime: '18:00:00',
  });
});
test('pênaltis podem ser configurados sem prorrogação', async () => {
  respond(endpoint, match());
  await renderApp(<CreateMatchScreen />);
  await toggle('Controlar os tempos do jogo');
  await toggle('Jogo terá disputa por pênaltis em caso de empate');
  await submit();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(payload()).toMatchObject({
    periodsEnabled: true,
    periodCount: 2,
    periodDurationMinutes: 20,
    overtimeEnabled: false,
    penaltyShootoutEnabled: true,
  });
  expect(payload()).not.toHaveProperty('overtimePeriodCount');
});
test('prorrogação usa quantidade e duração próprias', async () => {
  respond(endpoint, match());
  await renderApp(<CreateMatchScreen />);
  await toggle('Controlar os tempos do jogo');
  await toggle('Jogo terá prorrogação em caso de empate');
  await fireEvent.changeText(screen.getByPlaceholderText('5'), '10');
  await submit();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(payload()).toMatchObject({
    overtimeEnabled: true,
    overtimePeriodCount: 2,
    overtimePeriodDurationMinutes: 10,
  });
});
test('três times recalculam vagas e goleiros e removem desempates de dois times', async () => {
  respond(endpoint, match());
  await renderApp(<CreateMatchScreen />);
  await toggle('Controlar os tempos do jogo');
  await toggle('Jogo terá disputa por pênaltis em caso de empate');
  await fireEvent.changeText(screen.getByLabelText('Quantos times serão formados?'), '3');
  expect(screen.getByLabelText('Quantidade mínima de jogadores')).toHaveDisplayValue('21');
  expect(screen.getByLabelText('Quantidade de goleiros necessários')).toHaveDisplayValue('3');
  await submit();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(payload()).toMatchObject({
    teamCount: 3,
    maxPlayers: 21,
    minimumPlayers: 21,
    requiredGoalkeepers: 3,
    overtimeEnabled: false,
    penaltyShootoutEnabled: false,
  });
});
test('adversário externo e modalidade recalculam capacidade de um lado', async () => {
  respond(endpoint, match());
  await renderApp(<CreateMatchScreen />);
  await userEvent.press(screen.getByRole('button', { name: 'Contra outro time' }));
  await userEvent.press(screen.getByRole('button', { name: /Futsal/ }));
  await submit();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(payload()).toMatchObject({
    matchType: 'VERSUS_EXTERNAL',
    modality: 'FUTSAL',
    maxPlayers: 5,
    minimumPlayers: 5,
    requiredGoalkeepers: 1,
  });
  expect(payload()).not.toHaveProperty('teamCount');
});
test.each([
  ['Quantidade de tempos do jogo', '0', 'A quantidade de tempos deve ficar entre 1 e 4.'],
  ['Quantidade de tempos do jogo', '5', 'A quantidade de tempos deve ficar entre 1 e 4.'],
  ['Minutos por tempo', '0', 'A duração de cada tempo deve ficar entre 1 e 180 minutos.'],
  ['Minutos por tempo', '181', 'A duração de cada tempo deve ficar entre 1 e 180 minutos.'],
])('valida %s com valor %s antes da API', async (label, value, error) => {
  await renderApp(<CreateMatchScreen />);
  await toggle('Controlar os tempos do jogo');
  await fireEvent.changeText(screen.getByLabelText(label), value);
  await submit();
  expect(screen.getByText(error)).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
});
test('prazo de inscrição igual ao início é recusado', async () => {
  await renderApp(<CreateMatchScreen />);
  await clock('Horário limite de inscrição', 20);
  await submit();
  expect(
    screen.getByText('O prazo de inscrição precisa terminar antes do início do jogo.'),
  ).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
});
test.each([11, 20])('pagamento fora da janela: %sh', async (hour) => {
  route.params = { ...route.params, paymentAmount: '25', pixKey: 'pix@onze.test' };
  await renderApp(<CreateMatchScreen />);
  await clock('Horário limite de pagamento', hour);
  await submit();
  expect(
    screen.getByText(
      hour === 11
        ? 'O prazo de pagamento não pode terminar antes do prazo de inscrição.'
        : 'O prazo de pagamento precisa terminar antes do início do jogo.',
    ),
  ).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
});
test('cobrança exige valor válido e PIX', async () => {
  await renderApp(<CreateMatchScreen />);
  await toggle('Cobrar pagamento dos jogadores');
  await submit();
  expect(screen.getByText('Informe um valor por jogador válido, como 25,00.')).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByPlaceholderText('25,00'), '25,00');
  await submit();
  expect(screen.getByText('Informe a chave PIX para o pagamento.')).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
});
test('local obrigatório e mínimo incompatível são recusados sem enviar', async () => {
  route.params.venue = '';
  await renderApp(<CreateMatchScreen />);
  await submit();
  expect(screen.getByText('Informe o local do jogo.')).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByPlaceholderText('Ex.: Arena dos Amigos'), 'Arena Teste');
  await fireEvent.changeText(screen.getByLabelText('Quantidade mínima de jogadores'), '15');
  await submit();
  expect(
    screen.getByText('A quantidade mínima não pode ultrapassar a quantidade máxima de jogadores.'),
  ).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
});
test('falha do servidor preserva formulário para nova tentativa', async () => {
  respond(endpoint, { message: 'Agenda indisponível.' }, 503);
  respond(endpoint, match());
  await renderApp(<CreateMatchScreen />);
  await submit();
  expect(await screen.findByText('Agenda indisponível.')).toBeOnTheScreen();
  expect(screen.getByPlaceholderText('Ex.: Arena dos Amigos')).toHaveDisplayValue('Arena Teste');
  await submit();
  await waitFor(() => expect(navigation.replace).toHaveBeenCalled());
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
test('envio pendente bloqueia solicitação duplicada', async () => {
  const response = deferred<unknown>();
  pendingResponse(endpoint, response.promise);
  await renderApp(<CreateMatchScreen />);
  await submit();
  expect(screen.getByRole('button', { name: 'Marcando jogo...' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Marcando jogo...' }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(() => response.resolve(match()));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalled());
});
test('sem sessão retorna ao login sem criar partida', async () => {
  await clearSession();
  await renderApp(<CreateMatchScreen />);
  await submit();
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/'));
  expect(fetchMock).not.toHaveBeenCalled();
});
