import assert from 'node:assert/strict';
import test from 'node:test';

import { createNotificationPermission } from './notification-permission.ts';

function permissions(status, canAskAgain = true) {
  let current = { status, canAskAgain };
  let requests = 0;
  const ensure = createNotificationPermission({
    prepare: async () => {},
    read: async () => current,
    request: async () => { requests++; return current; },
  });
  return { ensure, requests: () => requests, change: (next) => { current = next; } };
}

test('permissão concedida não abre solicitação nativa', async () => {
  const permission = permissions('granted');
  assert.equal(await permission.ensure(), true);
  assert.equal(permission.requests(), 0);
});

test('respeita recusa mesmo quando Android ainda permite perguntar novamente', async () => {
  const permission = permissions('denied', true);
  for (let refresh = 0; refresh < 4; refresh++) assert.equal(await permission.ensure(), false);
  assert.equal(permission.requests(), 0);
});

test('não solicita permissão bloqueada pelo sistema', async () => {
  const permission = permissions('undetermined', false);
  assert.equal(await permission.ensure(), false);
  assert.equal(permission.requests(), 0);
});

test('entrada simultânea e retorno do AppState compartilham uma única solicitação', async () => {
  let finish;
  let requests = 0;
  const result = new Promise((resolve) => { finish = resolve; });
  const ensure = createNotificationPermission({
    prepare: async () => {},
    read: async () => ({ status: 'undetermined', canAskAgain: true }),
    request: () => { requests++; return result; },
  });
  const first = ensure();
  assert.equal(ensure(), first);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests, 1);
  assert.equal(ensure(), first);
  finish({ status: 'denied', canAskAgain: true });
  assert.equal(await first, false);
  // Even an old OS snapshot must not open another activity after the refusal.
  assert.equal(await ensure(), false);
  assert.equal(requests, 1);
});

test('aceite inicial libera notificações', async () => {
  const ensure = createNotificationPermission({
    prepare: async () => {},
    read: async () => ({ status: 'undetermined', canAskAgain: true }),
    request: async () => ({ status: 'granted', canAskAgain: true }),
  });
  assert.equal(await ensure(), true);
});

test('reconhece permissão habilitada nas configurações após recusa', async () => {
  const permission = permissions('denied', false);
  assert.equal(await permission.ensure(), false);
  permission.change({ status: 'granted', canAskAgain: true });
  assert.equal(await permission.ensure(), true);
  assert.equal(permission.requests(), 0);
});

test('erro ao abrir solicitação não provoca repetição em cada refresh', async () => {
  let requests = 0;
  const ensure = createNotificationPermission({
    prepare: async () => {},
    read: async () => ({ status: 'undetermined', canAskAgain: true }),
    request: async () => { requests++; throw new Error('OS indisponível'); },
  });
  await assert.rejects(ensure(), /OS indisponível/);
  assert.equal(await ensure(), false);
  assert.equal(requests, 1);
});

test('falha temporária de leitura libera a próxima tentativa', async () => {
  let reads = 0;
  const ensure = createNotificationPermission({
    prepare: async () => {},
    read: async () => {
      if (++reads === 1) throw new Error('leitura indisponível');
      return { status: 'granted', canAskAgain: true };
    },
    request: async () => { throw new Error('não deve solicitar'); },
  });
  await assert.rejects(ensure(), /leitura indisponível/);
  assert.equal(await ensure(), true);
});
