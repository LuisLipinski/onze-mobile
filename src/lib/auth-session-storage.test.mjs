import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthSessionStorage } from './auth-session-storage.ts';

const userA = { id: 'a', email: 'a@onze.test', displayName: 'Conta A', emailVerified: false };
const userB = { id: 'b', email: 'b@onze.test', displayName: 'Conta B', emailVerified: false };
const refreshA = 'a'.repeat(43);
const refreshB = 'b'.repeat(43);
const BIO = 'onze.biometricCredential.v2';

function setup() {
  const values = new Map();
  const hooks = { write: null, remove: null };
  const storage = createAuthSessionStorage({
    read: async (key) => values.get(key) ?? null,
    write: async (key, value) => {
      await hooks.write?.(key, value);
      values.set(key, value);
    },
    remove: async (key) => {
      await hooks.remove?.(key);
      values.delete(key);
    },
  });
  return { storage, values, hooks };
}

async function enabled() {
  const value = setup();
  await value.storage.saveSession('access-a', userA, refreshA);
  await value.storage.enableBiometricLogin();
  return value;
}

test('ativação reserva a renovação para a biometria e mantém a sessão atual', async () => {
  const { storage } = await enabled();
  assert.equal(await storage.getAccessToken(), 'access-a');
  assert.equal(await storage.getRefreshToken(), null);
  assert.equal((await storage.getBiometricCredential()).refreshToken, refreshA);
  assert.equal((await storage.getBiometricCredential()).accessToken, undefined);
  assert.deepEqual(await storage.getBiometricAccount(), {
    email: userA.email,
    displayName: userA.displayName,
    userId: 'a',
    ready: true,
  });
});

test('sair encerra a sessão ativa e preserva a conta biométrica lembrada', async () => {
  const { storage } = await enabled();
  await storage.clearSession();
  assert.equal(await storage.getAccessToken(), null);
  assert.equal(await storage.getStoredCurrentUser(), null);
  assert.equal((await storage.getBiometricCredential()).refreshToken, refreshA);
});

test('restauração da mesma conta preserva renovação; outra conta não herda o segredo', async () => {
  const { storage } = setup();
  await storage.saveSession('access-a', userA, refreshA);
  await storage.saveSession('access-a', userA);
  assert.equal(await storage.getRefreshToken(), refreshA);
  await storage.saveSession('access-b', userB);
  assert.equal(await storage.getRefreshToken(), null);
});

test('senha de outra conta não substitui a conta vinculada à digital', async () => {
  const { storage } = await enabled();
  await storage.saveSession('access-b', userB, refreshB);
  assert.equal(
    await storage.refreshBiometricCredentialAfterPassword('access-b', userB, refreshB),
    null,
  );
  assert.equal((await storage.getBiometricCredential()).email, userA.email);
  assert.equal((await storage.getBiometricCredential()).refreshToken, refreshA);
  assert.equal(await storage.getRefreshToken(), refreshB);
});

test('senha da mesma conta atualiza a renovação sem exigir nova ativação', async () => {
  const { storage } = await enabled();
  await storage.saveSession('new-access-a', userA, refreshB);
  await storage.refreshBiometricCredentialAfterPassword('new-access-a', userA, refreshB);
  assert.equal((await storage.getBiometricCredential()).refreshToken, refreshB);
  assert.equal(await storage.getRefreshToken(), null);
});

test('credencial revogada preserva a preferência e volta após login com senha', async () => {
  const { storage } = await enabled();
  const previous = await storage.getBiometricCredential();
  await storage.invalidateBiometricCredential(previous);
  assert.equal(await storage.getBiometricCredential(), null);
  assert.equal((await storage.getBiometricAccount()).ready, false);
  await storage.saveSession('new-access', userA, refreshB);
  await storage.refreshBiometricCredentialAfterPassword('new-access', userA, refreshB);
  assert.equal((await storage.getBiometricAccount()).ready, true);
  assert.equal((await storage.getBiometricCredential()).refreshToken, refreshB);
});

test('desativação impede retorno de chaves antigas mesmo com falha na limpeza', async () => {
  const { storage, values, hooks } = await enabled();
  values.set('onze.biometricLoginEnabled', '1');
  values.set('onze.biometricLoginReady', '1');
  values.set('onze.biometricAccessToken', 'old-access');
  values.set('onze.biometricAccountEmail', userA.email);
  hooks.remove = async () => {
    throw new Error('native cleanup failed');
  };
  await storage.disableBiometricLogin();
  assert.equal(await storage.getBiometricCredential(), null);
  assert.equal(await storage.getBiometricAccount(), null);
  assert.equal(values.get(BIO), 'disabled');
});

