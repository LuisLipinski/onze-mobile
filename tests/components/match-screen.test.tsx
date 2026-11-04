import '../support/screen-boundaries';
import React from 'react';
import { Share } from 'react-native';
import MatchScreen from '../../app/match';
import { saveSession, clearSession, getAccessToken } from '../../src/lib/auth-storage';
import { renderApp, screen, userEvent, waitFor, act } from '../support/render';
import { user, match, attendance, sportsProfile, member } from '../support/fixtures';
import type { FootballMatch, PaymentStatus } from '../../src/lib/api';
import { respond, fetchMock, deferred, pendingResponse } from '../support/network';
import { route, navigation } from '../support/router';
const base = '/api/matches/match-1';
beforeEach(async () => {
  await saveSession('access', user);
  route.params = { matchId: 'match-1' };
});
function load(data = match(), complete = true) {
  respond(base, data, 200, 'GET');
  respond('/api/groups/group-1/members/me/sports-profile', sportsProfile({ complete }), 200, 'GET');
}
async function ready() {
  await screen.findByRole('button', { name: 'Compartilhar jogo' });
}
function paidMatch(status: PaymentStatus = 'PENDING', overrides: Partial<FootballMatch> = {}) {
  return match({
    paymentRequired: true,
    paymentAmount: 25,
    pixKey: 'pix@onze.test',
    paymentDeadline: '2026-11-05T18:00:00Z',
    paymentOpen: true,
    canReportPayment: true,
    myAttendance: 'GOING',
    myPaymentStatus: status,
    attendances: [attendance({ currentUser: true, paymentStatus: status })],
    ...overrides,
  });
}
test('perfil incompleto abre cadastro esportivo preservando o destino do jogo', async () => {
  route.params.sharePrompt = '1';
  load(match(), false);
  await renderApp(<MatchScreen />);
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledWith({
      pathname: '/sports-profile',
      params: {
        groupId: 'group-1',
        groupName: 'Time da Vila',
        required: 'true',
        matchId: 'match-1',
        sharePrompt: '1',
      },
    }),
  );
  expect(screen.queryByRole('button', { name: 'Compartilhar jogo' })).toBeNull();
});
test('confirmação de presença usa resposta autoritativa e bloqueia reenvio pendente', async () => {
  load();
  const reply = deferred<unknown>();
  pendingResponse(`${base}/attendance`, reply.promise, 'PUT');
  await renderApp(<MatchScreen />);
  await ready();
  await userEvent.press(screen.getByRole('button', { name: /Vou jogar/ }));
  expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Salvando...' }));
  expect(fetchMock).toHaveBeenCalledTimes(3);
  await act(() =>
    reply.resolve(
      match({
        myAttendance: 'GOING',
        goingCount: 9,
        canJoin: false,
        canWithdraw: true,
        attendances: [attendance({ currentUser: true })],
      }),
    ),
  );
  await waitFor(() => expect(screen.getByRole('button', { name: /Vou jogar/ })).toBeDisabled());
  expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({ status: 'GOING' });
});
test('jogo cheio entra na lista de espera conforme resposta da API', async () => {
  load(match({ willJoinWaitlist: true, goingCount: 14 }));
  respond(
    `${base}/attendance`,
    match({
      myAttendance: 'WAITLISTED',
      myWaitlistPosition: 1,
      waitlistCount: 1,
      canWithdraw: true,
      attendances: [attendance({ status: 'WAITLISTED', currentUser: true, waitlistPosition: 1 })],
    }),
    200,
    'PUT',
  );
  await renderApp(<MatchScreen />);
  await ready();
  await userEvent.press(screen.getByRole('button', { name: /Entrar na.*espera/i }));
  expect(await screen.findByText(/Você é o 1º da fila/)).toBeOnTheScreen();
});
test('sair da fila exige confirmação antes de perder a posição', async () => {
  load(
    match({
      myAttendance: 'WAITLISTED',
      myWaitlistPosition: 1,
      canWithdraw: true,
      attendances: [attendance({ status: 'WAITLISTED', waitlistPosition: 1 })],
    }),
  );
  respond(`${base}/attendance`, match({ myAttendance: 'NOT_GOING' }), 200, 'PUT');
  await renderApp(<MatchScreen />);
  await ready();
  await userEvent.press(screen.getByRole('button', { name: 'Sair da fila' }));
  expect(screen.getByText('Sair da lista de espera?')).toBeOnTheScreen();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await userEvent.press(screen.getAllByRole('button', { name: 'Sair da fila' }).at(-1)!);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({ status: 'NOT_GOING' });
});
test('desistência com pagamento confirmado pede confirmação e conserva regra de acerto', async () => {
  load(paidMatch('PAID', { canWithdraw: true }));
  respond(
    `${base}/attendance`,
    paidMatch('PAID', { myAttendance: 'NOT_GOING', myPaymentSettlementStatus: 'PENDING' }),
    200,
    'PUT',
  );
  await renderApp(<MatchScreen />);
  await ready();
  await userEvent.press(screen.getByRole('button', { name: 'Não vou' }));
  expect(screen.getByText('Confirmar que não vai?')).toBeOnTheScreen();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await userEvent.press(screen.getByRole('button', { name: 'Liberar minha vaga' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
});
test('presença fechada desabilita as duas respostas', async () => {
  load(match({ attendanceOpen: false, signupOpen: false }));
  await renderApp(<MatchScreen />);
  await ready();
  expect(screen.getByText('Presença ainda fechada')).toBeOnTheScreen();
  for (const name of [/Vou jogar/, /^Não vou$/])
    expect(screen.getByRole('button', { name })).toBeDisabled();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
test('falha ao confirmar presença deixa ação disponível para tentar novamente', async () => {
  load();
  respond(`${base}/attendance`, { message: 'A lista mudou. Tente novamente.' }, 409, 'PUT');
  await renderApp(<MatchScreen />);
  await ready();
  await userEvent.press(screen.getByRole('button', { name: /Vou jogar/ }));
  expect(await screen.findByText('A lista mudou. Tente novamente.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /Vou jogar/ })).toBeEnabled();
});
test('jogador informa pagamento e aguarda validação administrativa', async () => {
  load(paidMatch());
  respond(`${base}/payment/reported`, paidMatch('REPORTED'), 200, 'PUT');
  await renderApp(<MatchScreen />);
  await userEvent.press(await screen.findByRole('button', { name: 'Já paguei' }));
  expect(
    await screen.findByText(
      'Pagamento informado. Agora o administrador precisa validar o recebimento.',
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Confirmar recebimento' })).toBeNull();
});
test('membro comum não recebe ações financeiras de outros jogadores', async () => {
  load(
    paidMatch('PENDING', {
      attendances: [
        attendance({ currentUser: true, paymentStatus: 'PENDING' }),
        attendance({ userId: 'user-2', displayName: 'Bruno', paymentStatus: 'REPORTED' }),
      ],
    }),
  );
  await renderApp(<MatchScreen />);
  await ready();
  for (const name of ['Confirmar recebimento', 'Não foi pago', 'Cobrar jogador', 'Resolver acerto'])
    expect(screen.queryByRole('button', { name })).toBeNull();
});
test('administrador confirma recebimento do jogador informado', async () => {
  load(paidMatch('REPORTED', { canManagePayments: true }));
  respond(
    `${base}/payments/user-1/confirm`,
    paidMatch('PAID', { canManagePayments: true }),
    200,
    'PUT',
  );
  await renderApp(<MatchScreen />);
  await userEvent.press(await screen.findByRole('button', { name: 'Confirmar recebimento' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Confirmar recebimento' })).toBeNull(),
  );
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
test('recusa exige confirmação e devolve cobrança a pendente', async () => {
  load(paidMatch('REPORTED', { canManagePayments: true }));
  respond(
    `${base}/payments/user-1/reject`,
    paidMatch('PENDING', { canManagePayments: true }),
    200,
    'PUT',
  );
  await renderApp(<MatchScreen />);
  await userEvent.press(await screen.findByRole('button', { name: 'Não foi pago' }));
  expect(screen.getByText('Pagamento não recebido?')).toBeOnTheScreen();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await userEvent.press(screen.getByRole('button', { name: 'Marcar como pendente' }));
  expect(
    await screen.findByText(
      'Pagamento marcado como não recebido. A cobrança voltou para Pendente.',
    ),
  ).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Cobrar jogador' })).toBeOnTheScreen();
});
test('cobrança administrativa solicita aviso sem confirmar pagamento', async () => {
  load(paidMatch('PENDING', { canManagePayments: true }));
  respond(`${base}/payments/user-1/reminder`, paidMatch('PENDING', { canManagePayments: true }));
  await renderApp(<MatchScreen />);
  await userEvent.press(await screen.findByRole('button', { name: 'Cobrar jogador' }));
  expect(
    await screen.findByText(/Cobrança solicitada. O jogador receberá uma notificação/),
  ).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Confirmar recebimento' })).toBeNull();
});
test.each(['occurrence', 'series'] as const)(
  'cancelamento semanal preserva escopo escolhido: %s',
  async (scope) => {
    const data = match({
      canCancel: true,
      recurrence: 'WEEKLY',
      seriesId: 'series-1',
      seriesActive: true,
    });
    load(data);
    respond(scope === 'series' ? '/api/match-series/series-1' : base, undefined, 204, 'DELETE');
    respond(base, { ...data, status: 'CANCELLED' }, 200, 'GET');
    await renderApp(<MatchScreen />);
    await ready();
    await userEvent.press(
      screen.getByRole('button', {
        name: scope === 'series' ? 'Encerrar jogos semanais' : 'Cancelar somente este jogo',
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await userEvent.press(
      screen.getByRole('button', {
        name: scope === 'series' ? 'Encerrar sequência' : 'Cancelar jogo',
      }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock.mock.calls[2][1]?.method).toBe('DELETE');
  },
);
test('cancelamento sem permissão não aparece para membro', async () => {
  load();
  await renderApp(<MatchScreen />);
  await ready();
  expect(screen.queryByRole('button', { name: 'Cancelar jogo' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Encerrar jogos semanais' })).toBeNull();
});
test('compartilhamento utiliza URL devolvida pelo servidor e recurso nativo', async () => {
  load();
  respond(`${base}/share`, { shareUrl: 'https://onze.test/matches/match-1' }, 200, 'GET');
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  await renderApp(<MatchScreen />);
  await userEvent.press(await screen.findByRole('button', { name: 'Compartilhar jogo' }));
  await waitFor(() =>
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('https://onze.test/matches/match-1'),
      }),
    ),
  );
});
test('sem sessão preserva o destino ao pedir login', async () => {
  await clearSession();
  await renderApp(<MatchScreen />);
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledWith({
      pathname: '/',
      params: { matchId: 'match-1' },
    }),
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
test('401 limpa sessão e mantém link da partida no login', async () => {
  respond(base, {}, 401, 'GET');
  await renderApp(<MatchScreen />);
  await waitFor(() => expect(navigation.replace).toHaveBeenCalled());
  expect(await getAccessToken()).toBeNull();
});
test('início consulta identidades, confirma nomes e abre acompanhamento', async () => {
  load(match({ canManageLive: true }));
  respond(
    `${base}/teams/images`,
    [
      { teamNumber: 1, name: 'Preto', imageUrl: null },
      { teamNumber: 2, name: 'Branco', imageUrl: null },
    ],
    200,
    'GET',
  );
  respond(`${base}/live/start`, match({ status: 'IN_PROGRESS' }), 200, 'PUT');
  await renderApp(<MatchScreen />);
  await userEvent.press(await screen.findByRole('button', { name: 'Iniciar jogo' }));
  await screen.findByLabelText('Nome do time 1');
  expect(fetchMock).toHaveBeenCalledTimes(3);
  await userEvent.press(screen.getAllByRole('button', { name: 'Iniciar jogo' }).at(-1)!);
  await waitFor(() =>
    expect(navigation.push).toHaveBeenCalledWith({
      pathname: '/live-match',
      params: { matchId: 'match-1' },
    }),
  );
  expect(JSON.parse(String(fetchMock.mock.calls[3][1]?.body))).toEqual({
    teams: [
      { teamNumber: 1, name: 'Preto' },
      { teamNumber: 2, name: 'Branco' },
    ],
  });
});
test('erro ao iniciar mantém modal para corrigir e tentar novamente', async () => {
  load(match({ canManageLive: true }));
  respond(
    `${base}/teams/images`,
    [
      { teamNumber: 1, name: 'Preto', imageUrl: null },
      { teamNumber: 2, name: 'Branco', imageUrl: null },
    ],
    200,
    'GET',
  );
  respond(`${base}/live/start`, { message: 'Ainda faltam goleiros.' }, 409, 'PUT');
  await renderApp(<MatchScreen />);
  await userEvent.press(await screen.findByRole('button', { name: 'Iniciar jogo' }));
  await screen.findByLabelText('Nome do time 1');
  await userEvent.press(screen.getAllByRole('button', { name: 'Iniciar jogo' }).at(-1)!);
  expect(await screen.findByText('Ainda faltam goleiros.')).toBeOnTheScreen();
  expect(navigation.push).not.toHaveBeenCalled();
});
test('aluguel de goleiro envia nome normalizado e atualiza a lista', async () => {
  load(match({ canManagePlayers: true, missingGoalkeepers: 1 }));
  respond(
    `${base}/rental-goalkeepers`,
    match({
      rentalGoalkeepers: [
        { id: 'rental-1', displayName: 'Carlos', createdAt: '2026-11-02T18:00:00Z' },
      ],
    }),
  );
  await renderApp(<MatchScreen />);
  await userEvent.press(
    await screen.findByRole('button', { name: 'Adicionar goleiro de aluguel' }),
  );
  await userEvent.type(screen.getByPlaceholderText('Ex.: Carlos'), '  Carlos  ');
  await userEvent.press(screen.getByRole('button', { name: 'Adicionar' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({ displayName: 'Carlos' });
});
test('reposição filtra confirmados e envia o substituto escolhido', async () => {
  const departed = attendance({
    userId: 'departed',
    displayName: 'Jogador ausente',
    status: 'NOT_GOING',
    replacementRequiredAt: '2026-11-02T17:00:00Z',
  });
  load(
    match({
      canManagePlayers: true,
      attendances: [departed, attendance({ userId: 'confirmed', displayName: 'Já confirmado' })],
    }),
  );
  respond(
    '/api/groups/group-1/members',
    [
      member({ userId: 'confirmed', displayName: 'Já confirmado' }),
      member({ userId: 'replacement', displayName: 'Carlos' }),
    ],
    200,
    'GET',
  );
  respond(`${base}/replacements/departed`, match(), 200, 'PUT');
  await renderApp(<MatchScreen />);
  await userEvent.press(await screen.findByRole('button', { name: 'Adicionar reposição' }));
  expect(screen.queryByRole('button', { name: /Já confirmado/ })).toBeNull();
  await userEvent.press(await screen.findByRole('button', { name: /Carlos/ }));
  await userEvent.press(screen.getByRole('button', { name: 'Adicionar à lista' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  expect(JSON.parse(String(fetchMock.mock.calls[3][1]?.body))).toEqual({
    replacementUserId: 'replacement',
  });
});
test.each([
  ['Registrar crédito para próximo jogo', 'CREDITED'],
  ['Marcar como reembolsado', 'REFUNDED'],
] as const)('acerto individual persiste %s', async (label, resolution) => {
  const leaving = attendance({
    status: 'NOT_GOING',
    paymentStatus: 'PAID',
    paymentSettlementStatus: 'PENDING',
    settlementAvailable: true,
  });
  load(paidMatch('PAID', { canManagePayments: true, attendances: [leaving] }));
  respond(`${base}/payments/user-1/settlement`, match(), 200, 'PUT');
  await renderApp(<MatchScreen />);
  await userEvent.press(await screen.findByRole('button', { name: 'Resolver acerto' }));
  await userEvent.press(screen.getByRole('button', { name: label }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({ resolution });
});
test('cancelamento seleciona acertos em aberto e reembolsa apenas os selecionados', async () => {
  load(
    paidMatch('PAID', {
      status: 'CANCELLED',
      canManagePayments: true,
      attendances: [
        attendance({ paymentStatus: 'PAID', paymentSettlementStatus: 'PENDING' }),
        attendance({
          userId: 'already-paid',
          displayName: 'Bruno',
          paymentStatus: 'PAID',
          paymentSettlementStatus: 'REFUNDED',
        }),
      ],
    }),
  );
  respond(`${base}/payment-settlements`, match({ status: 'CANCELLED' }), 200, 'PUT');
  await renderApp(<MatchScreen />);
  await userEvent.press(await screen.findByRole('button', { name: 'Reembolsar selecionados' }));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await userEvent.press(screen.getByRole('button', { name: 'Confirmar reembolso' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({
    playerUserIds: ['user-1'],
    resolution: 'REFUNDED',
  });
});
