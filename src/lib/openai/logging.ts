import { debugLogsEnabled } from '@/lib/observability/toggle'

export function logOperation(operation: string, details: Record<string, unknown>, error?: Error) {
  const logEntry = {
    operation,
    timestamp: new Date().toISOString(),
    ...details,
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }),
  }
  const shouldLog = debugLogsEnabled()
  const isError = operation.toUpperCase().includes('ERROR') || !!error
  if (isError) {
    console.error(`[OpenAI ${operation}]`, logEntry)
  } else if (shouldLog) {
    console.log(`[OpenAI ${operation}]`, logEntry)
  }
  return logEntry
}
