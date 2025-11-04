import { AsyncLocalStorage } from 'node:async_hooks';

type RequestContext = {
  id?: string;
  caches: {
    urlValidation: Map<string, Promise<boolean>>;
    toolCalls: Set<string>;
  };
};

const storage = new AsyncLocalStorage<RequestContext>();

export async function withRequestContext<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const ctx: RequestContext = { id, caches: { urlValidation: new Map(), toolCalls: new Set() } };
  return await new Promise<T>((resolve, reject) => {
    storage.run(ctx, () => {
      Promise.resolve().then(fn).then(resolve, reject);
    });
  });
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.id;
}

export function getUrlValidationCache(): Map<string, Promise<boolean>> | undefined {
  return storage.getStore()?.caches.urlValidation;
}

export function getToolCallsCache(): Set<string> | undefined {
  return storage.getStore()?.caches.toolCalls;
}
