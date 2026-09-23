import EventSource, { EventSourceListener } from 'react-native-sse';

import {
  getLiveMatchStreamUrl,
  LiveMatchStreamEvent,
} from './api';

type LiveMatchStreamCallbacks = {
  onEvent: (event: LiveMatchStreamEvent) => void;
  onOpen?: () => void;
  onUnauthorized?: () => void;
  onError?: () => void;
};

export type LiveMatchStreamConnection = {
  close: () => void;
};

export function openLiveMatchStream(
  accessToken: string,
  matchId: string | undefined,
  callbacks: LiveMatchStreamCallbacks,
): LiveMatchStreamConnection {
  const source = new EventSource(getLiveMatchStreamUrl(matchId), {
    headers: { Authorization: `Bearer ${accessToken}` },
    pollingInterval: 5_000,
    timeout: 0,
  });

  const openListener: EventSourceListener<never, 'open'> = () => callbacks.onOpen?.();
  const messageListener: EventSourceListener<never, 'message'> = (message) => {
    if (!message.data) return;
    try {
      const event = JSON.parse(message.data) as LiveMatchStreamEvent;
      if (typeof event.matchId === 'string' && typeof event.version === 'number') {
        callbacks.onEvent(event);
      }
    } catch {
      callbacks.onError?.();
    }
  };
  const errorListener: EventSourceListener<never, 'error'> = (event) => {
    if ('xhrStatus' in event && event.xhrStatus === 401) {
      source.close();
      callbacks.onUnauthorized?.();
      return;
    }
    callbacks.onError?.();
  };

  source.addEventListener('open', openListener);
  source.addEventListener('message', messageListener);
  source.addEventListener('error', errorListener);

  return {
    close: () => {
      source.removeAllEventListeners();
      source.close();
    },
  };
}
