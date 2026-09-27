const PT_BR = 'pt-BR';

function asDate(value: string | number | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function formatShortDate(value: string | number | Date, timeZone: string) {
  return new Intl.DateTimeFormat(PT_BR, {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(asDate(value));
}

export function formatTime(value: string | number | Date, timeZone: string) {
  return new Intl.DateTimeFormat(PT_BR, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(asDate(value));
}

export function formatDateTime(value: string | number | Date, timeZone: string) {
  return new Intl.DateTimeFormat(PT_BR, {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(asDate(value));
}

export function formatLongDateTime(
  value: string | number | Date,
  timeZone: string,
  includeYear = true,
) {
  return new Intl.DateTimeFormat(PT_BR, {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    ...(includeYear ? { year: 'numeric' as const } : {}),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(asDate(value));
}

export function formatWeekdayShortDate(value: string | number | Date, timeZone: string) {
  return new Intl.DateTimeFormat(PT_BR, {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(asDate(value));
}

export function dateTimeInputParts(value: string | null, timeZone: string) {
  if (!value) return { date: '', time: '' };
  return {
    date: formatShortDate(value, timeZone),
    time: formatTime(value, timeZone),
  };
}

export function parseBrazilianDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
}

export function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}
