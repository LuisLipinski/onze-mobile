import assert from 'node:assert/strict';
import test from 'node:test';

import { matchNotificationDestination } from './notification-navigation.ts';

test('abre notificações da partida diretamente na tela ao vivo', () => {
  assert.deepEqual(
    matchNotificationDestination({ route: '/live-match', matchId: 'match-1' }),
    { pathname: '/live-match', matchId: 'match-1' },
  );
});

test('mantém notificações comuns na tela normal da partida', () => {
  assert.deepEqual(
    matchNotificationDestination({ route: '/match', matchId: 'match-1' }),
    { pathname: '/match', matchId: 'match-1' },
  );
  assert.equal(matchNotificationDestination({ route: '/live-match' }), null);
});
