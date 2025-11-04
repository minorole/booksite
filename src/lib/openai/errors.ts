import { logOperation } from './logging';
import type { ContextMetadata } from './types';

export class OpenAIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly context?: ContextMetadata,
  ) {
    super(message);
    this.name = 'OpenAIError';
    logOperation('ERROR', { code, status, context }, this);
  }
}
