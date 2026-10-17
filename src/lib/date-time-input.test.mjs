import assert from 'node:assert/strict';
import test from 'node:test';

import { pickerDateFromInput, pickerInputValue } from './date-format.ts';

test('datas do seletor preservam o dia escolhido sem converter para UTC', () => {
  const date = pickerDateFromInput('29/02/2028', 'date', new Date(2026, 0, 31, 23, 59));
  assert.equal(date.getFullYear(), 2028);
  assert.equal(date.getMonth(), 1);
  assert.equal(date.getDate(), 29);
  assert.equal(pickerInputValue(date, 'date'), '29/02/2028');
});

test('meia-noite e último minuto mantêm o horário local escolhido', () => {
  for (const value of ['00:00', '09:05', '23:59']) {
    assert.equal(pickerInputValue(pickerDateFromInput(value, 'time'), 'time'), value);
  }
});

test('valor vazio ou inválido usa uma referência válida sem modificá-la', () => {
  const reference = new Date(2026, 9, 24, 18, 42, 19);
  const original = reference.getTime();
  assert.equal(pickerInputValue(pickerDateFromInput('', 'date', reference), 'date'), '24/10/2026');
  assert.equal(pickerInputValue(pickerDateFromInput('31/02/2026', 'date', reference), 'date'), '24/10/2026');
  assert.equal(pickerInputValue(pickerDateFromInput('25:70', 'time', reference), 'time'), '18:42');
  assert.equal(reference.getTime(), original);
});
