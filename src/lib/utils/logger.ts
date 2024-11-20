type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: any;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private isProduction = process.env.NODE_ENV === 'production';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(entry: LogEntry): string {
    const base = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
    const context = entry.context ? `\nContext: ${JSON.stringify(entry.context, null, 2)}` : '';
    const error = entry.error ? `\nError: ${entry.error.message}\nStack: ${entry.error.stack}` : '';
    return `${base}${context}${error}`;
  }

  private log(level: LogLevel, message: string, context?: any, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error
    };

    if (this.isProduction) {
      // In production, we might want to send logs to a service
      // TODO: Implement production logging service
      console.log(JSON.stringify(entry));
    } else {
      // In development, format for readability
      console.log(this.formatMessage(entry));
    }
  }

  debug(message: string, context?: any) {
    if (!this.isProduction) {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: any) {
    this.log('info', message, context);
  }

  warn(message: string, context?: any, error?: Error) {
    this.log('warn', message, context, error);
  }

  error(message: string, context?: any, error?: Error) {
    this.log('error', message, context, error);
  }
}

export const logger = Logger.getInstance(); 