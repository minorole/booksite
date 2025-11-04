import { log } from '@/lib/logging';
import { maybeSendAlert } from '@/lib/alerts';

export function logOperation(operation: string, details: Record<string, unknown>, error?: Error) {
  const entry = {
    operation,
    ...details,
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }),
  };
  const evt = operation.toLowerCase();
  if (operation.toUpperCase().includes('ERROR') || !!error) {
    log.error('openai', evt, entry);
    // Alert on critical OpenAI errors (deduped)
    void maybeSendAlert('openai', evt, entry as Record<string, unknown>);
  } else {
    log.info('openai', evt, entry);
  }
  return entry;
}
