import React, { useState } from 'react';
import { PaymentSettlementModal } from '../../src/components/payment-settlement-modal';
import { ReplacementPlayerModal } from '../../src/components/replacement-player-modal';
import { GoalkeeperPlayerModal } from '../../src/components/goalkeeper-player-modal';
import { RentalGoalkeeperModal } from '../../src/components/rental-goalkeeper-modal';
import { renderApp, screen, userEvent, fireEvent } from '../support/render';
import { member, attendance } from '../support/fixtures';

test.each([
  ['Pagamento não localizado', 'NOT_RECEIVED'],
  ['Marcar como reembolsado', 'REFUNDED'],
  ['Registrar crédito para próximo jogo', 'CREDITED'],
  ['Manter pagamento', 'RETAINED'],
] as const)('acerto financeiro envia a decisão %s', async (label, resolution) => {
  const resolve = jest.fn();
  await renderApp(
    <PaymentSettlementModal
      visible
      playerName="Ana"
      reviewRequired
      settlementAvailable
      onCancel={jest.fn()}
      onResolve={resolve}
    />,
  );
  await userEvent.press(screen.getByRole('button', { name: label }));
  expect(resolve).toHaveBeenCalledWith(resolution);
});

test('acerto sem reposição bloqueia crédito/reembolso, mas permite informar PIX não encontrado', async () => {
  const resolve = jest.fn();
  await renderApp(
    <PaymentSettlementModal
      visible
      playerName="Ana"
      reviewRequired
      settlementAvailable={false}
      onCancel={jest.fn()}
      onResolve={resolve}
    />,
  );
  expect(
    screen.getByText(
      'Reembolso, crédito e manutenção ficam bloqueados até esta vaga ser preenchida.',
    ),
  ).toBeOnTheScreen();
  for (const label of [
    'Marcar como reembolsado',
    'Registrar crédito para próximo jogo',
    'Manter pagamento',
  ]) {
    expect(screen.getByRole('button', { name: label })).toBeDisabled();
    await userEvent.press(screen.getByRole('button', { name: label }));
  }
  expect(resolve).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('button', { name: 'Pagamento não localizado' }));
  expect(resolve).toHaveBeenCalledWith('NOT_RECEIVED');
});

test('pagamento confirmado não oferece opção de não localizado e salva apenas uma vez enquanto ocupado', async () => {
  const resolve = jest.fn();
  await renderApp(
    <PaymentSettlementModal
      visible
      playerName="Ana"
      reviewRequired={false}
      settlementAvailable
      loading
      onCancel={jest.fn()}
      onResolve={resolve}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Pagamento não localizado' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Marcar como reembolsado' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Marcar como reembolsado' }));
  expect(resolve).not.toHaveBeenCalled();
});

test('preencher vaga exige seleção e permite readicionar o próprio jogador', async () => {
  const select = jest.fn();
  const confirm = jest.fn();
  function Form() {
    const [selected, setSelected] = useState<string | null>(null);
    return (
      <ReplacementPlayerModal
        visible
        departedName="Ana Silva"
        departedUserId="user-1"
        candidates={[member(), member({ userId: 'user-2', displayName: 'Bruno' })]}
        selectedUserId={selected}
        onSelect={(id) => {
          select(id);
          setSelected(id);
        }}
        onCancel={jest.fn()}
        onConfirm={confirm}
      />
    );
  }
  await renderApp(<Form />);
  expect(screen.getByRole('button', { name: 'Adicionar à lista' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Ana Silva · readicionar' }));
  expect(select).toHaveBeenCalledWith('user-1');
  await userEvent.press(screen.getByRole('button', { name: 'Adicionar à lista' }));
  expect(confirm).toHaveBeenCalledTimes(1);
});

test('vaga sem candidatos mostra estado vazio sem permitir confirmação', async () => {
  await renderApp(
    <ReplacementPlayerModal
      visible
      departedName="Ana"
      departedUserId="user-1"
      candidates={[]}
      selectedUserId={null}
      onSelect={jest.fn()}
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
    />,
  );
  expect(
    screen.getByText('Não há outro membro disponível para preencher esta vaga.'),
  ).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Adicionar à lista' })).toBeDisabled();
});

test('escolha de goleiro retorna o participante correto ou explica ausência', async () => {
  const candidate = attendance();
  const choose = jest.fn();
  const props = {
    visible: true,
    title: 'Escolher goleiro',
    description: 'Escolha um confirmado.',
    onSelect: choose,
    onCancel: jest.fn(),
  };
  const ui = await renderApp(<GoalkeeperPlayerModal {...props} candidates={[candidate]} />);
  await userEvent.press(screen.getByRole('button', { name: 'Ana Silva' }));
  expect(choose).toHaveBeenCalledWith(candidate);
  await ui.rerender(<GoalkeeperPlayerModal {...props} candidates={[]} />);
  expect(
    screen.getByText('Nenhum jogador confirmado está disponível para esta escolha.'),
  ).toBeOnTheScreen();
});

test('goleiro de aluguel exige nome e envia somente após preenchê-lo', async () => {
  const confirm = jest.fn();
  function Form() {
    const [name, setName] = useState('');
    return (
      <RentalGoalkeeperModal
        visible
        name={name}
        onChangeName={setName}
        onCancel={jest.fn()}
        onConfirm={confirm}
      />
    );
  }
  await renderApp(<Form />);
  expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Nome do goleiro de aluguel'), 'Carlos');
  await userEvent.press(screen.getByRole('button', { name: 'Adicionar' }));
  expect(confirm).toHaveBeenCalledTimes(1);
});

test('goleiro em envio não aceita um segundo submit pelo teclado', async () => {
  const confirm = jest.fn();
  await renderApp(
    <RentalGoalkeeperModal
      visible
      name="Carlos"
      loading
      onChangeName={jest.fn()}
      onCancel={jest.fn()}
      onConfirm={confirm}
    />,
  );
  expect(screen.getByRole('button', { name: 'Adicionando...' })).toBeDisabled();
  await fireEvent(screen.getByLabelText('Nome do goleiro de aluguel'), 'submitEditing');
  expect(confirm).not.toHaveBeenCalled();
});
