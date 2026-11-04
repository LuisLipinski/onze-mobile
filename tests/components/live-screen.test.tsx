import { ScreenEventSource, emitAppState } from '../support/screen-boundaries';
import React from 'react';
import LiveMatchScreen from '../../app/live-match';
import { saveSession, clearSession, getAccessToken } from '../../src/lib/auth-storage';
import { renderApp, screen, userEvent, fireEvent, waitFor, act } from '../support/render';
import { user, match, live, teams, goal, card, foul, period, shootout } from '../support/fixtures';
import type {
  FootballMatch,
  LiveMatchState,
  MatchTeams,
  LiveMatchStreamEvent,
} from '../../src/lib/api';
import { respond, fetchMock, pendingResponse, deferred } from '../support/network';
import { route, navigation } from '../support/router';
const base = '/api/matches/match-1';
beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-02T18:21:00Z'));
  await saveSession('access', user);
  route.params = { matchId: 'match-1' };
});
const managed = (overrides: Partial<LiveMatchState> = {}) =>
  live({ canManage: true, ...overrides });
function load(
  state = managed(),
  data: Partial<FootballMatch> = {},
  generated: MatchTeams = teams(),
) {
  respond(
    base,
    match({
      status: 'IN_PROGRESS',
      periodsEnabled: true,
      periodCount: 2,
      periodDurationMinutes: 20,
      ...data,
    }),
    200,
    'GET',
  );
  respond(`${base}/live`, state, 200, 'GET');
  if (data.matchType !== 'VERSUS_EXTERNAL') respond(`${base}/teams`, generated, 200, 'GET');
}
async function ready() {
  await screen.findByRole('tab', { name: 'Partida' });
}
const body = () => JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body));
function event(
  state: LiveMatchState,
  overrides: Partial<LiveMatchStreamEvent> = {},
): LiveMatchStreamEvent {
  const { canManage: _permission, ...snapshot } = state;
  return {
    type: 'SCORE_UPDATED',
    matchId: 'match-1',
    groupId: 'group-1',
    version: state.version,
    summary: null,
    liveMatch: snapshot,
    ...overrides,
  };
}
test('espectador acompanha o jogo sem receber ações de gestão', async () => {
  load(live());
  await renderApp(<LiveMatchScreen />);
  await ready();
  expect(screen.getByText('Você está acompanhando ao vivo')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Aumentar placar de Preto')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Resetar jogo' })).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
