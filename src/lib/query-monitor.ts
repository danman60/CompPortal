/**
 * Query Performance Monitoring
 * Tracks and analyzes database query performance
 */

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  model?: string;
  operation?: string;
}

export interface SlowQueryReport {
  query: string;
  avgDuration: number;
  count: number;
  maxDuration: number;
  minDuration: number;
}

// In-memory storage for query metrics (use Redis in production)
const queryMetrics: QueryMetrics[] = [];
const MAX_METRICS = 1000; // Keep last 1000 queries

/**
 * Record a query execution
 */
export function recordQuery(metrics: QueryMetrics): void {
  queryMetrics.push(metrics);

  // Keep only recent metrics
  if (queryMetrics.length > MAX_METRICS) {
    queryMetrics.shift();
  }

  // Log slow queries (> 1000ms)
  if (metrics.duration > 1000) {
    console.warn(`[SLOW QUERY] ${metrics.duration}ms - ${metrics.model}.${metrics.operation}`);
  }
}

/**
 * Get slow queries report
 */
export function getSlowQueries(thresholdMs: number = 100): SlowQueryReport[] {
  const slowQueries = queryMetrics.filter(m => m.duration > thresholdMs);

  // Group by query
  const grouped = new Map<string, number[]>();

  for (const metric of slowQueries) {
    const key = `${metric.model}.${metric.operation}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(metric.duration);
  }

  // Calculate statistics
  const reports: SlowQueryReport[] = [];

  for (const [query, durations] of grouped.entries()) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    reports.push({
      query,
      avgDuration,
      count: durations.length,
      maxDuration,
      minDuration,
    });
  }

  // Sort by average duration (slowest first)
  return reports.sort((a, b) => b.avgDuration - a.avgDuration);
}

/**
 * Get query performance summary
 */
export function getQuerySummary() {
  if (queryMetrics.length === 0) {
    return {
      totalQueries: 0,
      avgDuration: 0,
      slowQueries: 0,
      fastestQuery: 0,
      slowestQuery: 0,
    };
  }

  const durations = queryMetrics.map(m => m.duration);
  const totalDuration = durations.reduce((a, b) => a + b, 0);
  const avgDuration = totalDuration / durations.length;
  const slowQueries = queryMetrics.filter(m => m.duration > 100).length;
  const fastestQuery = Math.min(...durations);
  const slowestQuery = Math.max(...durations);

  return {
    totalQueries: queryMetrics.length,
    avgDuration: Math.round(avgDuration * 100) / 100,
    slowQueries,
    fastestQuery: Math.round(fastestQuery * 100) / 100,
    slowestQuery: Math.round(slowestQuery * 100) / 100,
    percentSlow: Math.round((slowQueries / queryMetrics.length) * 100),
  };
}

/**
 * Clear metrics (for testing or reset)
 */
export function clearMetrics(): void {
  queryMetrics.length = 0;
}

/**
 * Prisma middleware for query monitoring
 * Add to prisma client initialization:
 *
 * prisma.$use(createQueryMonitorMiddleware())
 */
export function createQueryMonitorMiddleware() {
  return async (params: any, next: any) => {
    const start = Date.now();

    try {
      const result = await next(params);
      const duration = Date.now() - start;

      recordQuery({
        query: params.action,
        duration,
        timestamp: new Date(),
        model: params.model,
        operation: params.action,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      // Record failed queries too
      recordQuery({
        query: params.action + ' (ERROR)',
        duration,
        timestamp: new Date(),
        model: params.model,
        operation: params.action,
      });

      throw error;
    }
  };
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Get query recommendations based on slow queries
 */
export function getOptimizationRecommendations(): string[] {
  const slowQueries = getSlowQueries(100);
  const recommendations: string[] = [];

  for (const query of slowQueries.slice(0, 5)) {
    // Specific recommendations based on query patterns
    if (query.query.includes('findMany') && query.avgDuration > 500) {
      recommendations.push(
        `Consider adding pagination to ${query.query} (avg: ${formatDuration(query.avgDuration)})`
      );
    }

    if (query.query.includes('count') && query.avgDuration > 300) {
      recommendations.push(
        `Consider caching count result for ${query.query} (avg: ${formatDuration(query.avgDuration)})`
      );
    }

    if (query.avgDuration > 1000) {
      recommendations.push(
        `CRITICAL: ${query.query} is very slow (avg: ${formatDuration(query.avgDuration)}). Check for missing indexes.`
      );
    }
  }

  if (recommendations.length === 0 && slowQueries.length > 0) {
    recommendations.push(
      `${slowQueries.length} queries slower than 100ms detected. Consider optimization.`
    );
  }

  return recommendations;
}

/**
 * Export metrics as JSON for analysis
 */
export function exportMetrics() {
  return {
    summary: getQuerySummary(),
    slowQueries: getSlowQueries(100),
    recommendations: getOptimizationRecommendations(),
    timestamp: new Date().toISOString(),
  };
}
