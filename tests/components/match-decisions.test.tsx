import React from 'react';
import { MinimumPlayerDecisionCard } from '../../src/components/minimum-player-decision-card';
import { MatchWaitlistCard } from '../../src/components/match-waitlist-card';
import { saveSession, getAccessToken } from '../../src/lib/auth-storage';
import { renderApp, screen, userEvent, waitFor, act } from '../support/render';
import { match, attendance, user } from '../support/fixtures';
import { respond, fetchMock, deferred, pendingResponse } from '../support/network';
import { navigation } from '../support/router';
const minimumPath = '/api/matches/match-1/minimum-player-decision';
const minimumStatus = {
  matchId: 'match-1',
  confirmedPlayers: 4,
  minimumPlayers: 6,
  signupDeadline: '2026-11-02T17:00:00Z',
  paymentDeadline: null,
  decisionRequired: true,
  belowMinimumApproved: false,
};
const belowMinimum = () => match({ canManage: true, missingMinimumPlayers: 2, goingCount: 4 });
beforeEach(async () => {
  await saveSession('access', user);
});
test('membro sem gestão não consulta nem recebe decisão sobre o mínimo', async () => {
  await renderApp(
    <MinimumPlayerDecisionCard
      match={match({ missingMinimumPlayers: 2 })}
      onCancelMatch={jest.fn()}
    />,
  );
  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.queryByText('Número mínimo não atingido')).toBeNull();
});
test('gestor pode estender prazo ou solicitar cancelamento sem aprovar o jogo', async () => {
  respond(minimumPath, minimumStatus, 200, 'GET');
  const cancel = jest.fn();
  await renderApp(<MinimumPlayerDecisionCard match={belowMinimum()} onCancelMatch={cancel} />);
  await userEvent.press(await screen.findByRole('button', { name: 'Estender prazo de inscrição' }));
  expect(navigation.push).toHaveBeenCalledWith({
    pathname: '/extend-match-signup',
    params: { matchId: 'match-1' },
  });
  await userEvent.press(screen.getByRole('button', { name: 'Cancelar jogo' }));
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test('manter abaixo do mínimo exige confirmação e bloqueia novo envio', async () => {
  respond(minimumPath, minimumStatus, 200, 'GET');
  const response = deferred<unknown>();
  pendingResponse(`${minimumPath}/approve`, response.promise, 'PUT');
  await renderApp(<MinimumPlayerDecisionCard match={belowMinimum()} onCancelMatch={jest.fn()} />);
  await userEvent.press(await screen.findByRole('button', { name: 'Manter mesmo assim' }));
  expect(screen.getByText('Manter abaixo do mínimo?')).toBeOnTheScreen();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await userEvent.press(screen.getByRole('button', { name: 'Manter jogo' }));
  expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Salvando...' }));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(() =>
    response.resolve({ ...minimumStatus, belowMinimumApproved: true, decisionRequired: false }),
  );
  expect(await screen.findByText('Jogo mantido abaixo do mínimo')).toBeOnTheScreen();
});
test('falha na consulta do mínimo é visível e não libera decisões sem estado válido', async () => {
  respond(minimumPath, { message: 'Serviço indisponível.' }, 503, 'GET');
  await renderApp(<MinimumPlayerDecisionCard match={belowMinimum()} onCancelMatch={jest.fn()} />);
  expect(await screen.findByText('Serviço indisponível.')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Manter mesmo assim' })).toBeNull();
});
const waitlistProps = () => ({
  match: match({
    canManagePlayers: true,
    reservedGoalkeeperSlots: 1,
    goalkeeperDecisionRequired: true,
    attendances: [
      attendance({
        status: 'WAITLISTED',
        waitlistPosition: 2,
        userId: 'user-2',
        displayName: 'Bruno',
      }),
      attendance({ status: 'WAITLISTED', waitlistPosition: 1, currentUser: true }),
    ],
  }),
  onUpdated: jest.fn(),
  onRefresh: jest.fn(),
  onAddRental: jest.fn(),
  onInviteGoalkeeper: jest.fn(),
});
test('reserva no gol respeita primeiro da fila e só envia após confirmar', async () => {
  const props = waitlistProps();
  const updated = match();
  respond('/api/matches/match-1/waitlist/goalkeeper', updated);
  await renderApp(<MatchWaitlistCard {...props} />);
  expect(screen.getByText('Ana Silva (você)')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Usar primeiro reserva no gol' }));
  expect(screen.getByText(/Ana Silva sairá da fila/)).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('button', { name: 'Confirmar' }));
  await waitFor(() => expect(props.onUpdated).toHaveBeenCalledWith(updated));
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
    expectedFirstUserId: 'user-1',
  });
});
test('aluguel e convite usam ações distintas e lotação bloqueia as três alternativas', async () => {
  const props = waitlistProps();
  const ui = await renderApp(<MatchWaitlistCard {...props} />);
  await userEvent.press(screen.getByRole('button', { name: 'Adicionar goleiro de aluguel' }));
  expect(props.onAddRental).toHaveBeenCalledTimes(1);
  await userEvent.press(screen.getByRole('button', { name: 'Convidar goleiro' }));
  expect(props.onInviteGoalkeeper).toHaveBeenCalledTimes(1);
  await ui.rerender(<MatchWaitlistCard {...props} match={{ ...props.match, goingCount: 14 }} />);
  for (const name of [
    'Adicionar goleiro de aluguel',
    'Convidar goleiro',
    'Usar primeiro reserva no gol',
  ])
    expect(screen.getByRole('button', { name })).toBeDisabled();
});
test('mudança da fila durante decisão mostra conflito e solicita atualização', async () => {
  const props = waitlistProps();
  respond(
    '/api/matches/match-1/waitlist/goalkeeper',
    { message: 'A fila mudou. Atualize o jogo.' },
    409,
  );
  await renderApp(<MatchWaitlistCard {...props} />);
  await userEvent.press(screen.getByRole('button', { name: 'Usar primeiro reserva no gol' }));
  await userEvent.press(screen.getByRole('button', { name: 'Confirmar' }));
  expect(await screen.findByText('A fila mudou. Atualize o jogo.')).toBeOnTheScreen();
  expect(props.onRefresh).toHaveBeenCalledTimes(1);
  expect(props.onUpdated).not.toHaveBeenCalled();
});
test('sessão expirada na decisão remove acesso e retorna ao login', async () => {
  const props = waitlistProps();
  respond('/api/matches/match-1/waitlist/goalkeeper', {}, 401);
  await renderApp(<MatchWaitlistCard {...props} />);
  await userEvent.press(screen.getByRole('button', { name: 'Usar primeiro reserva no gol' }));
  await userEvent.press(screen.getByRole('button', { name: 'Confirmar' }));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/'));
  expect(await getAccessToken()).toBeNull();
});
test('participante vê posição e regra de pagamento sem controles administrativos', async () => {
  const props = waitlistProps();
  await renderApp(
    <MatchWaitlistCard
      {...props}
      match={{
        ...props.match,
        canManagePlayers: false,
        myAttendance: 'WAITLISTED',
        myWaitlistPosition: 1,
      }}
    />,
  );
  expect(screen.getByText(/Você é o 1º da fila/)).toBeOnTheScreen();
  expect(screen.queryByRole('button')).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
