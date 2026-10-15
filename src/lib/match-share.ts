import type { FootballMatch } from './api';

export function matchShareMessage(
  match: Pick<FootballMatch, 'groupName' | 'startsAt' | 'timeZone' | 'venue'>,
  shareUrl: string,
) {
  const date = new Intl.DateTimeFormat('pt-BR', {
    timeZone: match.timeZone,
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(match.startsAt));
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone: match.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(match.startsAt));
  return [
    `⚽ Bora jogar com ${match.groupName}?`,
    `📅 ${date}, às ${time}`,
    `📍 ${match.venue}`,
    '',
    'Abra o convite e confirme se vai jogar no Onze:',
    shareUrl,
  ].join('\n');
}
