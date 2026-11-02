type Reply = {
  path: string;
  status: number;
  body: unknown;
  method: string;
  pending?: Promise<unknown>;
  error?: Error;
};
const replies: Reply[] = [];
const unexpected: string[] = [];
export let fetchMock: jest.SpiedFunction<typeof fetch>;

export function respond(path: string, body: unknown, status = 200, method = 'POST') {
  replies.push({ path, body, status, method });
}
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
export function pendingResponse(path: string, promise: Promise<unknown>, method = 'POST') {
  replies.push({ path, body: null, status: 200, method, pending: promise });
}
export function networkFailure(path: string, error: Error, method = 'POST') {
  replies.push({ path, body: null, status: 0, method, error });
}
export function resetNetwork() {
  replies.length = 0;
  unexpected.length = 0;
  fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = new URL(String(input)).pathname;
    const method = init?.method ?? 'GET';
    const index = replies.findIndex((reply) => reply.path === path && reply.method === method);
    if (index < 0) {
      unexpected.push(`${method} ${path}`);
      throw new Error(`Unstubbed network request: ${method} ${path}`);
    }
    const [reply] = replies.splice(index, 1);
    if (reply.error) throw reply.error;
    const body = reply.pending ? await reply.pending : reply.body;
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      json: async () => body,
    } as Response;
  });
}
export function verifyNetwork() {
  expect(unexpected).toEqual([]);
}
