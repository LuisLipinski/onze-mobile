export const CONNECTION_ERROR_MESSAGE =
  'Não foi possível conectar. Verifique sua internet e tente novamente.';

const NETWORK_ERROR_PATTERN = /network request failed|failed to fetch|load failed|networkerror/i;

export function isNetworkError(exception: unknown) {
  return exception instanceof TypeError
    || (exception instanceof Error && NETWORK_ERROR_PATTERN.test(exception.message));
}

export function getErrorMessage(exception: unknown, fallback: string) {
  if (!(exception instanceof Error)) return fallback;
  const message = exception.message.trim();
  if (!message) return fallback;
  return NETWORK_ERROR_PATTERN.test(message) ? CONNECTION_ERROR_MESSAGE : message;
}
