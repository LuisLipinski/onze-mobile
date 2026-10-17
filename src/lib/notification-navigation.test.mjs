import assert from 'node:assert/strict';
import test from 'node:test';

import { matchNotificationDestination } from './notification-navigation.ts';

test('abre notificações do jogo diretamente na tela ao vivo', () => {
  assert.deepEqual(
    matchNotificationDestination({ route: '/live-match', matchId: 'match-1' }),
    { pathname: '/live-match', matchId: 'match-1' },
  );
});

test('mantém notificações comuns na tela normal do jogo', () => {
  assert.deepEqual(
    matchNotificationDestination({ route: '/match', matchId: 'match-1' }),
    { pathname: '/match', matchId: 'match-1' },
  );
  assert.equal(matchNotificationDestination({ route: '/live-match' }), null);
});

test('aviso de grupo excluído abre grupos sem tentar carregar o grupo removido', () => {
  assert.deepEqual(
    matchNotificationDestination({ route: '/groups', notificationType: 'GROUP_DELETED', groupId: 'removed' }),
    { pathname: '/groups' },
  );
  assert.equal(matchNotificationDestination({ route: '/groups', notificationType: 'UNKNOWN' }), null);
});

test('promoção e decisões da lista de espera abrem a partida correspondente', () => {
  for (const notificationType of ['WAITLIST_PROMOTED', 'WAITLIST_GOALKEEPER_DECISION', 'WAITLIST_GUEST_DECISION']) {
    assert.deepEqual(matchNotificationDestination({ notificationType, route: '/match', matchId: 'fila-1' }),
      { pathname: '/match', matchId: 'fila-1' });
  }
});
