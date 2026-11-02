import React from 'react';
import { LiveScoreboard } from '../../src/components/live-scoreboard';
import { LiveMatchDetails } from '../../src/components/live-match-details';
import { GoalTimeline } from '../../src/components/goal-timeline';
import { renderApp, screen, userEvent } from '../support/render';
import { match, live, period, goal, card, foul } from '../support/fixtures';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-02T18:10:00Z'));
});
const actions = () => ({
  onChangeScore: jest.fn(),
  onRegisterGoal: jest.fn(),
  onRegisterCard: jest.fn(),
  onRegisterStatistic: jest.fn(),
  onRegisterPenalty: jest.fn(),
  statisticSaving: false,
});

test('espectador vê o placar e não recebe ações administrativas', async () => {
  await renderApp(<LiveScoreboard {...actions()} match={match()} state={live()} />);
  expect(screen.getByText('Preto')).toBeOnTheScreen();
  expect(screen.getByText('Branco')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Aumentar placar de Preto')).toBeNull();
  expect(screen.queryByRole('button', { name: /Registrar cartão/ })).toBeNull();
});

test('gestor recebe ações para o time correto, incluindo a vítima da falta e do pênalti', async () => {
  const props = actions();
  await renderApp(<LiveScoreboard {...props} match={match()} state={live({ canManage: true })} />);
  expect(screen.getByLabelText('Diminuir placar de Preto')).toBeDisabled();
  await userEvent.press(screen.getByLabelText('Aumentar placar de Preto'));
  expect(props.onRegisterGoal).toHaveBeenCalledWith(1);
  await userEvent.press(
    screen.getByRole('button', { name: 'Registrar cartão amarelo para Branco' }),
  );
  expect(props.onRegisterCard).toHaveBeenCalledWith(2, 'YELLOW');
  await userEvent.press(
    screen.getByRole('button', { name: 'Registrar cartão vermelho para Preto' }),
  );
  expect(props.onRegisterCard).toHaveBeenCalledWith(1, 'RED');
  await userEvent.press(screen.getByRole('button', { name: 'Registrar chute no gol para Preto' }));
  expect(props.onRegisterStatistic).toHaveBeenCalledWith(1, 'SHOTS_ON_TARGET');
  await userEvent.press(screen.getByRole('button', { name: 'Registrar falta sofrida por Branco' }));
  expect(props.onRegisterStatistic).toHaveBeenCalledWith(2, 'FOULS');
  await userEvent.press(
    screen.getByRole('button', { name: 'Registrar pênalti sofrido por Preto' }),
  );
  expect(props.onRegisterPenalty).toHaveBeenCalledWith(1);
});

test('placar positivo pode diminuir e salvamento bloqueia novos registros estatísticos', async () => {
  const props = actions();
  await renderApp(
    <LiveScoreboard
      {...props}
      statisticSaving
      match={match()}
      state={live({
        canManage: true,
        scores: [
          { sideNumber: 1, score: 2, name: 'Preto', imageUrl: null },
          { sideNumber: 2, score: 1, name: 'Branco', imageUrl: null },
        ],
      })}
    />,
  );
  await userEvent.press(screen.getByLabelText('Diminuir placar de Preto'));
  expect(props.onChangeScore).toHaveBeenCalledWith(1, -1);
  await userEvent.press(screen.getByRole('button', { name: 'Registrar chute para Preto' }));
  expect(props.onRegisterStatistic).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Registrar chute para Preto' })).toBeDisabled();
});

test('intervalo e jogo finalizado não permitem editar placar', async () => {
  const ui = await renderApp(
    <LiveScoreboard
      {...actions()}
      match={match()}
      state={live({ canManage: true, periods: [period({ endedAt: '2026-11-02T18:20:00Z' })] })}
    />,
  );
  expect(screen.queryByLabelText('Aumentar placar de Preto')).toBeNull();
  await ui.rerender(
    <LiveScoreboard
      {...actions()}
      match={match()}
      state={live({ canManage: true, status: 'FINISHED' })}
    />,
  );
  expect(screen.queryByLabelText('Aumentar placar de Preto')).toBeNull();
});

test('placar suporta mais de dois times sem trocar os números das ações', async () => {
  const props = actions();
  const state = live({ canManage: true });
  state.scores.push({ sideNumber: 3, score: 0, name: 'Vermelho', imageUrl: null });
  await renderApp(<LiveScoreboard {...props} match={match({ teamCount: 3 })} state={state} />);
  await userEvent.press(screen.getByLabelText('Aumentar placar de Vermelho'));
  expect(props.onRegisterGoal).toHaveBeenCalledWith(3);
});

test('acréscimos ficam separados do tempo regulamentar', async () => {
  jest.setSystemTime(new Date('2026-11-02T18:21:00Z'));
  await renderApp(
    <LiveScoreboard
      {...actions()}
      match={match()}
      state={live({ periods: [period({ addedTimeMinutes: 2 })] })}
    />,
  );
  expect(screen.getByText('ACRÉSCIMOS')).toBeOnTheScreen();
  expect(screen.getByText(/\+01:00.*\+02:00/)).toBeOnTheScreen();
});

test('detalhes permitem corrigir apenas registros manuais disponíveis', async () => {
  const correct = jest.fn();
  const state = live({
    canManage: true,
    teamStatistics: [
      { sideNumber: 1, shots: 4, shotsOnTarget: 2, goalShots: 2, corners: 1, fouls: 0 },
    ],
  });
  await renderApp(
    <LiveMatchDetails
      match={match()}
      state={state}
      saving={false}
      onCorrectStatistic={correct}
      onRemoveFoul={jest.fn()}
      removingFoul={false}
    />,
  );
  expect(screen.getByText('Detalhes do jogo')).toBeOnTheScreen();
  expect(
    screen.queryByRole('button', { name: 'Remover um registro de chutes no gol do time 1' }),
  ).toBeNull();
  await userEvent.press(
    screen.getByRole('button', { name: 'Remover um registro de chutes do time 1' }),
  );
  expect(correct).toHaveBeenCalledWith(1, 'SHOTS');
  await userEvent.press(
    screen.getByRole('button', { name: 'Remover um registro de escanteios do time 1' }),
  );
  expect(correct).toHaveBeenCalledWith(1, 'CORNERS');
});

test('detalhes de espectador mostram os chutes individuais sem permitir correção', async () => {
  await renderApp(
    <LiveMatchDetails
      match={match()}
      state={live({
        goalEvents: [goal()],
        shotEvents: [
          {
            id: 'shot-1',
            sideNumber: 1,
            playerAssignmentId: 'assignment-1',
            playerDisplayName: 'Ana Silva',
            onTarget: false,
            createdAt: '2026-11-02T18:02:00Z',
          },
        ],
      })}
      saving={false}
      onCorrectStatistic={jest.fn()}
      onRemoveFoul={jest.fn()}
      removingFoul={false}
    />,
  );
  expect(screen.getByText('Chutes por jogador · Preto')).toBeOnTheScreen();
  expect(screen.getByText('1 no gol / 2 chutes')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /Remover um registro/ })).toBeNull();
});

