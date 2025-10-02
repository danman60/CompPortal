import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dns from 'dns';

// Force IPv4 resolution
dns.setDefaultResultOrder('ipv4first');

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Parse DATABASE_URL and configure connection
const connectionConfig: any = {
  connectionString: process.env.DATABASE_URL,
  max: 1, // Limit connections in serverless
};

// Handle SSL configuration
if (process.env.DATABASE_URL?.includes('supabase') || process.env.DATABASE_URL?.includes('pooler')) {
  connectionConfig.ssl = { rejectUnauthorized: false };
}

// Create connection pool
const pool = globalForPrisma.pool ?? new Pool(connectionConfig);

if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool;

// Create adapter
const adapter = new PrismaPg(pool);

// Create Prisma Client with adapter
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
