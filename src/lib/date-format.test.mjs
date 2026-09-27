import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dateTimeInputParts,
  formatDateInput,
  formatDateTime,
  formatLongDateTime,
  formatShortDate,
  formatTime,
  formatTimeInput,
  parseBrazilianDate,
  parseTime,
} from './date-format.ts';

const TIME_ZONE = 'America/Sao_Paulo';
const DATE_TIME = '2026-09-24T22:00:00Z';

test('formata datas de partida em pt-BR usando o fuso informado', () => {
  assert.equal(formatShortDate(DATE_TIME, TIME_ZONE), '24/09/2026');
  assert.equal(formatTime(DATE_TIME, TIME_ZONE), '19:00');
  assert.match(formatDateTime(DATE_TIME, TIME_ZONE), /24\/09\/2026.*19:00/);
  assert.match(formatLongDateTime(DATE_TIME, TIME_ZONE), /quinta-feira.*24 de setembro de 2026.*19:00/i);
  assert.deepEqual(dateTimeInputParts(DATE_TIME, TIME_ZONE), {
    date: '24/09/2026',
    time: '19:00',
  });
});

test('valida e normaliza entradas brasileiras de data e hora', () => {
  assert.equal(parseBrazilianDate('24/09/2026'), '2026-09-24');
  assert.equal(parseBrazilianDate('31/02/2026'), null);
  assert.equal(parseTime('7:05'), '07:05:00');
  assert.equal(parseTime('24:00'), null);
  assert.equal(formatDateInput('24092026'), '24/09/2026');
  assert.equal(formatTimeInput('1900'), '19:00');
});
