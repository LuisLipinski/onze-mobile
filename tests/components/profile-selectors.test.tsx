import React, { useState } from 'react';
import { PlayerPositionSelect } from '../../src/components/player-position-select';
import { TechnicalRatingEditor } from '../../src/components/technical-rating-editor';
import { StatisticsSeasonSelect } from '../../src/components/statistics-season-select';
import type { PlayerSkill } from '../../src/lib/api';
import type { PlayerPosition } from '../../src/lib/sports-profile';
import { renderApp, screen, userEvent } from '../support/render';

test('seletor de posição bloqueia a posição já usada e retorna a escolha permitida', async () => {
  const select = jest.fn();
  function Form() {
    const [visible, setVisible] = useState(false);
    const [value, setValue] = useState<PlayerPosition | null>(null);
    return (
      <PlayerPositionSelect
        label="Posição secundária"
        value={value}
        visible={visible}
        disabledPosition="GOALKEEPER"
        onOpen={() => setVisible(true)}
        onClose={() => setVisible(false)}
        onSelect={(next) => {
          select(next);
          setValue(next);
        }}
      />
    );
  }
  await renderApp(<Form />);
  await userEvent.press(screen.getByRole('button', { name: 'Posição secundária' }));
  expect(screen.getByRole('button', { name: 'Goleiro' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Goleiro' }));
  expect(select).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('button', { name: 'Meio-campo' }));
  expect(select).toHaveBeenCalledWith('MIDFIELDER');
  expect(screen.getByText('Meio-campo')).toBeOnTheScreen();
  expect(screen.queryByText('Escolha uma opção.')).toBeNull();
});

test('posição desabilitada não abre a seleção', async () => {
  const open = jest.fn();
  await renderApp(
    <PlayerPositionSelect
      label="Posição principal"
      value="DEFENDER"
      visible={false}
      disabled
      onOpen={open}
      onClose={jest.fn()}
      onSelect={jest.fn()}
    />,
  );
  expect(screen.getByText('Zagueiro')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Posição principal' }));
  expect(open).not.toHaveBeenCalled();
});

test('editor respeita limites e permite aumentar, diminuir e limpar avaliação', async () => {
  const change = jest.fn();
  function Editor() {
    const [ratings, setRatings] = useState<Partial<Record<PlayerSkill, number>>>({
      PASSING: 1,
      FINISHING: 10,
    });
    return (
      <TechnicalRatingEditor
        ratings={ratings}
        importantSkills={new Set(['PASSING'])}
        onChange={(skill, value) => {
          change(skill, value);
          setRatings((old) => ({ ...old, [skill]: value }));
        }}
      />
    );
  }
  await renderApp(<Editor />);
  expect(screen.getByText('IMPORTANTE PARA ESTA POSIÇÃO')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Diminuir Passe em meia estrela' })).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Aumentar Finalização em meia estrela' }),
  ).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Aumentar Passe em meia estrela' }));
  expect(change).toHaveBeenLastCalledWith('PASSING', 2);
  await userEvent.press(screen.getByRole('button', { name: 'Diminuir Passe em meia estrela' }));
  expect(change).toHaveBeenLastCalledWith('PASSING', 1);
  await userEvent.press(screen.getByRole('button', { name: 'Marcar Passe como não avaliado' }));
  expect(change).toHaveBeenLastCalledWith('PASSING', undefined);
  expect(screen.getByRole('button', { name: 'Marcar Passe como não avaliado' })).toBeDisabled();
});

test('consulta técnica somente leitura não oferece botões de alteração', async () => {
  await renderApp(<TechnicalRatingEditor ratings={{ PASSING: 8 }} readOnly onChange={jest.fn()} />);
  expect(screen.getByText('Passe')).toBeOnTheScreen();
  expect(screen.getByText('4,0 ★ · 40/50')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /Aumentar Passe/ })).toBeNull();
});

test('editor bloqueado mantém os controles desabilitados', async () => {
  const change = jest.fn();
  await renderApp(<TechnicalRatingEditor ratings={{ PASSING: 6 }} disabled onChange={change} />);
  await userEvent.press(screen.getByRole('button', { name: 'Aumentar Passe em meia estrela' }));
  expect(change).not.toHaveBeenCalled();
});

test('seletor alterna entre temporada encerrada e ranking geral', async () => {
  const select = jest.fn();
  function Rankings() {
    const [visible, setVisible] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    return (
      <StatisticsSeasonSelect
        seasons={[
          {
            id: 'season-1',
            number: 1,
            startedAt: '2026-01-01T00:00:00Z',
            endedAt: '2026-02-01T00:00:00Z',
          },
        ]}
        selectedId={selected}
        visible={visible}
        onOpen={() => setVisible(true)}
        onClose={() => setVisible(false)}
        onSelect={(id) => {
          select(id);
          setSelected(id);
        }}
      />
    );
  }
  await renderApp(<Rankings />);
  await userEvent.press(
    screen.getByRole('button', { name: 'Selecionar ranking geral ou temporada' }),
  );
  await userEvent.press(screen.getByRole('button', { name: 'Temporada 1 · encerrada' }));
  expect(select).toHaveBeenLastCalledWith('season-1');
  expect(screen.getByText('Temporada 1 · encerrada')).toBeOnTheScreen();
  await userEvent.press(
    screen.getByRole('button', { name: 'Selecionar ranking geral ou temporada' }),
  );
  await userEvent.press(screen.getByRole('button', { name: 'Geral · acumulado' }));
  expect(select).toHaveBeenLastCalledWith(null);
});
