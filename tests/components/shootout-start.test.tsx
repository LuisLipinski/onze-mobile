import React from 'react';
import { StartLiveMatchModal } from '../../src/components/start-live-match-modal';
import { PenaltyShootoutPanel } from '../../src/components/penalty-shootout-panel';
import { live, shootout, teams } from '../support/fixtures';
import { renderApp, screen, userEvent, fireEvent } from '../support/render';

const startProps = () => ({
  visible: true,
  identities: [
    { teamNumber: 1, name: 'Preto', imageUrl: null },
    { teamNumber: 2, name: 'Branco', imageUrl: null },
  ],
  loading: false,
  saving: false,
  uploadingTeamNumber: null,
  error: null,
  onChangeName: jest.fn(),
  onSelectImage: jest.fn(),
  onCancel: jest.fn(),
  onConfirm: jest.fn(),
});
test('início envia edição e imagem para o time correto e exige confirmação', async () => {
  const props = startProps();
  await renderApp(<StartLiveMatchModal {...props} />);
  await fireEvent.changeText(screen.getByLabelText('Nome do time 2'), 'Azul');
  expect(props.onChangeName).toHaveBeenCalledWith(2, 'Azul');
  await userEvent.press(screen.getByRole('button', { name: 'Trocar imagem de Preto' }));
  expect(props.onSelectImage).toHaveBeenCalledWith(1);
  expect(props.onConfirm).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('button', { name: 'Iniciar jogo' }));
  expect(props.onConfirm).toHaveBeenCalledTimes(1);
});
test.each(['nome vazio', 'um time', 'upload', 'salvamento'] as const)(
  'início bloqueado: %s',
  async (reason) => {
    const props = startProps();
    if (reason === 'nome vazio') props.identities[0].name = '  ';
    if (reason === 'um time') props.identities.pop();
    await renderApp(
      <StartLiveMatchModal
        {...props}
        uploadingTeamNumber={reason === 'upload' ? 1 : null}
        saving={reason === 'salvamento'}
      />,
    );
    const button = screen.getByRole('button', {
      name: reason === 'salvamento' ? 'Iniciando...' : 'Iniciar jogo',
    });
    expect(button).toBeDisabled();
    await userEvent.press(button);
    expect(props.onConfirm).not.toHaveBeenCalled();
  },
);

