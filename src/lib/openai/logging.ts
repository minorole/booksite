import { log } from '@/lib/logging';

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
  } else {
    log.info('openai', evt, entry);
  }
  return entry;
}
