import '../support/screen-boundaries';
import React from 'react';
import MatchTeamsScreen from '../../app/match-teams';
import { saveSession, clearSession } from '../../src/lib/auth-storage';
import { renderApp, screen, userEvent, waitFor } from '../support/render';
import { route, navigation } from '../support/router';
import { user, teams, team, secondTeam, assignment } from '../support/fixtures';
import { respond, fetchMock } from '../support/network';
const base = '/api/matches/match-1/teams';
beforeEach(async () => {
  await saveSession('access', user);
  route.params = { matchId: 'match-1' };
});
function load(data = teams(), reserves: string[] = []) {
  respond(base, data, 200, 'GET');
  respond(`${base}/reserves`, { matchId: 'match-1', reserveAssignmentIds: reserves }, 200, 'GET');
}
async function openEdit(index = 0) {
  await userEvent.press((await screen.findAllByRole('button', { name: 'Editar' }))[index]);
}
const manager = () => teams({ canManageTeams: true });
test('membro vê jogadores e formação sem controles de alteração nem notas privadas', async () => {
  load();
  await renderApp(<MatchTeamsScreen />);
  expect((await screen.findAllByText('Ana Silva')).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Gerar novamente' })).toBeNull();
  expect(screen.queryByText(/Overall usado:/)).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
test('time ainda não formado mostra estado vazio e ação de gestão', async () => {
  load(teams({ canManageTeams: true, teams: [] }));
  await renderApp(<MatchTeamsScreen />);
  expect(await screen.findByText('Times ainda não formados')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Formar times automaticamente' })).toBeOnTheScreen();
});
test('gerar times também distribui reservas automaticamente', async () => {
  load(teams({ canManageTeams: true, teams: [] }));
  respond(`${base}/generate`, manager());
  respond(`${base}/reserves/auto`, { matchId: 'match-1', reserveAssignmentIds: ['assignment-1'] });
  await renderApp(<MatchTeamsScreen />);
  await userEvent.press(
    await screen.findByRole('button', { name: 'Formar times automaticamente' }),
  );
  expect(await screen.findByRole('button', { name: 'Gerar novamente' })).toBeOnTheScreen();
  expect(screen.getAllByText('RESERVA').length).toBeGreaterThan(0);
  expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
    base,
    `${base}/reserves`,
    `${base}/generate`,
    `${base}/reserves/auto`,
  ]);
});
test('mínimo não atingido explica rejeição e permite nova tentativa', async () => {
  load(teams({ canManageTeams: true, teams: [], confirmedPlayers: 1, minimumPlayers: 6 }));
  respond(
    `${base}/generate`,
    { code: 'MINIMUM_PLAYERS_NOT_REACHED', message: 'Faltam jogadores para formar os times.' },
    409,
  );
  await renderApp(<MatchTeamsScreen />);
  expect(await screen.findByText('Jogo abaixo do mínimo')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Formar times automaticamente' }));
  expect(await screen.findByText('Faltam jogadores para formar os times.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Formar times automaticamente' })).toBeEnabled();
});
test('mover jogador envia time seguinte e mantém posição', async () => {
  load(manager());
  respond(`${base}/assignments/assignment-1`, manager(), 200, 'PUT');
  await renderApp(<MatchTeamsScreen />);
  await openEdit();
  await userEvent.press(screen.getByRole('button', { name: 'Próximo time' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({
    teamNumber: 2,
    assignedRole: 'MIDFIELDER',
  });
});
test('último time move jogador de volta ao primeiro', async () => {
  load(manager());
  respond(`${base}/assignments/assignment-2`, manager(), 200, 'PUT');
  await renderApp(<MatchTeamsScreen />);
  await openEdit(1);
  await userEvent.press(screen.getByRole('button', { name: 'Próximo time' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({
    teamNumber: 1,
    assignedRole: 'MIDFIELDER',
  });
});
test('trocar posição persiste a função; selecionar a mesma não envia', async () => {
  load(manager());
  respond(`${base}/assignments/assignment-1`, manager(), 200, 'PUT');
  await renderApp(<MatchTeamsScreen />);
  await openEdit();
  await userEvent.press(screen.getByRole('button', { name: 'Meio-campo' }));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await userEvent.press(screen.getByRole('button', { name: 'Goleiro' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({
    teamNumber: 1,
    assignedRole: 'GOALKEEPER',
  });
});
test('jogador em campo pode ser enviado para a reserva', async () => {
  load(manager());
  respond(
    `${base}/reserves`,
    { matchId: 'match-1', reserveAssignmentIds: ['assignment-1'] },
    200,
    'PUT',
  );
  await renderApp(<MatchTeamsScreen />);
  await openEdit();
  await userEvent.press(screen.getByRole('button', { name: 'Mandar para reserva' }));
  expect(await screen.findByRole('button', { name: 'Colocar em campo' })).toBeOnTheScreen();
  expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({
    reserveAssignmentIds: ['assignment-1'],
  });
});
test('reserva é promovido quando há espaço no campo', async () => {
  load(manager(), ['assignment-1']);
  respond(`${base}/reserves`, { matchId: 'match-1', reserveAssignmentIds: [] }, 200, 'PUT');
  await renderApp(<MatchTeamsScreen />);
  await openEdit();
  await userEvent.press(screen.getByRole('button', { name: 'Colocar em campo' }));
  expect(await screen.findByRole('button', { name: 'Mandar para reserva' })).toBeOnTheScreen();
  expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({
    reserveAssignmentIds: [],
  });
});
test('dois goleiros não podem ficar simultaneamente em campo', async () => {
  const keeper = assignment({ assignedRole: 'GOALKEEPER' });
  load(
    teams({
      canManageTeams: true,
      teams: [
        team({
          assignments: [
            keeper,
            assignment({ id: 'keeper-2', assignedRole: 'GOALKEEPER', displayName: 'Carlos' }),
          ],
        }),
        secondTeam(),
      ],
    }),
    ['keeper-2'],
  );
  await renderApp(<MatchTeamsScreen />);
  await openEdit(1);
  await userEvent.press(screen.getByRole('button', { name: 'Colocar em campo' }));
  expect(
    screen.getByText(
      'Cada time pode ter apenas um goleiro em campo. Coloque o outro goleiro na reserva antes.',
    ),
  ).toBeOnTheScreen();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
test('campo de futsal cheio impede promover sexto jogador', async () => {
  const assignments = Array.from({ length: 6 }, (_, i) =>
    assignment({
      id: `player-${i}`,
      participantId: `user-${i}`,
      displayName: `Jogador ${i}`,
      assignedRole: 'PIVOT',
    }),
  );
  load(teams({ canManageTeams: true, modality: 'FUTSAL', teams: [team({ assignments })] }), [
    'player-5',
  ]);
  await renderApp(<MatchTeamsScreen />);
  await openEdit(5);
  await userEvent.press(screen.getByRole('button', { name: 'Colocar em campo' }));
  expect(
    screen.getByText(
      'O campo já está completo. Coloque outro jogador deste time na reserva antes de promover este jogador.',
    ),
  ).toBeOnTheScreen();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
test('detalhes técnicos autorizados mostram origem e avaliação', async () => {
  load(teams({ technicalDetailsVisible: true }));
  await renderApp(<MatchTeamsScreen />);
  expect((await screen.findAllByText(/Overall usado: 70\/50/)).length).toBeGreaterThan(0);
});
test('falha ao mover conserva edição e informa o problema', async () => {
  load(manager());
  respond(
    `${base}/assignments/assignment-1`,
    { message: 'Não foi possível mover agora.' },
    503,
    'PUT',
  );
  await renderApp(<MatchTeamsScreen />);
  await openEdit();
  await userEvent.press(screen.getByRole('button', { name: 'Próximo time' }));
  expect(await screen.findByText('Não foi possível mover agora.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Próximo time' })).toBeEnabled();
});
test('ausência de sessão não consulta times', async () => {
  await clearSession();
  await renderApp(<MatchTeamsScreen />);
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/'));
  expect(fetchMock).not.toHaveBeenCalled();
});
test('identificador ausente mostra erro sem consultar API', async () => {
  route.params = {};
  await renderApp(<MatchTeamsScreen />);
  expect(await screen.findByText('Não foi possível identificar o jogo.')).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
});
