import assert from 'node:assert/strict';
import test from 'node:test';

import { createBiometricSignIn, BiometricSessionError } from './biometric-session.ts';

const user = { id: 'a', email: 'a@onze.test', displayName: 'Conta A', emailVerified: false };
const credential = {
  email: user.email,
  displayName: user.displayName,
  userId: user.id,
  ready: true,
  refreshToken: 'a'.repeat(43),
};
const response = {
  accessToken: 'new-access',
  tokenType: 'Bearer',
  expiresIn: 7200,
  user,
  refreshToken: 'b'.repeat(43),
  refreshExpiresIn: 2592000,
};

function setup(overrides = {}) {
  const calls = [];
  const access = {
    available: async () => true,
    authenticate: async () => {
      calls.push('fingerprint');
      return true;
    },
    read: async () => {
      calls.push('read');
      return credential;
    },
    renew: async (token) => {
      calls.push(['renew', token]);
      return response;
    },
    migrate: async (token) => {
      calls.push(['migrate', token]);
      return response;
    },
    saveCredential: async () => {
      calls.push('save-credential');
    },
    saveSession: async (token, account, refresh) => {
      calls.push(['session', token, account.id, refresh]);
    },
    invalidate: async () => {
      calls.push('invalidate');
    },
    clearSession: async (email) => {
      calls.push(['clear', email]);
    },
    revoke: async (token) => {
      calls.push(['revoke', token]);
    },
    ...overrides,
  };
  return { signIn: createBiometricSignIn(access), calls, access };
}

test('digital renova no servidor e persiste a nova credencial antes da sessão', async () => {
  const { signIn, calls } = setup();
  assert.deepEqual(await signIn(' A@ONZE.TEST '), user);
  assert.deepEqual(calls, [
    'fingerprint',
    'read',
    ['renew', credential.refreshToken],
    'save-credential',
    ['session', 'new-access', 'a', null],
  ]);
});

test('cancelar digital não lê segredo e não solicita renovação', async () => {
  const { signIn, calls } = setup({ authenticate: async () => false });
  assert.equal(await signIn(user.email), null);
  assert.deepEqual(calls, []);
});

test('hardware indisponível não solicita digital ou renovação', async () => {
  const { signIn, calls } = setup({ available: async () => false });
  await assert.rejects(
    signIn(user.email),
    (error) => error instanceof BiometricSessionError && error.reason === 'unavailable',
  );
  assert.deepEqual(calls, []);
});

test('toques simultâneos compartilham uma única confirmação e rotação', async () => {
  let release;
  let prompts = 0;
  const confirmation = new Promise((resolve) => {
    release = resolve;
  });
  const { signIn, calls } = setup({
    authenticate: async () => {
      prompts++;
      return confirmation;
    },
  });
  const first = signIn(user.email);
  assert.equal(signIn('A@ONZE.TEST'), first);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(prompts, 1);
  release(true);
  await first;
  assert.equal(calls.filter((call) => Array.isArray(call) && call[0] === 'renew').length, 1);
});

test('outra conta não compartilha a solicitação biométrica em andamento', async () => {
  let release;
  const confirmation = new Promise((resolve) => {
    release = resolve;
  });
  const { signIn } = setup({ authenticate: () => confirmation });
  const first = signIn(user.email);
  await assert.rejects(signIn('b@onze.test'), (error) => error.reason === 'account');
  release(true);
  assert.deepEqual(await first, user);
});

test('erro temporário mantém a credencial e permite tentar novamente com digital', async () => {
  let requests = 0;
  const { signIn, calls } = setup({
    renew: async () => {
      requests++;
      if (requests === 1) throw new Error('offline');
      return response;
    },
  });
  await assert.rejects(signIn(user.email), /offline/);
  assert.equal(calls.includes('invalidate'), false);
  assert.equal(
    calls.some((call) => Array.isArray(call) && call[0] === 'clear'),
    false,
  );
  assert.deepEqual(await signIn(user.email), user);
  assert.equal(requests, 2);
});

test('credencial expirada exige senha e invalida o segredo local da conta', async () => {
  const { signIn, calls } = setup({
    renew: async () => {
      throw Object.assign(new Error('expired'), { status: 401 });
    },
  });
  await assert.rejects(
    signIn(user.email),
    (error) => error.reason === 'expired' && error.requiresPassword,
  );
  assert.equal(calls.includes('invalidate'), true);
  assert.equal(
    calls.some((call) => Array.isArray(call) && call[0] === 'clear' && call[1] === user.email),
    true,
  );
  assert.equal(calls.includes('save-credential'), false);
});