test('instalação anterior migra para renovação sem copiar a conta ativa diferente', async () => {
  const { storage, values } = setup();
  for (const [key, value] of [
    ['onze.biometricLoginEnabled', '1'],
    ['onze.biometricLoginReady', '1'],
    ['onze.biometricAccessToken', 'legacy-a'],
    ['onze.biometricAccountEmail', userA.email],
    ['onze.biometricAccountName', userA.displayName],
  ])
    values.set(key, value);
  await storage.saveSession('access-b', userB, refreshB);
  const previous = await storage.getBiometricCredential();
  assert.equal(previous.accessToken, 'legacy-a');
  assert.equal(previous.email, userA.email);
  await storage.saveRenewedBiometricCredential(previous, refreshA, userA);
  assert.equal((await storage.getBiometricCredential()).refreshToken, refreshA);
  assert.equal(values.has('onze.biometricAccessToken'), false);
});

test('formato global mais antigo fixa a conta antes da troca de usuário', async () => {
  const { storage, values } = setup();
  await storage.saveSession('legacy-a', userA);
  values.set('onze.biometricLoginEnabled', '1');
  values.set('onze.biometricLoginReady', '1');
  assert.equal((await storage.getBiometricCredential()).email, userA.email);
  await storage.saveSession('access-b', userB, refreshB);
  await storage.refreshBiometricCredentialAfterPassword('access-b', userB, refreshB);
  assert.equal((await storage.getBiometricCredential()).accessToken, 'legacy-a');
});

test('falha ao gravar a rotação mantém o segredo anterior e libera a fila', async () => {
  const { storage, hooks } = await enabled();
  const previous = await storage.getBiometricCredential();
  hooks.write = async (key) => {
    if (key === BIO) throw new Error('write failed');
  };
  await assert.rejects(
    storage.saveRenewedBiometricCredential(previous, refreshB, userA),
    /write failed/,
  );
  assert.equal((await storage.getBiometricCredential()).refreshToken, refreshA);
  hooks.write = null;
  await storage.disableBiometricLogin();
  assert.equal(await storage.getBiometricCredential(), null);
});

test('desativação concorrente termina desativada após a rotação em andamento', async () => {
  const { storage, hooks } = await enabled();
  const previous = await storage.getBiometricCredential();
  let release;
  let writing;
  const started = new Promise((resolve) => {
    writing = resolve;
  });
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  hooks.write = async (key, value) => {
    if (key === BIO && value !== 'disabled') {
      writing();
      await barrier;
    }
  };
  const rotation = storage.saveRenewedBiometricCredential(previous, refreshB, userA);
  await started;
  const disable = storage.disableBiometricLogin();
  release();
  await Promise.all([rotation, disable]);
  assert.equal(await storage.getBiometricCredential(), null);
  await assert.rejects(
    storage.saveRenewedBiometricCredential(previous, refreshA, userA),
    /vínculo/,
  );
});

test('resposta de outra conta ou rotação atrasada não altera vínculo atual', async () => {
  const { storage } = await enabled();
  const previous = await storage.getBiometricCredential();
  await assert.rejects(
    storage.saveRenewedBiometricCredential(previous, refreshB, userB),
    /vínculo/,
  );
  await storage.saveRenewedBiometricCredential(previous, refreshB, userA);
  await assert.rejects(
    storage.saveRenewedBiometricCredential(previous, refreshA, userA),
    /vínculo/,
  );
  await storage.invalidateBiometricCredential(previous);
  assert.equal((await storage.getBiometricCredential()).refreshToken, refreshB);
});

test('gravação incompleta da sessão remove credenciais ativas e preserva vínculo', async () => {
  const { storage, hooks } = await enabled();
  hooks.write = async (key) => {
    if (key === 'onze.currentUser') throw new Error('user write failed');
  };
  await assert.rejects(storage.saveSession('new-access', userB, refreshB), /user write failed/);
  assert.equal(await storage.getAccessToken(), null);
  assert.equal(await storage.getStoredCurrentUser(), null);
  assert.equal(await storage.getRefreshToken(), null);
  assert.equal((await storage.getBiometricCredential()).email, userA.email);
});

test('metadados corrompidos não recuperam um vínculo legado nem aceitam conta vazia', async () => {
  const { storage, values } = setup();
  values.set(BIO, '{invalid-json');
  values.set('onze.biometricLoginEnabled', '1');
  values.set('onze.biometricLoginReady', '1');
  values.set('onze.biometricAccessToken', 'legacy');
  values.set('onze.biometricAccountEmail', userA.email);
  assert.equal(await storage.getBiometricCredential(), null);
  assert.equal(await storage.isBiometricLoginEnabledFor(''), false);
});
