import assert from 'node:assert/strict';
import test from 'node:test';

import {
  beginGlobalLoading,
  getGlobalLoadingSnapshot,
  resetGlobalLoadingForTests,
  subscribeToGlobalLoading,
  withGlobalLoading,
} from './global-loading.ts';

test('mantém o overlay visível enquanto houver operações simultâneas', () => {
  resetGlobalLoadingForTests();

  const finishFirst = beginGlobalLoading({ title: 'Primeira operação' });
  const finishSecond = beginGlobalLoading({ title: 'Segunda operação' });

  assert.equal(getGlobalLoadingSnapshot().visible, true);
  assert.equal(getGlobalLoadingSnapshot().operationCount, 2);
  assert.equal(getGlobalLoadingSnapshot().title, 'Segunda operação');

  finishSecond();

  assert.equal(getGlobalLoadingSnapshot().visible, true);
  assert.equal(getGlobalLoadingSnapshot().operationCount, 1);
  assert.equal(getGlobalLoadingSnapshot().title, 'Primeira operação');

  finishFirst();

  assert.equal(getGlobalLoadingSnapshot().visible, false);
  assert.equal(getGlobalLoadingSnapshot().operationCount, 0);
});

test('a finalização é idempotente e notifica os assinantes', () => {
  resetGlobalLoadingForTests();
  let notifications = 0;
  const unsubscribe = subscribeToGlobalLoading(() => notifications++);
  const finish = beginGlobalLoading();

  finish();
  finish();
  unsubscribe();

  assert.equal(notifications, 2);
  assert.equal(getGlobalLoadingSnapshot().visible, false);
});

test('uma operação antiga pode terminar sem esconder a mais recente', () => {
  resetGlobalLoadingForTests();

  const finishFirst = beginGlobalLoading({ title: 'Primeira operação' });
  const finishSecond = beginGlobalLoading({ title: 'Segunda operação' });

  finishFirst();

  assert.equal(getGlobalLoadingSnapshot().visible, true);
  assert.equal(getGlobalLoadingSnapshot().operationCount, 1);
  assert.equal(getGlobalLoadingSnapshot().title, 'Segunda operação');

  finishSecond();
  assert.equal(getGlobalLoadingSnapshot().visible, false);
});

test('withGlobalLoading devolve o resultado e encerra após sucesso', async () => {
  resetGlobalLoadingForTests();

  const result = await withGlobalLoading(async () => 'concluído', { title: 'Operação válida' });

  assert.equal(result, 'concluído');
  assert.equal(getGlobalLoadingSnapshot().visible, false);
  assert.equal(getGlobalLoadingSnapshot().operationCount, 0);
});

test('withGlobalLoading sempre encerra o loading após erro', async () => {
  resetGlobalLoadingForTests();

  await assert.rejects(
    withGlobalLoading(
      async () => {
        throw new Error('falha esperada');
      },
      { title: 'Operação com erro' },
    ),
    /falha esperada/,
  );

  assert.equal(getGlobalLoadingSnapshot().visible, false);
  assert.equal(getGlobalLoadingSnapshot().operationCount, 0);
});