test('conta solicitada diferente não invalida a conta biométrica lembrada', async () => {
  const { signIn, calls } = setup();
  await assert.rejects(signIn('b@onze.test'), (error) => error.reason === 'account');
  assert.equal(calls.includes('invalidate'), false);
  assert.equal(
    calls.some((call) => Array.isArray(call) && call[0] === 'renew'),
    false,
  );
});

test('resposta do servidor de outra conta não é ativada no aparelho', async () => {
  const { signIn, calls } = setup({
    renew: async () => ({ ...response, user: { ...user, id: 'b', email: 'b@onze.test' } }),
  });
  await assert.rejects(signIn(user.email), (error) => error.reason === 'account');
  assert.equal(calls.includes('save-credential'), false);
  assert.equal(
    calls.some((call) => Array.isArray(call) && call[0] === 'session'),
    false,
  );
  assert.equal(calls.includes('invalidate'), true);
});

test('mesmo e-mail com outro identificador não altera o vínculo', async () => {
  const { signIn, calls } = setup({
    renew: async () => ({ ...response, user: { ...user, id: 'another-id' } }),
  });
  await assert.rejects(signIn(user.email), (error) => error.reason === 'account');
  assert.equal(calls.includes('save-credential'), false);
});

test('JWT legado válido só é trocado após confirmação da digital', async () => {
  const { signIn, calls } = setup({
    read: async () => ({ ...credential, refreshToken: undefined, accessToken: 'legacy-access' }),
  });
  await signIn(user.email);
  assert.equal(calls[0], 'fingerprint');
  assert.equal(
    calls.some(
      (call) => Array.isArray(call) && call[0] === 'migrate' && call[1] === 'legacy-access',
    ),
    true,
  );
  assert.equal(
    calls.some((call) => Array.isArray(call) && call[0] === 'renew'),
    false,
  );
});

test('falha na gravação da rotação revoga o retorno e não ativa sessão parcial', async () => {
  const { signIn, calls } = setup({
    saveCredential: async () => {
      throw new Error('native write failed');
    },
  });
  await assert.rejects(signIn(user.email), (error) => error.reason === 'storage');
  assert.equal(
    calls.some(
      (call) => Array.isArray(call) && call[0] === 'revoke' && call[1] === response.refreshToken,
    ),
    true,
  );
  assert.equal(
    calls.some((call) => Array.isArray(call) && call[0] === 'session'),
    false,
  );
});

test('vínculo alterado durante renovação não é reativado nem invalidado pelo retorno antigo', async () => {
  const { signIn, calls } = setup({
    saveCredential: async () => {
      throw Object.assign(new Error('binding changed'), {
        name: 'BiometricCredentialChangedError',
      });
    },
  });
  await assert.rejects(signIn(user.email), (error) => error.reason === 'changed');
  assert.equal(calls.includes('invalidate'), false);
  assert.equal(
    calls.some((call) => Array.isArray(call) && call[0] === 'session'),
    false,
  );
});

test('falha ao salvar sessão mantém a renovação já persistida para nova tentativa', async () => {
  let saves = 0;
  let current = { ...credential };
  let serverToken = credential.refreshToken;
  const requested = [];
  const { signIn, calls } = setup({
    read: async () => current,
    renew: async (token) => {
      requested.push(token);
      assert.equal(token, serverToken, 'o segredo anterior já foi consumido no servidor');
      serverToken = requested.length === 1 ? 'b'.repeat(43) : 'c'.repeat(43);
      return { ...response, refreshToken: serverToken };
    },
    saveCredential: async (_previous, value) => {
      current = { ...credential, refreshToken: value.refreshToken };
    },
    saveSession: async () => {
      saves++;
      if (saves === 1) throw new Error('session write failed');
    },
  });
  await assert.rejects(signIn(user.email), /session write failed/);
  assert.equal(calls.includes('invalidate'), false);
  assert.deepEqual(await signIn(user.email), user);
  assert.deepEqual(requested, [credential.refreshToken, 'b'.repeat(43)]);
});
