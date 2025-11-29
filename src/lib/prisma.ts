import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Use native Prisma Client without pg adapter for Vercel serverless compatibility
// The pg adapter has authentication issues with Supabase pooler on serverless
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Increase transaction timeout to support large batch operations (1000+ routine saves)
    // Default is 5 seconds, increasing to 30 seconds for production scale
    transactionOptions: {
      maxWait: 30000, // 30 seconds max wait to start transaction
      timeout: 30000, // 30 seconds transaction timeout
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