test('falta comum é corrigida nos detalhes, com autor e vítima visíveis', async () => {
  const remove = jest.fn();
  await renderApp(
    <LiveMatchDetails
      match={match()}
      state={live({ canManage: true, foulEvents: [foul()] })}
      saving={false}
      onCorrectStatistic={jest.fn()}
      onRemoveFoul={remove}
      removingFoul={false}
    />,
  );
  expect(screen.getByText('Bruno em Ana Silva')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Remover falta de Bruno' }));
  expect(remove).toHaveBeenCalledWith('foul-1');
});

test('linha do tempo ignora falta comum e identifica autor, assistência e gol contra', async () => {
  const ui = await renderApp(<GoalTimeline events={[]} foulEvents={[foul()]} match={match()} />);
  expect(screen.queryByText('Linha do tempo')).toBeNull();
  await ui.rerender(
    <GoalTimeline
      events={[goal({ ownGoal: true, assistDisplayName: 'Carlos' })]}
      match={match()}
    />,
  );
  expect(screen.getByText('Ana Silva')).toBeOnTheScreen();
  expect(screen.getByText('Carlos')).toBeOnTheScreen();
  expect(screen.getByText('GOL CONTRA')).toBeOnTheScreen();
});

test('pênalti marcado e cobrança perdida são registros separados na linha do tempo', async () => {
  await renderApp(
    <GoalTimeline
      events={[]}
      foulEvents={[
        foul({
          penalty: true,
          scored: false,
          takerDisplayName: 'Ana Silva',
          resolvedAt: '2026-11-02T18:03:00Z',
          resolutionElapsedSeconds: 180,
        }),
      ]}
      match={match()}
    />,
  );
  expect(screen.getByText('Bruno fez pênalti no jogador Ana Silva')).toBeOnTheScreen();
  expect(screen.getByText('🥅 PÊNALTI MARCADO')).toBeOnTheScreen();
  expect(screen.getByText('🥅 PÊNALTI PERDIDO')).toBeOnTheScreen();
  expect(screen.getByText('Ana Silva perdeu o pênalti')).toBeOnTheScreen();
});

test('segundo amarelo exibe expulsão e remoção envia o tipo de evento correto', async () => {
  const remove = jest.fn();
  await renderApp(
    <GoalTimeline
      events={[]}
      cardEvents={[
        card(),
        card({ id: 'card-2', elapsedSeconds: 60, createdAt: '2026-11-02T18:01:00Z' }),
      ]}
      match={match()}
      canDelete
      onDelete={remove}
    />,
  );
  expect(screen.getByText('2º AMARELO • EXPULSO')).toBeOnTheScreen();
  await userEvent.press(
    screen.getAllByRole('button', { name: 'Remover evento da linha do tempo' })[0],
  );
  expect(remove).toHaveBeenCalledWith('CARD', 'card-2');
});

test('evento em remoção bloqueia repetição e espectador não recebe lixeira', async () => {
  const remove = jest.fn();
  const ui = await renderApp(
    <GoalTimeline
      events={[goal()]}
      match={match()}
      canDelete
      deletingEventKey="GOAL:goal-1"
      onDelete={remove}
    />,
  );
  expect(screen.getByRole('button', { name: 'Remover evento da linha do tempo' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Remover evento da linha do tempo' }));
  expect(remove).not.toHaveBeenCalled();
  await ui.rerender(<GoalTimeline events={[goal()]} match={match()} onDelete={remove} />);
  expect(screen.queryByRole('button', { name: 'Remover evento da linha do tempo' })).toBeNull();
});
