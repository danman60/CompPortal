/**
 * Redis Caching Layer
 * High-performance caching for frequent queries
 */

import Redis from 'ioredis';

/**
 * Redis Configuration
 */
export interface RedisConfig {
  enabled: boolean;
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  ttl: {
    competitions: number; // seconds
    studios: number;
    dancers: number;
    entries: number;
    reservations: number;
    invoices: number;
    analytics: number;
  };
}

/**
 * Get Redis configuration from environment
 */
export function getRedisConfig(): RedisConfig {
  const enabled = process.env.REDIS_ENABLED === 'true';

  return {
    enabled,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'compportal:',
    ttl: {
      competitions: parseInt(process.env.REDIS_TTL_COMPETITIONS || '300', 10), // 5 minutes
      studios: parseInt(process.env.REDIS_TTL_STUDIOS || '600', 10), // 10 minutes
      dancers: parseInt(process.env.REDIS_TTL_DANCERS || '300', 10), // 5 minutes
      entries: parseInt(process.env.REDIS_TTL_ENTRIES || '180', 10), // 3 minutes
      reservations: parseInt(process.env.REDIS_TTL_RESERVATIONS || '180', 10), // 3 minutes
      invoices: parseInt(process.env.REDIS_TTL_INVOICES || '300', 10), // 5 minutes
      analytics: parseInt(process.env.REDIS_TTL_ANALYTICS || '3600', 10), // 1 hour
    },
  };
}

/**
 * Redis client singleton
 */
let redisClient: Redis | null = null;

/**
 * Get Redis client (creates if not exists)
 */
export function getRedisClient(): Redis | null {
  const config = getRedisConfig();

  if (!config.enabled) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      keyPrefix: config.keyPrefix,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    // Error handling
    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
    });

    redisClient.on('ready', () => {
      console.log('Redis ready');
    });

    redisClient.on('close', () => {
      console.warn('Redis connection closed');
    });

    // Connect
    redisClient.connect().catch((err) => {
      console.error('Redis connection failed:', err);
      redisClient = null;
    });
  }

  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Cache key generators
 */
export const CacheKeys = {
  competition: (id: string) => `competition:${id}`,
  competitions: (tenantId: string, filters?: string) =>
    `competitions:${tenantId}${filters ? `:${filters}` : ''}`,
  studio: (id: string) => `studio:${id}`,
  studios: (tenantId: string) => `studios:${tenantId}`,
  dancer: (id: string) => `dancer:${id}`,
  dancers: (studioId: string) => `dancers:${studioId}`,
  entry: (id: string) => `entry:${id}`,
  entries: (studioId: string, competitionId?: string) =>
    `entries:${studioId}${competitionId ? `:${competitionId}` : ''}`,
  reservation: (id: string) => `reservation:${id}`,
  reservations: (studioId: string, competitionId?: string) =>
    `reservations:${studioId}${competitionId ? `:${competitionId}` : ''}`,
  invoice: (id: string) => `invoice:${id}`,
  invoices: (studioId: string, competitionId?: string) =>
    `invoices:${studioId}${competitionId ? `:${competitionId}` : ''}`,
  analytics: (type: string, tenantId: string, period: string) =>
    `analytics:${type}:${tenantId}:${period}`,
};

/**
 * Get cached value
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();

  if (!client) {
    return null;
  }

  try {
    const value = await client.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set cached value
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttl?: number
): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);

    if (ttl) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }

    return true;
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete cached value
 */
export async function cacheDelete(key: string): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete multiple keys by pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  const client = getRedisClient();

  if (!client) {
    return 0;
  }

  try {
    const config = getRedisConfig();
    const fullPattern = `${config.keyPrefix}${pattern}`;

    // Scan for matching keys
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, matchedKeys] = await client.scan(
        cursor,
        'MATCH',
        fullPattern,
        'COUNT',
        100
      );

      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');

    if (keys.length === 0) {
      return 0;
    }

    // Delete all matched keys
    await client.del(...keys);
    return keys.length;
  } catch (error) {
    console.error(`Cache delete pattern error for ${pattern}:`, error);
    return 0;
  }
}

/**
 * Flush entire cache (super admin only)
 */
