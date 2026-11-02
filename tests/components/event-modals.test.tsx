import React, { useState } from 'react';
import { GoalEventModal } from '../../src/components/goal-event-modal';
import { ShotEventModal } from '../../src/components/shot-event-modal';
import { CardEventModal } from '../../src/components/card-event-modal';
import { FoulEventModal } from '../../src/components/foul-event-modal';
import { renderApp, screen, userEvent, fireEvent } from '../support/render';
import { team, secondTeam, assignment } from '../support/fixtures';

const noop = () => undefined;
const goalProps = () => ({
  visible: true,
  teams: [team(), secondTeam()],
  selectedTeamNumber: 1,
  sentOffAssignmentIds: new Set<string>(),
  scorerAssignmentId: null as string | null,
  assistAssignmentId: null as string | null,
  ownGoal: false,
  ownGoalTeamNumber: 2,
  saving: false,
  onSelectScorer: jest.fn(),
  onSelectAssist: jest.fn(),
  onChangeOwnGoal: jest.fn(),
  onChangeOwnGoalTeam: jest.fn(),
  onCancel: jest.fn(),
  onSave: jest.fn(),
});

test('gol exige autor e impede escolher jogador expulso', async () => {
  const props = goalProps();
  props.teams[0].assignments.push(assignment({ id: 'sent-off', displayName: 'Carlos' }));
  props.sentOffAssignmentIds.add('sent-off');
  const ui = await renderApp(<GoalEventModal {...props} />);
  expect(screen.getByRole('button', { name: 'Salvar gol' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Carlos/ })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: /Carlos/ }));
  expect(props.onSelectScorer).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('button', { name: 'Ana Silva' }));
  expect(props.onSelectScorer).toHaveBeenCalledWith('assignment-1');
  await ui.rerender(<GoalEventModal {...props} scorerAssignmentId="assignment-1" />);
  await userEvent.press(screen.getByRole('button', { name: 'Salvar gol' }));
  expect(props.onSave).toHaveBeenCalledTimes(1);
});

test('autor não aparece como opção de assistência e é possível removê-la', async () => {
  const props = goalProps();
  props.teams[0].assignments.push(assignment({ id: 'assist-1', displayName: 'Carlos' }));
  await renderApp(
    <GoalEventModal {...props} scorerAssignmentId="assignment-1" assistAssignmentId="assist-1" />,
  );
  expect(screen.getAllByRole('button', { name: 'Ana Silva' })).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: 'Carlos' })).toHaveLength(2);
  await userEvent.press(screen.getByRole('button', { name: 'Sem assistência' }));
  expect(props.onSelectAssist).toHaveBeenCalledWith(null);
});