const shootoutProps = () => ({
  state: live({ phase: 'PENALTY_SHOOTOUT', canManage: true, penaltyShootout: shootout() }),
  teams: null,
  busy: false,
  onSetLineup: jest.fn().mockResolvedValue(undefined),
  onRecordAttempt: jest.fn().mockResolvedValue(undefined),
});
test('disputa exige os dez batedores e preserva ordem e nomes sem espaços', async () => {
  const props = shootoutProps();
  await renderApp(<PenaltyShootoutPanel {...props} />);
  const start = screen.getByRole('button', { name: 'Iniciar disputa por pênaltis' });
  expect(start).toBeDisabled();
  for (const name of ['Preto', 'Branco'])
    for (let order = 1; order <= 5; order++) {
      await fireEvent.changeText(
        screen.getByLabelText(`${order}º batedor de ${name}`),
        ` ${name} ${order} `,
      );
    }
  await userEvent.press(start);
  expect(props.onSetLineup).toHaveBeenCalledWith(
    [1, 2].flatMap((teamNumber) =>
      Array.from({ length: 5 }, (_, i) => ({
        teamNumber,
        kickOrder: i + 1,
        displayName: `${teamNumber === 1 ? 'Preto' : 'Branco'} ${i + 1}`,
      })),
    ),
  );
});
test('escalação salva é restaurada sem apagar edição quando a mesma resposta chega novamente', async () => {
  const props = shootoutProps();
  props.state.penaltyShootout!.takers = [1, 2].flatMap((teamNumber) =>
    Array.from({ length: 5 }, (_, i) => ({
      teamNumber,
      kickOrder: i + 1,
      assignmentId: null,
      participantType: null,
      participantId: null,
      displayName: `Jogador ${teamNumber}-${i + 1}`,
    })),
  );
  const ui = await renderApp(<PenaltyShootoutPanel {...props} />);
  await fireEvent.changeText(screen.getByLabelText('1º batedor de Preto'), 'Novo jogador');
  await ui.rerender(
    <PenaltyShootoutPanel
      {...props}
      state={{
        ...props.state,
        penaltyShootout: {
          ...props.state.penaltyShootout!,
          takers: [...props.state.penaltyShootout!.takers],
        },
      }}
    />,
  );
  expect(screen.getByLabelText('1º batedor de Preto')).toHaveDisplayValue('Novo jogador');
  await userEvent.press(screen.getByRole('button', { name: 'Iniciar disputa por pênaltis' }));
  expect(props.onSetLineup.mock.calls[0][0][0]).toMatchObject({
    displayName: 'Novo jogador',
    kickOrder: 1,
  });
});
test('espectador aguarda escalação e não recebe controles de cobrança', async () => {
  const props = shootoutProps();
  const ui = await renderApp(
    <PenaltyShootoutPanel {...props} state={{ ...props.state, canManage: false }} />,
  );
  expect(screen.getByText('Aguardando o administrador definir os batedores.')).toBeOnTheScreen();
  expect(screen.queryByRole('button')).toBeNull();
  await ui.rerender(
    <PenaltyShootoutPanel
      {...props}
      state={live({
        phase: 'PENALTY_SHOOTOUT',
        penaltyShootout: shootout({ status: 'IN_PROGRESS', nextTeamNumber: 1, nextRoundNumber: 1 }),
      })}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Gol' })).toBeNull();
});
test.each([true, false])('cobrança registra resultado explícito %s', async (scored) => {
  const props = shootoutProps();
  props.state.penaltyShootout = shootout({
    status: 'IN_PROGRESS',
    nextTeamNumber: 1,
    nextRoundNumber: 1,
  });
  await renderApp(<PenaltyShootoutPanel {...props} />);
  await userEvent.press(screen.getByRole('button', { name: scored ? 'Gol' : 'Perdeu' }));
  expect(props.onRecordAttempt).toHaveBeenCalledWith(scored);
});
test('morte súbita exige seleção do time da vez e envia o identificador do jogador', async () => {
  const props = shootoutProps();
  props.state.penaltyShootout = shootout({
    status: 'IN_PROGRESS',
    nextTeamNumber: 2,
    nextRoundNumber: 6,
    nextTakerSelectionRequired: true,
  });
  await renderApp(<PenaltyShootoutPanel {...props} teams={teams()} />);
  expect(screen.getByText('MORTE SÚBITA — RODADA 6')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Gol' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Selecionar o batedor' }));
  expect(screen.queryByRole('button', { name: 'Ana Silva' })).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: /Bruno/ }));
  await userEvent.press(screen.getByRole('button', { name: 'Perdeu' }));
  expect(props.onRecordAttempt).toHaveBeenCalledWith(false, 'assignment-2', undefined);
});
test('cobrança em envio bloqueia gol e perda; finalização mostra o vencedor', async () => {
  const props = shootoutProps();
  props.state.penaltyShootout = shootout({
    status: 'IN_PROGRESS',
    nextTeamNumber: 1,
    nextRoundNumber: 1,
  });
  const ui = await renderApp(<PenaltyShootoutPanel {...props} busy />);
  await userEvent.press(screen.getByRole('button', { name: 'Gol' }));
  await userEvent.press(screen.getByRole('button', { name: 'Perdeu' }));
  expect(props.onRecordAttempt).not.toHaveBeenCalled();
  await ui.rerender(
    <PenaltyShootoutPanel
      {...props}
      state={live({
        phase: 'FINISHED',
        penaltyShootout: shootout({
          status: 'COMPLETED',
          winnerTeamNumber: 1,
          teamOneScore: 4,
          teamTwoScore: 3,
        }),
      })}
    />,
  );
  expect(screen.getByText('Preto venceu nos pênaltis por 4 × 3.')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Gol' })).toBeNull();
});
