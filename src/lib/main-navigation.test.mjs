import assert from 'node:assert/strict';
import test from 'node:test';

import { mainTabDestination, mainTabForPath } from './main-navigation.ts';

test('mantém as abas disponíveis nos detalhes e formulários do aplicativo', () => {
  for (const path of [
    '/group', '/group-admins', '/group-admin-permissions', '/group-settings',
    '/group-credits', '/group-statistics', '/group-invite', '/player-statistics',
    '/sports-profile', '/technical-profile', '/match', '/live-match', '/match-teams',
    '/create-group', '/create-group-details', '/create-group-invite', '/join-group',
    '/join/ABC123', '/create-match', '/add-match-guest', '/edit-match-player-config',
    '/extend-match-signup', '/dev-test-data',
  ]) {
    assert.equal(mainTabForPath(path), 'groups', path);
  }
  assert.equal(mainTabForPath('/home'), 'home');
  assert.equal(mainTabForPath('/groups'), 'groups');
  assert.equal(mainTabForPath('/settings'), 'settings');
});

test('entrada, cadastro e recuperação de senha preservam o fluxo de autenticação', () => {
  for (const path of ['/', '/register', '/forgot-password', '/reset-password']) {
    assert.equal(mainTabForPath(path), null, path);
  }
});

test('tocar na aba selecionada dentro de uma página retorna à raiz dessa aba', () => {
  for (const path of ['/group', '/live-match', '/technical-profile', '/create-match']) {
    const selectedTab = mainTabForPath(path);
    assert.equal(mainTabDestination(path, selectedTab), '/groups', path);
  }
});

test('trocar de aba em uma página interna abre o destino principal correto', () => {
  assert.equal(mainTabDestination('/live-match', 'home'), '/home');
  assert.equal(mainTabDestination('/group-settings', 'settings'), '/settings');
  assert.equal(mainTabDestination('/home', 'groups'), '/groups');
});

test('tocar novamente na página principal da aba não duplica a navegação', () => {
  for (const tab of ['home', 'groups', 'settings']) {
    assert.equal(mainTabDestination(`/${tab}`, tab), null);
  }
});
