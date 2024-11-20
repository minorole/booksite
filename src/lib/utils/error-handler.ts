type ErrorType = 
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'AI_ERROR'
  | 'AUTH_ERROR'
  | 'UPLOAD_ERROR'
  | 'COMMAND_ERROR';

interface ErrorDetails {
  type: ErrorType;
  message: string;
  originalError?: any;
  context?: any;
}

export class AppError extends Error {
  type: ErrorType;
  context?: any;
  originalError?: any;

  constructor({ type, message, originalError, context }: ErrorDetails) {
    super(message);
    this.type = type;
    this.context = context;
    this.originalError = originalError;
    this.name = 'AppError';
  }

  static isAppError(error: any): error is AppError {
    return error instanceof AppError;
  }
}

export function handleError(error: unknown, context?: any): AppError {
  if (AppError.isAppError(error)) {
    return error;
  }

  // Handle Prisma errors
  if (error?.constructor?.name === 'PrismaClientKnownRequestError') {
    return new AppError({
      type: 'DATABASE_ERROR',
      message: 'Database operation failed',
      originalError: error,
      context
    });
  }

  // Handle OpenAI errors
  if (error?.constructor?.name === 'OpenAIError') {
    return new AppError({
      type: 'AI_ERROR',
      message: 'AI service error',
      originalError: error,
      context
    });
  }

  // Handle validation errors
  if (error instanceof TypeError || error instanceof RangeError) {
    return new AppError({
      type: 'VALIDATION_ERROR',
      message: error.message,
      originalError: error,
      context
    });
  }

  // Default error
  return new AppError({
    type: 'COMMAND_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error occurred',
    originalError: error,
    context
  });
} 