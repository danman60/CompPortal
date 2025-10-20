/**
 * Production-grade logging utility
 * Structured logging for observability and debugging
 *
 * Features:
 * - Structured JSON logs for easy parsing
 * - Log levels (debug, info, warn, error)
 * - Request ID correlation
 * - Performance tracking
 * - Production-safe (no sensitive data)
 * - Sentry integration for error tracking
 */

import * as Sentry from '@sentry/nextjs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
      // Remove sensitive data
      ...(context?.error && {
        error: {
          message: context.error.message,
          stack: this.isDevelopment ? context.error.stack : undefined,
          name: context.error.name,
        },
      }),
    };

    return JSON.stringify(logEntry);
  }

  debug(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;
    console.debug(this.formatMessage('debug', message, context));
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    // Log to console (always)
    console.warn(this.formatMessage('warn', message, context));

    // Send to Sentry (production only) with warning level
    if (this.isProduction && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureMessage(message, {
        level: 'warning',
        tags: {
          logger: 'true',
          ...(context?.userId && { userId: context.userId }),
          ...(context?.path && { path: context.path }),
          ...(context?.method && { method: context.method }),
        },
        extra: context,
      });
    }
  }

  error(message: string, context?: LogContext): void {
    // Log to console (always)
    console.error(this.formatMessage('error', message, context));

    // Send to Sentry (production only)
    if (this.isProduction && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Capture error in Sentry with context
      if (context?.error) {
        // If error object provided, use captureException for better stack traces
        Sentry.captureException(context.error, {
          level: 'error',
          tags: {
            logger: 'true',
            ...(context.userId && { userId: context.userId }),
            ...(context.path && { path: context.path }),
            ...(context.method && { method: context.method }),
          },
          extra: {
            message,
            requestId: context.requestId,
            statusCode: context.statusCode,
            duration: context.duration,
            // Include other context (filtered by Sentry config)
            ...Object.fromEntries(
              Object.entries(context).filter(
                ([key]) => !['error', 'userId', 'path', 'method', 'requestId', 'statusCode', 'duration'].includes(key)
              )
            ),
          },
        });
      } else {
        // If no error object, use captureMessage
        Sentry.captureMessage(message, {
          level: 'error',
          tags: {
            logger: 'true',
            ...(context?.userId && { userId: context.userId }),
            ...(context?.path && { path: context.path }),
            ...(context?.method && { method: context.method }),
          },
          extra: context,
        });
      }
    }
  }

  // HTTP request logging
  http(method: string, path: string, statusCode: number, duration: number, context?: LogContext): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    this[level](`${method} ${path} ${statusCode}`, {
      method,
      path,
      statusCode,
      duration,
      ...context,
    });
  }

  // Performance tracking
  startTimer(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`Performance: ${label}`, { duration, label });
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Helper for request ID generation
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
