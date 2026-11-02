import React from 'react';
import { AppButton } from '../../src/components/app-button';
import { ConfirmActionModal } from '../../src/components/confirm-action-modal';
import { renderApp, screen, userEvent } from '../support/render';

test('botão real dispara a ação e respeita o estado desabilitado', async () => {
  const press = jest.fn();
  const ui = await renderApp(<AppButton onPress={press}>Confirmar</AppButton>);
  await userEvent.press(screen.getByRole('button', { name: 'Confirmar' }));
  expect(press).toHaveBeenCalledTimes(1);
  await ui.rerender(
    <AppButton onPress={press} disabled>
      Confirmar
    </AppButton>,
  );
  expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Confirmar' }));
  expect(press).toHaveBeenCalledTimes(1);
});

test('confirmação destrutiva exige a ação explícita do usuário', async () => {
  const confirm = jest.fn();
  const cancel = jest.fn();
  await renderApp(
    <ConfirmActionModal
      visible
      title="Excluir grupo?"
      message="Os dados serão removidos."
      confirmLabel="Excluir"
      destructive
      onCancel={cancel}
      onConfirm={confirm}
    />,
  );
  expect(screen.getByText('Os dados serão removidos.')).toBeOnTheScreen();
  expect(confirm).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('button', { name: 'Excluir' }));
  expect(confirm).toHaveBeenCalledTimes(1);
});

test('confirmação em andamento desabilita as ações', async () => {
  const confirm = jest.fn();
  const cancel = jest.fn();
  await renderApp(
    <ConfirmActionModal
      visible
      title="Excluir grupo?"
      message="Confirme."
      confirmLabel="Excluir"
      loading
      loadingLabel="Excluindo..."
      onCancel={cancel}
      onConfirm={confirm}
    />,
  );
  expect(screen.getByRole('button', { name: 'Excluindo...' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Excluindo...' }));
  await userEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
  expect(confirm).not.toHaveBeenCalled();
  expect(cancel).not.toHaveBeenCalled();
});

test('confirmação informativa permite voltar sem oferecer cancelamento', async () => {
  const confirm = jest.fn();
  await renderApp(
    <ConfirmActionModal
      visible
      title="Concluído"
      message="Operação concluída."
      confirmLabel="Ok"
      confirmAsBack
      cancelLabel={null}
      onCancel={jest.fn()}
      onConfirm={confirm}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: 'Voltar' }));
  expect(confirm).toHaveBeenCalledTimes(1);
});

test('modal fechado não expõe confirmação', async () => {
  await renderApp(
    <ConfirmActionModal
      visible={false}
      title="Não visível"
      message="Mensagem"
      confirmLabel="Excluir"
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
    />,
  );
  expect(screen.queryByText('Não visível')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull();
});
