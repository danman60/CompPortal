/**
 * Environment variable validation with Zod
 * Provides type-safe access and runtime validation
 * Validates required variables at startup
 */

import { z } from 'zod';

/**
 * Environment variable schema with Zod
 * Provides compile-time type safety and runtime validation
 */
const envSchema = z.object({
  // App Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Database Configuration
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),

  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Email Configuration (Optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@compsync.net'),
  SUPPORT_EMAIL: z.string().email().default('support@compsync.net'),
  CONTACT_EMAIL: z.string().email().default('contact@compsync.net'),

  // Inbound Email Webhook (Optional)
  INBOUND_EMAIL_SECRET: z.string().optional(),

  // Two-Factor Authentication (Optional)
  TWO_FACTOR_ENCRYPTION_KEY: z.string().optional(),

  // CDN Configuration (Optional)
  NEXT_PUBLIC_CDN_ENABLED: z.coerce.boolean().default(false),
  NEXT_PUBLIC_CDN_URL: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_CDN_IMAGES: z.coerce.boolean().default(true),
  NEXT_PUBLIC_CDN_CSS: z.coerce.boolean().default(true),
  NEXT_PUBLIC_CDN_JS: z.coerce.boolean().default(true),

  // Cloudflare CDN (Optional)
  CLOUDFLARE_ZONE_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),

  // CloudFront CDN (Optional)
  CLOUDFRONT_DISTRIBUTION_ID: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),

  // Redis Configuration (Optional)
  REDIS_ENABLED: z.coerce.boolean().default(false),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).default(0),
  REDIS_KEY_PREFIX: z.string().default('compportal:'),
  REDIS_TTL_COMPETITIONS: z.coerce.number().int().positive().default(300),
  REDIS_TTL_STUDIOS: z.coerce.number().int().positive().default(600),
  REDIS_TTL_DANCERS: z.coerce.number().int().positive().default(300),
  REDIS_TTL_ENTRIES: z.coerce.number().int().positive().default(180),
  REDIS_TTL_RESERVATIONS: z.coerce.number().int().positive().default(180),
  REDIS_TTL_INVOICES: z.coerce.number().int().positive().default(300),
  REDIS_TTL_ANALYTICS: z.coerce.number().int().positive().default(3600),
});

/**
 * Parsed and validated environment variables
 * Inferred type from Zod schema provides full type safety
 */
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:');
  console.error(parsed.error.flatten().fieldErrors);

  // In production, fail fast
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Invalid environment variables');
  }
}

const envVars = parsed.success ? parsed.data : ({} as z.infer<typeof envSchema>);

/**
 * Type-safe environment configuration
 * Organized by functional area with full IntelliSense support
 */
export const env = {
  // App Configuration
  nodeEnv: envVars.NODE_ENV,
  isDevelopment: envVars.NODE_ENV === 'development',
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',
  appUrl: envVars.NEXT_PUBLIC_APP_URL,

  // Database Configuration
  databaseUrl: envVars.DATABASE_URL,
  directUrl: envVars.DIRECT_URL,

  // Supabase Configuration
  supabase: {
    url: envVars.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: envVars.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Email Configuration
  email: {
    smtpHost: envVars.SMTP_HOST,
    smtpPort: envVars.SMTP_PORT,
    smtpSecure: envVars.SMTP_SECURE,
    smtpUser: envVars.SMTP_USER,
    smtpPass: envVars.SMTP_PASS,
    from: envVars.EMAIL_FROM,
    support: envVars.SUPPORT_EMAIL,
    contact: envVars.CONTACT_EMAIL,
  },

  // Inbound Email Webhook
  inboundEmailSecret: envVars.INBOUND_EMAIL_SECRET,

  // Two-Factor Authentication
  twoFactorEncryptionKey: envVars.TWO_FACTOR_ENCRYPTION_KEY,

  // CDN Configuration
  cdn: {
    enabled: envVars.NEXT_PUBLIC_CDN_ENABLED,
    url: envVars.NEXT_PUBLIC_CDN_URL,
    images: envVars.NEXT_PUBLIC_CDN_IMAGES,
    css: envVars.NEXT_PUBLIC_CDN_CSS,
    js: envVars.NEXT_PUBLIC_CDN_JS,
  },

  // Cloudflare CDN
  cloudflare: {
    zoneId: envVars.CLOUDFLARE_ZONE_ID,
    apiToken: envVars.CLOUDFLARE_API_TOKEN,
  },

  // CloudFront CDN
  cloudfront: {
    distributionId: envVars.CLOUDFRONT_DISTRIBUTION_ID,
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    region: envVars.AWS_REGION,
  },

  // Redis Configuration
  redis: {
    enabled: envVars.REDIS_ENABLED,
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
    db: envVars.REDIS_DB,
    keyPrefix: envVars.REDIS_KEY_PREFIX,
    ttl: {
      competitions: envVars.REDIS_TTL_COMPETITIONS,
      studios: envVars.REDIS_TTL_STUDIOS,
      dancers: envVars.REDIS_TTL_DANCERS,
      entries: envVars.REDIS_TTL_ENTRIES,
      reservations: envVars.REDIS_TTL_RESERVATIONS,
      invoices: envVars.REDIS_TTL_INVOICES,
      analytics: envVars.REDIS_TTL_ANALYTICS,
    },
  },
} as const;