test('gol contra escolhe jogador adversário e não oferece assistência', async () => {
  const props = goalProps();
  function Form() {
    const [own, setOwn] = useState(false);
    return (
      <GoalEventModal
        {...props}
        ownGoal={own}
        scorerAssignmentId="assignment-2"
        onChangeOwnGoal={setOwn}
      />
    );
  }
  await renderApp(<Form />);
  await fireEvent(screen.getByRole('switch', { name: 'Gol contra' }), 'valueChange', true);
  expect(screen.getByText('Quem marcou contra?')).toBeOnTheScreen();
  expect(screen.queryByText('Assistência (opcional)')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Ana Silva' })).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: 'Bruno' }));
  expect(props.onSelectScorer).toHaveBeenCalledWith('assignment-2');
});

test('gol em envio bloqueia os botões de salvar e cancelar', async () => {
  const props = goalProps();
  await renderApp(<GoalEventModal {...props} scorerAssignmentId="assignment-1" saving />);
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Salvando...' }));
  await userEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
  expect(props.onSave).not.toHaveBeenCalled();
  expect(props.onCancel).not.toHaveBeenCalled();
});

test.each(['YELLOW', 'RED'] as const)(
  'cartão %s bloqueia expulso e só salva com jogador',
  async (cardType) => {
    const select = jest.fn();
    const save = jest.fn();
    const current = team({
      assignments: [assignment(), assignment({ id: 'sent-off', displayName: 'Carlos' })],
    });
    const props = {
      visible: true,
      team: current,
      sentOffAssignmentIds: new Set(['sent-off']),
      playerAssignmentId: null,
      cardType,
      saving: false,
      onSelectPlayer: select,
      onCancel: noop,
      onSave: save,
    };
    const ui = await renderApp(<CardEventModal {...props} />);
    expect(
      screen.getByText(`Cartão ${cardType === 'YELLOW' ? 'amarelo' : 'vermelho'}`),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Salvar cartão' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Carlos/ })).toBeDisabled();
    await userEvent.press(screen.getByRole('button', { name: 'Ana Silva' }));
    expect(select).toHaveBeenCalledWith('assignment-1');
    await ui.rerender(<CardEventModal {...props} playerAssignmentId="assignment-1" />);
    await userEvent.press(screen.getByRole('button', { name: 'Salvar cartão' }));
    expect(save).toHaveBeenCalledTimes(1);
  },
);

test.each(['SHOTS', 'SHOTS_ON_TARGET'] as const)(
  'chute %s exige jogador e preserva o tipo exibido',
  async (type) => {
    const select = jest.fn();
    const save = jest.fn();
    const props = {
      visible: true,
      team: team(),
      type,
      playerAssignmentId: null,
      sentOffAssignmentIds: new Set<string>(),
      saving: false,
      onSelectPlayer: select,
      onCancel: noop,
      onSave: save,
    };
    const ui = await renderApp(<ShotEventModal {...props} />);
    expect(screen.getByText(type === 'SHOTS' ? 'Chute' : 'Chute no gol')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Salvar chute' })).toBeDisabled();
    await userEvent.press(screen.getByRole('button', { name: 'Ana Silva' }));
    expect(select).toHaveBeenCalledWith('assignment-1');
    await ui.rerender(<ShotEventModal {...props} playerAssignmentId="assignment-1" />);
    await userEvent.press(screen.getByRole('button', { name: 'Salvar chute' }));
    expect(save).toHaveBeenCalledTimes(1);
  },
);

test('chute não permite escolher expulso nem repetir salvamento em andamento', async () => {
  const select = jest.fn();
  const save = jest.fn();
  await renderApp(
    <ShotEventModal
      visible
      team={team()}
      type="SHOTS"
      playerAssignmentId="assignment-1"
      sentOffAssignmentIds={new Set(['assignment-1'])}
      saving
      onSelectPlayer={select}
      onCancel={noop}
      onSave={save}
    />,
  );
  expect(screen.getByRole('button', { name: /Ana Silva/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: /Ana Silva/ }));
  await userEvent.press(screen.getByRole('button', { name: 'Salvando...' }));
  expect(select).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});

function foulProps() {
  return {
    visible: true,
    teams: [team(), secondTeam()],
    victimTeamNumber: 1,
    penalty: true,
    stage: 'AWARD' as 'AWARD' | 'TAKER' | 'RESULT',
    offenderId: null as string | null,
    victimId: null as string | null,
    takerId: null as string | null,
    scored: null as boolean | null,
    sentOffAssignmentIds: new Set<string>(),
    saving: false,
    onSelectOffender: jest.fn(),
    onSelectVictim: jest.fn(),
    onSelectTaker: jest.fn(),
    onSelectResult: jest.fn(),
    onAward: jest.fn(),
    onContinue: jest.fn(),
    onResolve: jest.fn(),
    onClose: jest.fn(),
  };
}

test.each([true, false])(
  'falta/pênalti (%s) distingue quem sofreu e quem cometeu',
  async (penalty) => {
    const props = { ...foulProps(), penalty };
    const ui = await renderApp(<FoulEventModal {...props} />);
    expect(screen.getByText(penalty ? 'Marcar pênalti' : 'Registrar falta')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeDisabled();
    await userEvent.press(screen.getByRole('button', { name: 'Ana Silva' }));
    await userEvent.press(screen.getByRole('button', { name: 'Bruno' }));
    expect(props.onSelectVictim).toHaveBeenCalledWith('assignment-1');
    expect(props.onSelectOffender).toHaveBeenCalledWith('assignment-2');
    await ui.rerender(
      <FoulEventModal {...props} victimId="assignment-1" offenderId="assignment-2" />,
    );
    await userEvent.press(screen.getByRole('button', { name: 'Registrar' }));
    expect(props.onAward).toHaveBeenCalledTimes(1);
  },
);

test('seleção do cobrador exige um jogador do time beneficiado', async () => {
  const props = { ...foulProps(), stage: 'TAKER' as const };
  const ui = await renderApp(<FoulEventModal {...props} />);
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Bruno' })).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: 'Ana Silva' }));
  expect(props.onSelectTaker).toHaveBeenCalledWith('assignment-1');
  await ui.rerender(<FoulEventModal {...props} takerId="assignment-1" />);
  await userEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  expect(props.onContinue).toHaveBeenCalledTimes(1);
});

test.each([true, false])(
  'resultado de pênalti (%s) é uma escolha explícita, inclusive quando perdeu',
  async (scored) => {
    const props = { ...foulProps(), stage: 'RESULT' as const, takerId: 'assignment-1' };
    const ui = await renderApp(<FoulEventModal {...props} />);
    expect(screen.getByRole('button', { name: 'Salvar resultado' })).toBeDisabled();
    await userEvent.press(
      screen.getByRole('button', { name: scored ? 'Sim, gol' : 'Não, perdeu' }),
    );
    expect(props.onSelectResult).toHaveBeenCalledWith(scored);
    await ui.rerender(<FoulEventModal {...props} scored={scored} />);
    await userEvent.press(screen.getByRole('button', { name: 'Salvar resultado' }));
    expect(props.onResolve).toHaveBeenCalledTimes(1);
  },
);
