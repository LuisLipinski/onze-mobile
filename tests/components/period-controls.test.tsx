import React from 'react';
import { MatchPeriodControls } from '../../src/components/match-period-controls';
import { match, live, period } from '../support/fixtures';
import { renderApp, screen, act, userEvent } from '../support/render';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-02T18:10:00Z'));
});
const callbacks = () => ({
  busy: false,
  onSetAddedTime: jest.fn(async () => true),
  onFinishPeriod: jest.fn(async () => undefined),
  onStartNextPeriod: jest.fn(async () => undefined),
});
const configured = () => match({ periodsEnabled: true, periodCount: 2, periodDurationMinutes: 20 });

test('encerramento é liberado apenas após duração e acréscimos', async () => {
  const props = callbacks();
  await renderApp(
    <MatchPeriodControls
      {...props}
      match={configured()}
      state={live({ canManage: true, periods: [period({ addedTimeMinutes: 2 })] })}
    />,
  );
  expect(screen.queryByRole('button', { name: /Encerrar/ })).toBeNull();
  await act(() => {
    jest.advanceTimersByTime(10 * 60000);
  });
  expect(screen.queryByRole('button', { name: /Encerrar/ })).toBeNull();
  await act(() => {
    jest.advanceTimersByTime(2 * 60000);
  });
  expect(
    screen.getByText('O tempo pode ser encerrado. O cronômetro continuará até a confirmação.'),
  ).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: /Encerrar 1.*tempo/ }));
  expect(props.onFinishPeriod).toHaveBeenCalledTimes(1);
});

test('espectador vê cronômetro mas não recebe controles administrativos', async () => {
  await renderApp(<MatchPeriodControls {...callbacks()} match={configured()} state={live()} />);
  expect(screen.getByText('Controle dos tempos')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /créscimos/ })).toBeNull();
});

test('intervalo permite iniciar o próximo tempo configurado', async () => {
  const props = callbacks();
  await renderApp(
    <MatchPeriodControls
      {...props}
      match={configured()}
      state={live({ canManage: true, periods: [period({ endedAt: '2026-11-02T18:20:00Z' })] })}
    />,
  );
  expect(screen.getByText('O cronômetro está parado no intervalo.')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: /Iniciar 2.*tempo/ }));
  expect(props.onStartNextPeriod).toHaveBeenCalledTimes(1);
});

test('último tempo com vencedor oferece encerrar o jogo', async () => {
  jest.setSystemTime(new Date('2026-11-02T18:30:00Z'));
  await renderApp(
    <MatchPeriodControls
      {...callbacks()}
      match={match({ periodsEnabled: true, periodCount: 1 })}
      state={live({
        canManage: true,
        scores: [
          { sideNumber: 1, score: 1, name: 'Preto', imageUrl: null },
          { sideNumber: 2, score: 0, name: 'Branco', imageUrl: null },
        ],
      })}
    />,
  );
  expect(screen.getByRole('button', { name: 'Encerrar jogo' })).toBeOnTheScreen();
});

test('empate permite iniciar a prorrogação configurada', async () => {
  await renderApp(
    <MatchPeriodControls
      {...callbacks()}
      match={match({
        periodsEnabled: true,
        periodCount: 1,
        overtimeEnabled: true,
        overtimePeriodCount: 2,
      })}
      state={live({ canManage: true, periods: [period({ endedAt: '2026-11-02T18:20:00Z' })] })}
    />,
  );
  expect(screen.getByRole('button', { name: /Iniciar 1.*prorrogação/ })).toBeOnTheScreen();
});

test('edição dos acréscimos valida limite e fecha após salvar valor válido', async () => {
  const props = callbacks();
  await renderApp(
    <MatchPeriodControls {...props} match={configured()} state={live({ canManage: true })} />,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Alterar acréscimos' }));
  await userEvent.clear(screen.getByLabelText('Minutos de acréscimos'));
  expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Minutos de acréscimos'), '181');
  await userEvent.press(screen.getByRole('button', { name: 'Salvar' }));
  expect(screen.getByText('Informe um número inteiro entre 0 e 180 minutos.')).toBeOnTheScreen();
  expect(props.onSetAddedTime).not.toHaveBeenCalled();
  await userEvent.clear(screen.getByLabelText('Minutos de acréscimos'));
  await userEvent.type(screen.getByLabelText('Minutos de acréscimos'), '2');
  await userEvent.press(screen.getByRole('button', { name: 'Salvar' }));
  expect(props.onSetAddedTime).toHaveBeenCalledWith(2);
  expect(screen.queryByLabelText('Minutos de acréscimos')).toBeNull();
});

test('falha de acréscimos mantém a edição e exibe retorno para nova tentativa', async () => {
  const props = callbacks();
  props.onSetAddedTime.mockResolvedValue(false);
  await renderApp(
    <MatchPeriodControls {...props} match={configured()} state={live({ canManage: true })} />,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Alterar acréscimos' }));
  await userEvent.press(screen.getByRole('button', { name: 'Salvar' }));
  expect(
    screen.getByText('Não foi possível salvar os acréscimos. Tente novamente.'),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText('Minutos de acréscimos')).toBeOnTheScreen();
});

test('controles ficam ausentes na disputa de pênaltis ou no modo sem tempos', async () => {
  const ui = await renderApp(
    <MatchPeriodControls
      {...callbacks()}
      match={configured()}
      state={live({ phase: 'PENALTY_SHOOTOUT' })}
    />,
  );
  expect(screen.queryByText('Controle dos tempos')).toBeNull();
  await ui.rerender(<MatchPeriodControls {...callbacks()} match={match()} state={live()} />);
  expect(screen.queryByText('Controle dos tempos')).toBeNull();
});
