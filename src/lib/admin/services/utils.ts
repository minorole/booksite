import { type AdminOperationResult } from '@/lib/admin/types';

/**
 * Helper function to validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generic error handler for operations that return AdminOperationResult
 */
export function handleOperationError(error: unknown, operation: string): AdminOperationResult {
  console.error(`❌ Failed to ${operation}:`, error);
  return {
    success: false,
    message: `Failed to ${operation}`,
    error: {
      code: 'database_error',
      details: error instanceof Error ? error.message : 'Unknown error',
    },
  };
}
