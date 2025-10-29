/**
 * Failure Tracker - Stub Implementation
 *
 * This is a minimal stub to satisfy imports. The full failure tracking
 * system is currently disabled (see failures.disabled directory).
 *
 * This stub allows the build to complete without modifying critical
 * email service infrastructure.
 */

export interface FailureLog {
  id?: string;
  operationType?: string;
  operationName?: string;
  entityType?: string;
  entityId?: string;
  type?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  context?: string;
  error: any; // Accept any error type from catch blocks
  metadata?: any;
  status?: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Stub function - logs to console in development, no-op in production
 */
export async function trackFailure(failure: Omit<FailureLog, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
  // No-op stub - failure tracking system is disabled
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Failure Tracker Stub]', failure);
  }
}
