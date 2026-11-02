import React from 'react';
import CreateGroupScreen from '../../app/create-group';
import GroupAdminPermissionsScreen from '../../app/group-admin-permissions';
import { saveSession, getAccessToken } from '../../src/lib/auth-storage';
import { renderApp, screen, userEvent, fireEvent, waitFor } from '../support/render';
import { user, group, member } from '../support/fixtures';
import { navigation, route } from '../support/router';
import { respond, fetchMock } from '../support/network';
beforeEach(async () => {
  await saveSession('access', user);
});
test('criação exige nome antes de enviar e preserva a descrição', async () => {
  respond('/api/groups', group({ role: 'PRIMARY_ADMIN' }));
  await renderApp(<CreateGroupScreen />);
  await userEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  expect(screen.getByText('Digite o nome do grupo/time.')).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
  await userEvent.type(screen.getByPlaceholderText('Ex.: Pelada de Quinta'), 'Time da Vila');
  await userEvent.type(
    screen.getByPlaceholderText('Conte um pouco sobre o grupo...'),
    '  Toda segunda  ',
  );
  await userEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledWith({
      pathname: '/create-group-details',
      params: { groupId: 'group-1', groupName: 'Time da Vila' },
    }),
  );
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
    name: 'Time da Vila',
    description: 'Toda segunda',
  });
});
test('erro ao criar permite tentar novamente sem perder o nome', async () => {
  respond('/api/groups', { message: 'Não foi possível criar o grupo.' }, 503);
  respond('/api/groups', group());
  await renderApp(<CreateGroupScreen />);
  await userEvent.type(screen.getByPlaceholderText('Ex.: Pelada de Quinta'), 'Time da Vila');
  await userEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  expect(await screen.findByText('Não foi possível criar o grupo.')).toBeOnTheScreen();
  expect(screen.getByPlaceholderText('Ex.: Pelada de Quinta')).toHaveDisplayValue('Time da Vila');
  await userEvent.press(screen.getByRole('button', { name: 'Continuar' }));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalled());
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
const membersPath = '/api/groups/group-1/members';
const target = () =>
  member({
    role: 'ADMIN',
    membershipId: 'target',
    userId: 'user-2',
    displayName: 'Bruno',
    permissions: ['ADD_MEMBERS'],
  });
function adminRoute() {
  route.params = { groupId: 'group-1', membershipId: 'target', groupName: 'Time da Vila' };
}
test('somente administrador principal recebe controles para delegar funções', async () => {
  adminRoute();
  respond(membersPath, [member({ currentUser: true, role: 'ADMIN' }), target()], 200, 'GET');
  await renderApp(<GroupAdminPermissionsScreen />);
  expect(
    await screen.findByText(
      'Somente o Administrador Principal pode editar as funções de outros administradores.',
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Salvar permissões' })).toBeNull();
});
test('administrador removido ou rebaixado não recebe formulário de delegação', async () => {
  adminRoute();
  respond(
    membersPath,
    [member({ currentUser: true, role: 'PRIMARY_ADMIN' }), { ...target(), role: 'MEMBER' }],
    200,
    'GET',
  );
  await renderApp(<GroupAdminPermissionsScreen />);
  expect(
    await screen.findByText('Este administrador não está mais disponível para edição.'),
  ).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Salvar permissões' })).toBeNull();
});
test('delegação envia apenas as funções escolhidas e informa conclusão', async () => {
  adminRoute();
  respond(
    membersPath,
    [member({ currentUser: true, role: 'PRIMARY_ADMIN' }), target()],
    200,
    'GET',
  );
  respond(
    `${membersPath}/target/permissions`,
    { ...target(), permissions: ['MANAGE_PAYMENTS'] },
    200,
    'PUT',
  );
  await renderApp(<GroupAdminPermissionsScreen />);
  const addMembers = await screen.findByLabelText('Adicionar membros');
  await fireEvent(addMembers, 'valueChange', false);
  await fireEvent(screen.getByLabelText('Gerenciar finanças'), 'valueChange', true);
  await userEvent.press(screen.getByRole('button', { name: 'Salvar permissões' }));
  expect(
    await screen.findByText(
      'Permissões atualizadas. As novas regras já estão valendo para este administrador.',
    ),
  ).toBeOnTheScreen();
  expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
    permissions: ['MANAGE_PAYMENTS'],
  });
});
test('resposta 401 ao carregar delegação limpa sessão e abre login', async () => {
  adminRoute();
  respond(membersPath, {}, 401, 'GET');
  await renderApp(<GroupAdminPermissionsScreen />);
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/'));
  expect(await getAccessToken()).toBeNull();
});
test('erro ao carregar administrador permite recuperar a consulta', async () => {
  adminRoute();
  respond(membersPath, { message: 'Falha temporária.' }, 503, 'GET');
  respond(
    membersPath,
    [member({ currentUser: true, role: 'PRIMARY_ADMIN' }), target()],
    200,
    'GET',
  );
  await renderApp(<GroupAdminPermissionsScreen />);
  expect(await screen.findByText('Falha temporária.')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByRole('button', { name: 'Salvar permissões' })).toBeOnTheScreen();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