export async function cacheFlush(): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    await client.flushdb();
    return true;
  } catch (error) {
    console.error('Cache flush error:', error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export interface CacheStats {
  connected: boolean;
  keys: number;
  memory: {
    used: number;
    peak: number;
    fragmentation: number;
  };
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  connections: number;
}

export async function getCacheStats(): Promise<CacheStats | null> {
  const client = getRedisClient();

  if (!client) {
    return null;
  }

  try {
    const info = await client.info();
    const dbSize = await client.dbsize();

    // Parse info string
    const stats: Record<string, string> = {};
    info.split('\r\n').forEach((line) => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });

    const hits = parseInt(stats['keyspace_hits'] || '0', 10);
    const misses = parseInt(stats['keyspace_misses'] || '0', 10);
    const total = hits + misses;

    return {
      connected: client.status === 'ready',
      keys: dbSize,
      memory: {
        used: parseInt(stats['used_memory'] || '0', 10),
        peak: parseInt(stats['used_memory_peak'] || '0', 10),
        fragmentation: parseFloat(stats['mem_fragmentation_ratio'] || '1'),
      },
      hits,
      misses,
      hitRate: total > 0 ? hits / total : 0,
      evictions: parseInt(stats['evicted_keys'] || '0', 10),
      connections: parseInt(stats['connected_clients'] || '0', 10),
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return null;
  }
}

/**
 * Cache invalidation strategies
 */
export const CacheInvalidation = {
  /**
   * Invalidate competition-related caches
   */
  async competition(competitionId: string, tenantId: string): Promise<void> {
    await Promise.all([
      cacheDelete(CacheKeys.competition(competitionId)),
      cacheDeletePattern(`competitions:${tenantId}*`),
      cacheDeletePattern(`entries:*:${competitionId}`),
      cacheDeletePattern(`reservations:*:${competitionId}`),
      cacheDeletePattern(`invoices:*:${competitionId}`),
    ]);
  },

  /**
   * Invalidate studio-related caches
   */
  async studio(studioId: string, tenantId: string): Promise<void> {
    await Promise.all([
      cacheDelete(CacheKeys.studio(studioId)),
      cacheDeletePattern(`studios:${tenantId}`),
      cacheDeletePattern(`dancers:${studioId}*`),
      cacheDeletePattern(`entries:${studioId}*`),
      cacheDeletePattern(`reservations:${studioId}*`),
      cacheDeletePattern(`invoices:${studioId}*`),
    ]);
  },

  /**
   * Invalidate dancer-related caches
   */
  async dancer(dancerId: string, studioId: string): Promise<void> {
    await Promise.all([
      cacheDelete(CacheKeys.dancer(dancerId)),
      cacheDeletePattern(`dancers:${studioId}`),
      cacheDeletePattern(`entries:${studioId}*`), // Entries with this dancer
    ]);
  },

  /**
   * Invalidate entry-related caches
   */
  async entry(entryId: string, studioId: string, competitionId?: string): Promise<void> {
    await Promise.all([
      cacheDelete(CacheKeys.entry(entryId)),
      cacheDeletePattern(`entries:${studioId}*`),
      competitionId ? cacheDeletePattern(`entries:*:${competitionId}`) : Promise.resolve(),
    ]);
  },

  /**
   * Invalidate reservation-related caches
   */
  async reservation(reservationId: string, studioId: string, competitionId: string): Promise<void> {
    await Promise.all([
      cacheDelete(CacheKeys.reservation(reservationId)),
      cacheDeletePattern(`reservations:${studioId}*`),
      cacheDeletePattern(`reservations:*:${competitionId}`),
      cacheDelete(CacheKeys.competition(competitionId)), // Competition capacity changes
    ]);
  },

  /**
   * Invalidate invoice-related caches
   */
  async invoice(invoiceId: string, studioId: string, competitionId: string): Promise<void> {
    await Promise.all([
      cacheDelete(CacheKeys.invoice(invoiceId)),
      cacheDeletePattern(`invoices:${studioId}*`),
      cacheDeletePattern(`invoices:*:${competitionId}`),
    ]);
  },

  /**
   * Invalidate analytics caches
   */
  async analytics(tenantId: string, type?: string): Promise<void> {
    if (type) {
      await cacheDeletePattern(`analytics:${type}:${tenantId}*`);
    } else {
      await cacheDeletePattern(`analytics:*:${tenantId}*`);
    }
  },

  /**
   * Invalidate all caches for a tenant
   */
  async tenant(tenantId: string): Promise<void> {
    await Promise.all([
      cacheDeletePattern(`competitions:${tenantId}*`),
      cacheDeletePattern(`studios:${tenantId}*`),
      cacheDeletePattern(`analytics:*:${tenantId}*`),
    ]);
  },
};

/**
 * Cached query wrapper
 */
export async function cachedQuery<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheGet<T>(key);

  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from database
  const result = await fetchFn();

  // Store in cache
  await cacheSet(key, result, ttl);

  return result;
}
