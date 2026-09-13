export type GlobalLoadingOptions = {
  title?: string;
  message?: string;
  slowMessage?: string;
};

export type GlobalLoadingSnapshot = {
  visible: boolean;
  title: string;
  message: string;
  slowMessage: string;
  startedAt: number | null;
  operationCount: number;
};

type LoadingOperation = Required<GlobalLoadingOptions> & {
  id: number;
  startedAt: number;
};

const DEFAULT_TITLE = 'Processando...';
const DEFAULT_MESSAGE = 'Aguarde enquanto o Onze conclui esta operação.';
const DEFAULT_SLOW_MESSAGE = 'O servidor está demorando um pouco mais. Não é necessário tocar novamente.';

const listeners = new Set<() => void>();
const operations = new Map<number, LoadingOperation>();
let nextOperationId = 1;
let snapshot: GlobalLoadingSnapshot = createIdleSnapshot();

function createIdleSnapshot(): GlobalLoadingSnapshot {
  return {
    visible: false,
    title: DEFAULT_TITLE,
    message: DEFAULT_MESSAGE,
    slowMessage: DEFAULT_SLOW_MESSAGE,
    startedAt: null,
    operationCount: 0,
  };
}

function publishSnapshot() {
  const activeOperations = [...operations.values()];
  const current = activeOperations.at(-1);

  snapshot = current
    ? {
        visible: true,
        title: current.title,
        message: current.message,
        slowMessage: current.slowMessage,
        startedAt: current.startedAt,
        operationCount: activeOperations.length,
      }
    : createIdleSnapshot();

  listeners.forEach((listener) => listener());
}

export function beginGlobalLoading(options: GlobalLoadingOptions = {}) {
  const id = nextOperationId++;
  let active = true;

  operations.set(id, {
    id,
    title: options.title?.trim() || DEFAULT_TITLE,
    message: options.message?.trim() || DEFAULT_MESSAGE,
    slowMessage: options.slowMessage?.trim() || DEFAULT_SLOW_MESSAGE,
    startedAt: Date.now(),
  });
  publishSnapshot();

  return () => {
    if (!active) return;
    active = false;
    operations.delete(id);
    publishSnapshot();
  };
}

export async function withGlobalLoading<T>(
  operation: () => Promise<T>,
  options: GlobalLoadingOptions = {},
) {
  const finish = beginGlobalLoading(options);
  try {
    return await operation();
  } finally {
    finish();
  }
}

export function subscribeToGlobalLoading(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGlobalLoadingSnapshot() {
  return snapshot;
}

export function resetGlobalLoadingForTests() {
  operations.clear();
  nextOperationId = 1;
  publishSnapshot();
}