test('gol seleciona jogador e persiste autoria antes de atualizar a linha do tempo', async () => {
  load();
  respond(`${base}/live/goals`, {
    event: goal(),
    liveMatch: managed({
      goalEvents: [goal()],
      scores: [{ sideNumber: 1, score: 1, name: 'Preto', imageUrl: null }, live().scores[1]],
    }),
  });
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(screen.getByLabelText('Aumentar placar de Preto'));
  expect(screen.getByRole('button', { name: 'Salvar gol' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: /Ana Silva/ }));
  await userEvent.press(screen.getByRole('button', { name: 'Salvar gol' }));
  expect(await screen.findByText('Ana Silva')).toBeOnTheScreen();
  expect(body()).toEqual({
    scorerAssignmentId: 'assignment-1',
    assistAssignmentId: null,
    penalty: false,
    sideNumber: 1,
    ownGoal: false,
  });
});
test('gol sem times informa pré-requisito sem enviar registro', async () => {
  load(managed(), {}, teams({ teams: [] }));
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(screen.getByLabelText('Aumentar placar de Preto'));
  expect(
    screen.getByText('Gere os times e adicione os jogadores antes de registrar um gol.'),
  ).toBeOnTheScreen();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
test('falha ao salvar gol mantém seleção para tentar novamente', async () => {
  load();
  respond(`${base}/live/goals`, { message: 'Não foi possível salvar o gol.' }, 503);
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(screen.getByLabelText('Aumentar placar de Preto'));
  await userEvent.press(screen.getByRole('button', { name: /Ana Silva/ }));
  await userEvent.press(screen.getByRole('button', { name: 'Salvar gol' }));
  expect(await screen.findByText('Não foi possível salvar o gol.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Salvar gol' })).toBeEnabled();
});
test.each(['YELLOW', 'RED'] as const)(
  'cartão %s envia o jogador e tipo escolhidos',
  async (cardType) => {
    const value = card({ cardType });
    load();
    respond(`${base}/live/cards`, { event: value, liveMatch: managed({ cardEvents: [value] }) });
    await renderApp(<LiveMatchScreen />);
    await ready();
    await userEvent.press(
      screen.getByRole('button', {
        name: `Registrar cartão ${cardType === 'YELLOW' ? 'amarelo' : 'vermelho'} para Preto`,
      }),
    );
    await userEvent.press(screen.getByRole('button', { name: /Ana Silva/ }));
    await userEvent.press(screen.getByRole('button', { name: 'Salvar cartão' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(body()).toEqual({ playerAssignmentId: 'assignment-1', cardType });
  },
);
test('chute no gol exige jogador e envia a estatística correta', async () => {
  load();
  respond(`${base}/live/team-statistics`, managed());
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(screen.getByRole('button', { name: 'Registrar chute no gol para Preto' }));
  await userEvent.press(screen.getByRole('button', { name: /Ana Silva/ }));
  await userEvent.press(screen.getByRole('button', { name: 'Salvar chute' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  expect(body()).toEqual({
    sideNumber: 1,
    type: 'SHOTS_ON_TARGET',
    delta: 1,
    playerAssignmentId: 'assignment-1',
  });
});
test('escanteio envia incremento sem exigir autoria', async () => {
  load();
  respond(`${base}/live/team-statistics`, managed());
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(screen.getByRole('button', { name: 'Registrar escanteio para Branco' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  expect(body()).toEqual({ sideNumber: 2, type: 'CORNERS', delta: 1 });
});
test('falta mantém quem sofreu no lado do botão e quem cometeu no adversário', async () => {
  load();
  respond(`${base}/live/fouls`, managed({ foulEvents: [foul()] }));
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(screen.getByRole('button', { name: 'Registrar falta sofrida por Preto' }));
  await userEvent.press(screen.getByRole('button', { name: 'Ana Silva' }));
  await userEvent.press(screen.getByRole('button', { name: 'Bruno' }));
  await userEvent.press(screen.getByRole('button', { name: 'Registrar' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  expect(body()).toEqual({
    offenderAssignmentId: 'assignment-2',
    victimAssignmentId: 'assignment-1',
    penalty: false,
  });
  expect(screen.queryByText('Bruno em Ana Silva')).toBeNull();
  await userEvent.press(screen.getByRole('tab', { name: 'Detalhes do jogo' }));
  expect(screen.getByText('Bruno em Ana Silva')).toBeOnTheScreen();
});
test('pênalti marcado e cobrança perdida usam registros distintos e falso explícito', async () => {
  const awarded = foul({ penalty: true });
  load();
  respond(`${base}/live/fouls`, managed({ foulEvents: [awarded] }));
  respond(
    `${base}/live/fouls/foul-1/resolve`,
    managed({
      foulEvents: [
        {
          ...awarded,
          scored: false,
          takerAssignmentId: 'assignment-1',
          takerDisplayName: 'Ana Silva',
          resolvedAt: '2026-11-02T18:21:00Z',
        },
      ],
    }),
  );
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(
    screen.getByRole('button', { name: 'Registrar pênalti sofrido por Preto' }),
  );
  await userEvent.press(screen.getByRole('button', { name: 'Ana Silva' }));
  await userEvent.press(screen.getByRole('button', { name: 'Bruno' }));
  await userEvent.press(screen.getByRole('button', { name: 'Registrar' }));
  await userEvent.press(await screen.findByRole('button', { name: 'Ana Silva' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  await userEvent.press(screen.getByRole('button', { name: 'Não, perdeu' }));
  await userEvent.press(screen.getByRole('button', { name: 'Salvar resultado' }));
  expect(await screen.findByText('🥅 PÊNALTI PERDIDO')).toBeOnTheScreen();
  expect(screen.getByText('🥅 PÊNALTI MARCADO')).toBeOnTheScreen();
  expect(body()).toEqual({ takerAssignmentId: 'assignment-1', scored: false });
}, 20000);
test.each(['GOAL', 'CARD', 'FOUL'] as const)(
  'remover evento %s exige confirmação e endpoint correspondente',
  async (kind) => {
    load(
      managed({
        goalEvents: kind === 'GOAL' ? [goal()] : [],
        cardEvents: kind === 'CARD' ? [card()] : [],
        foulEvents: kind === 'FOUL' ? [foul({ penalty: true })] : [],
      }),
    );
    const path =
      kind === 'GOAL' ? 'goals/goal-1' : kind === 'CARD' ? 'cards/card-1' : 'fouls/foul-1';
    respond(`${base}/live/${path}`, managed(), 200, 'DELETE');
    await renderApp(<LiveMatchScreen />);
    await ready();
    await userEvent.press(screen.getByRole('button', { name: 'Remover evento da linha do tempo' }));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await userEvent.press(screen.getByRole('button', { name: 'Remover' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock.mock.calls[3][1]?.method).toBe('DELETE');
  },
);
test('aba de detalhes permite corrigir um escanteio sem duplicar o incremento', async () => {
  load(
    managed({
      teamStatistics: [
        { sideNumber: 1, shots: 0, shotsOnTarget: 0, goalShots: 0, corners: 1, fouls: 0 },
      ],
    }),
  );
  respond(`${base}/live/team-statistics`, managed());
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(screen.getByRole('tab', { name: 'Detalhes do jogo' }));
  await userEvent.press(
    screen.getByRole('button', { name: 'Remover um registro de escanteios do time 1' }),
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  expect(body()).toEqual({ sideNumber: 1, type: 'CORNERS', delta: -1 });
});
test('encerrar primeiro tempo e iniciar o seguinte usa as respostas da API', async () => {
  const ended = period({ endedAt: '2026-11-02T18:21:00Z' });
  load();
  respond(`${base}/live/period/finish`, managed({ periods: [ended] }), 200, 'PUT');
  respond(
    `${base}/live/period/start-next`,
    managed({
      periods: [
        ended,
        period({ id: 'period-2', periodNumber: 2, startedAt: '2026-11-02T18:21:00Z' }),
      ],
    }),
    200,
    'PUT',
  );
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(screen.getByRole('button', { name: /Encerrar 1/ }));
  await userEvent.press(await screen.findByRole('button', { name: /Iniciar 2/ }));
  expect(await screen.findByText('2º tempo em andamento.')).toBeOnTheScreen();
  expect(fetchMock).toHaveBeenCalledTimes(5);
});
test.each([true, false])(
  'disputa envia cobrança %s fora da estatística de gols',
  async (scored) => {
    const state = managed({
      phase: 'PENALTY_SHOOTOUT',
      penaltyShootout: shootout({ status: 'IN_PROGRESS', nextTeamNumber: 1, nextRoundNumber: 1 }),
    });
    load(state);
    respond(`${base}/live/penalties/attempts`, state);
    await renderApp(<LiveMatchScreen />);
    await ready();
    await userEvent.press(screen.getByRole('button', { name: scored ? 'Gol' : 'Perdeu' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(body()).toEqual({ scored });
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/live/goals'))).toBe(false);
  },
);
test('vencedor da disputa exige OK para encerrar o jogo', async () => {
  load(
    managed({
      phase: 'PENALTY_SHOOTOUT',
      penaltyShootout: shootout({
        status: 'AWAITING_CONFIRMATION',
        winnerTeamNumber: 1,
        teamOneScore: 4,
        teamTwoScore: 3,
      }),
    }),
  );
  respond(
    `${base}/live/penalties/confirm-winner`,
    managed({
      status: 'FINISHED',
      phase: 'FINISHED',
      penaltyShootout: shootout({
        status: 'COMPLETED',
        winnerTeamNumber: 1,
        teamOneScore: 4,
        teamTwoScore: 3,
      }),
    }),
    200,
    'PUT',
  );
  await renderApp(<LiveMatchScreen />);
  expect(await screen.findByText('Preto venceu nos pênaltis!')).toBeOnTheScreen();
  expect(fetchMock).toHaveBeenCalledTimes(3);
  await userEvent.press(screen.getByRole('button', { name: 'OK e encerrar jogo' }));
  await waitFor(() => expect(screen.queryByText('Preto venceu nos pênaltis!')).toBeNull());
  expect(fetchMock).toHaveBeenCalledTimes(4);
});
test('SSE atualiza eventos novos e ignora eventos atrasados e de outra partida', async () => {
  load(live());
  await renderApp(<LiveMatchScreen />);
  await ready();
  const source = ScreenEventSource.instances[0];
  const scored = live({ version: 2, goalEvents: [goal()] });
  await act(() => source.emit('message', { data: JSON.stringify(event(scored)) }));
  expect(screen.getByText('Ana Silva')).toBeOnTheScreen();
  await act(() => {
    source.emit('message', { data: JSON.stringify(event(live({ version: 1 }))) });
    source.emit('message', {
      data: JSON.stringify(event(live({ version: 3 }), { matchId: 'another-match' })),
    });
  });
  expect(screen.getByText('Ana Silva')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Aumentar placar de Preto')).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
test('background fecha SSE e retorno ao app recarrega antes de acompanhar novamente', async () => {
  load();
  const ui = await renderApp(<LiveMatchScreen />);
  await ready();
  const original = ScreenEventSource.instances[0];
  await act(() => emitAppState('background'));
  expect(original.close).toHaveBeenCalledTimes(1);
  load();
  await act(() => emitAppState('active'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
  expect(ScreenEventSource.instances).toHaveLength(2);
  const resumed = ScreenEventSource.instances[1];
  await ui.unmount();
  expect(resumed.close).toHaveBeenCalledTimes(1);
});
test('401 no stream remove sessão e preserva destino ao login', async () => {
  load();
  await renderApp(<LiveMatchScreen />);
  await ready();
  await act(() => ScreenEventSource.instances[0].emit('error', { xhrStatus: 401 }));
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledWith({
      pathname: '/',
      params: { matchId: 'match-1', destination: 'live' },
    }),
  );
  expect(await getAccessToken()).toBeNull();
});
test('erro inicial pode ser recuperado pelo botão de nova tentativa', async () => {
  respond(base, { message: 'Jogo indisponível.' }, 503, 'GET');
  await renderApp(<LiveMatchScreen />);
  expect(await screen.findByText('Jogo indisponível.')).toBeOnTheScreen();
  load();
  await userEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
  await ready();
  expect(screen.queryByText('Jogo indisponível.')).toBeNull();
});
test('sem sessão abre login sem consultar a partida', async () => {
  await clearSession();
  await renderApp(<LiveMatchScreen />);
  await waitFor(() => expect(navigation.replace).toHaveBeenCalled());
  expect(fetchMock).not.toHaveBeenCalled();
});
test('acréscimos persistem na API e retornam ao controle do tempo', async () => {
  load();
  respond(
    `${base}/live/period/added-time`,
    managed({ periods: [period({ addedTimeMinutes: 3 })] }),
    200,
    'PUT',
  );
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(screen.getByRole('button', { name: 'Alterar acréscimos' }));
  await fireEvent.changeText(screen.getByLabelText('Minutos de acréscimos'), '3');
  await userEvent.press(screen.getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(screen.queryByLabelText('Minutos de acréscimos')).toBeNull());
  expect(body()).toEqual({ minutes: 3 });
});
test('placar otimista agrupa redução enquanto a primeira resposta está pendente', async () => {
  const scored = managed({
    phase: 'LEGACY',
    scores: [{ ...live().scores[0], score: 2 }, live().scores[1]],
  });
  load(scored);
  const first = deferred<unknown>();
  pendingResponse(`${base}/live/score`, first.promise, 'PUT');
  respond(`${base}/live/score`, managed({ scores: live().scores }), 200, 'PUT');
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(screen.getByLabelText('Diminuir placar de Preto'));
  await userEvent.press(screen.getByLabelText('Diminuir placar de Preto'));
  expect(fetchMock).toHaveBeenCalledTimes(4);
  expect(body()).toEqual({ sideNumber: 1, score: 1 });
  await act(() =>
    first.resolve(managed({ scores: [{ ...live().scores[0], score: 1 }, live().scores[1]] })),
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
  expect(body()).toEqual({ sideNumber: 1, score: 0 });
});
test('falha no ajuste de placar restaura estado confirmado e permite tentar novamente', async () => {
  load(managed({ scores: [{ ...live().scores[0], score: 1 }, live().scores[1]] }));
  respond(`${base}/live/score`, { message: 'Placar não atualizado.' }, 503, 'PUT');
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(screen.getByLabelText('Diminuir placar de Preto'));
  expect(await screen.findByText('Placar não atualizado.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Diminuir placar de Preto')).toBeEnabled();
});
test('jogo sem tempos confirma finalização e recarrega placar congelado', async () => {
  load(managed({ phase: 'LEGACY', periods: [] }), { periodsEnabled: false });
  respond(`${base}/live/finish`, match({ status: 'FINISHED' }), 200, 'PUT');
  respond(`${base}/live`, managed({ status: 'FINISHED', phase: 'FINISHED' }), 200, 'GET');
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(screen.getByRole('button', { name: 'Finalizar jogo' }));
  expect(fetchMock).toHaveBeenCalledTimes(3);
  await userEvent.press(screen.getAllByRole('button', { name: 'Finalizar jogo' }).at(-1)!);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
  expect(screen.queryByLabelText('Aumentar placar de Preto')).toBeNull();
});
test('reset confirmado retorna ao agendamento', async () => {
  load();
  respond(`${base}/live/reset`, match(), 200, 'PUT');
  await renderApp(<LiveMatchScreen />);
  await ready();
  await userEvent.press(screen.getByRole('button', { name: 'Resetar jogo' }));
  expect(fetchMock).toHaveBeenCalledTimes(3);
  await userEvent.press(screen.getAllByRole('button', { name: 'Resetar jogo' }).at(-1)!);
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledWith({
      pathname: '/match',
      params: { matchId: 'match-1' },
    }),
  );
});
