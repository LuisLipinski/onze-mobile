import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONNECTION_ERROR_MESSAGE,
  getErrorMessage,
  isNetworkError,
} from './errors.ts';

test('traduz erros técnicos comuns de rede', () => {
  for (const message of ['Network request failed', 'Failed to fetch', 'Load failed']) {
    const error = new Error(message);
    assert.equal(isNetworkError(error), true);
    assert.equal(getErrorMessage(error, 'Falha genérica.'), CONNECTION_ERROR_MESSAGE);
  }
});

test('preserva mensagens úteis e usa fallback para valores desconhecidos', () => {
  assert.equal(getErrorMessage(new Error('Convite expirado.'), 'Falha genérica.'), 'Convite expirado.');
  assert.equal(getErrorMessage(null, 'Falha genérica.'), 'Falha genérica.');
  assert.equal(getErrorMessage(new Error('   '), 'Falha genérica.'), 'Falha genérica.');
});
