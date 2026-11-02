import React from 'react';
import { MatchCard } from '../../src/components/match-card';
import { LiveMatchCard } from '../../src/components/live-match-card';
import { StatisticsMatchCard } from '../../src/components/statistics-match-card';
import { match, liveSummary, statisticsTeam } from '../support/fixtures';
import type { FootballMatch } from '../../src/lib/api';
import { renderApp, screen, fireEvent, userEvent, act } from '../support/render';

test.each<[Partial<FootballMatch>, string]>([
  [{ myAttendance: 'GOING', myPaymentStatus: 'PENDING' }, 'Pagamento pendente'],
  [{ myAttendance: 'GOING', myPaymentStatus: 'REPORTED' }, 'Pagamento informado'],
  [{ myAttendance: 'GOING', myPaymentStatus: 'PAID' }, 'Presença e pagamento confirmados'],
  [{ myAttendance: 'WAITLISTED', myWaitlistPosition: 3 }, 'Lista de espera · 3º da fila'],
  [{ status: 'CANCELLED' }, 'Jogo cancelado'],
  [{ signupOpen: false }, 'Lista encerrada'],
  [{ myCreditAllocationStatus: 'RESERVED' }, 'Crédito reservado · confirme presença'],
  [{ myAttendance: 'NOT_GOING', myPaymentSettlementStatus: 'REFUNDED' }, 'Pagamento reembolsado'],
  [{ myPaymentDeadlineRemovedAt: '2026-11-01T18:00:00Z' }, 'Removido por falta de pagamento'],
])('card exibe situação de presença/pagamento %j', async (overrides, label) => {
  const press = jest.fn();
  await renderApp(<MatchCard match={match(overrides)} onPress={press} />);
  expect(screen.getByText(label)).toBeOnTheScreen();
  expect(screen.getByText('8/14 confirmados')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Arena Teste'));
  expect(press).toHaveBeenCalledTimes(1);
});

test('ocorrência semanal mostra abertura de presença e pode ocultar nome do grupo', async () => {
  await renderApp(
    <MatchCard
      match={match({ recurrence: 'WEEKLY', attendanceOpen: false })}
      showGroup={false}
      onPress={jest.fn()}
    />,
  );
  expect(screen.getByText(/Presença abre em/)).toBeOnTheScreen();
  expect(screen.getByText('↻ JOGO SEMANAL')).toBeOnTheScreen();
  expect(screen.queryByText('TIME DA VILA')).toBeNull();
});

test('card ao vivo atualiza o relógio e abre o acompanhamento', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-02T18:10:00Z'));
  const press = jest.fn();
  await renderApp(<LiveMatchCard match={liveSummary()} onPress={press} />);
  expect(screen.getByText('10:00')).toBeOnTheScreen();
  expect(screen.getByText('Acompanhar jogo  ›')).toBeOnTheScreen();
  await act(() => {
    jest.advanceTimersByTime(1000);
  });
  expect(screen.getByText('10:01')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button'));
  expect(press).toHaveBeenCalledTimes(1);
});

test('card de disputa mostra pênaltis e ação de gestão sem cronômetro de tempo', async () => {
  await renderApp(
    <LiveMatchCard
      match={liveSummary({ phase: 'PENALTY_SHOOTOUT', currentPeriod: null, canManage: true })}
      onPress={jest.fn()}
    />,
  );
  expect(screen.getByText('PÊNALTIS')).toBeOnTheScreen();
  expect(screen.getByText('Gerenciar jogo  ›')).toBeOnTheScreen();
});

test.each(['WIN', 'DRAW', 'LOSS'] as const)(
  'histórico destaca o resultado %s e o time do jogador',
  async (result) => {
    const press = jest.fn();
    await renderApp(
      <StatisticsMatchCard
        startsAt="2026-11-02T18:00:00Z"
        timeZone="UTC"
        venue="Arena Teste"
        teams={[statisticsTeam(), statisticsTeam({ teamNumber: 2, name: 'Branco', score: 1 })]}
        highlightTeamNumber={1}
        result={result}
        detail="1 gol"
        onPress={press}
      />,
    );
    expect(
      screen.getByText(result === 'WIN' ? 'VITÓRIA' : result === 'LOSS' ? 'DERROTA' : 'EMPATE'),
    ).toBeOnTheScreen();
    expect(screen.getByText('SEU TIME')).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('button'));
    expect(press).toHaveBeenCalledTimes(1);
  },
);
