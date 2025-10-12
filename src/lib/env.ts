/**
 * Environment variable validation and type-safe access
 * Validates required environment variables at startup
 * Prevents runtime errors from missing configuration
 */

// Helper to validate required environment variables
function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];

  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value || '';
}

// Helper for optional boolean environment variables
function getBooleanEnv(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Helper for optional number environment variables
function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`Invalid number for ${key}, using default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

/**
 * Validated and type-safe environment configuration
 */
export const env = {
  // App Configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  appUrl: getEnvVar('NEXT_PUBLIC_APP_URL', false) || 'http://localhost:3000',

  // Database Configuration
  databaseUrl: getEnvVar('DATABASE_URL'),
  directUrl: getEnvVar('DIRECT_URL', false),

  // Supabase Configuration
  supabase: {
    url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', false),
  },

  // Email Configuration (Optional)
  email: {
    smtpHost: getEnvVar('SMTP_HOST', false),
    smtpPort: getNumberEnv('SMTP_PORT', 587),
    smtpSecure: getBooleanEnv('SMTP_SECURE', false),
    smtpUser: getEnvVar('SMTP_USER', false),
    smtpPass: getEnvVar('SMTP_PASS', false),
    from: getEnvVar('EMAIL_FROM', false) || 'noreply@compsync.net',
    support: getEnvVar('SUPPORT_EMAIL', false) || 'support@compsync.net',
    contact: getEnvVar('CONTACT_EMAIL', false) || 'contact@compsync.net',
  },

  // Inbound Email Webhook (Optional)
  inboundEmailSecret: getEnvVar('INBOUND_EMAIL_SECRET', false),

  // Two-Factor Authentication (Optional)
  twoFactorEncryptionKey: getEnvVar('TWO_FACTOR_ENCRYPTION_KEY', false),

  // CDN Configuration (Optional)
  cdn: {
    enabled: getBooleanEnv('NEXT_PUBLIC_CDN_ENABLED', false),
    url: getEnvVar('NEXT_PUBLIC_CDN_URL', false),
    images: getBooleanEnv('NEXT_PUBLIC_CDN_IMAGES', true),
    css: getBooleanEnv('NEXT_PUBLIC_CDN_CSS', true),
    js: getBooleanEnv('NEXT_PUBLIC_CDN_JS', true),
  },

  // Cloudflare CDN (Optional)
  cloudflare: {
    zoneId: getEnvVar('CLOUDFLARE_ZONE_ID', false),
    apiToken: getEnvVar('CLOUDFLARE_API_TOKEN', false),
  },

  // CloudFront CDN (Optional)
  cloudfront: {
    distributionId: getEnvVar('CLOUDFRONT_DISTRIBUTION_ID', false),
    accessKeyId: getEnvVar('AWS_ACCESS_KEY_ID', false),
    secretAccessKey: getEnvVar('AWS_SECRET_ACCESS_KEY', false),
    region: getEnvVar('AWS_REGION', false) || 'us-east-1',
  },

  // Redis Configuration (Optional)
  redis: {
    enabled: getBooleanEnv('REDIS_ENABLED', false),
    host: getEnvVar('REDIS_HOST', false) || 'localhost',
    port: getNumberEnv('REDIS_PORT', 6379),
    password: getEnvVar('REDIS_PASSWORD', false),
    db: getNumberEnv('REDIS_DB', 0),
    keyPrefix: getEnvVar('REDIS_KEY_PREFIX', false) || 'compportal:',
    ttl: {
      competitions: getNumberEnv('REDIS_TTL_COMPETITIONS', 300),
      studios: getNumberEnv('REDIS_TTL_STUDIOS', 600),
      dancers: getNumberEnv('REDIS_TTL_DANCERS', 300),
      entries: getNumberEnv('REDIS_TTL_ENTRIES', 180),
      reservations: getNumberEnv('REDIS_TTL_RESERVATIONS', 180),
      invoices: getNumberEnv('REDIS_TTL_INVOICES', 300),
      analytics: getNumberEnv('REDIS_TTL_ANALYTICS', 3600),
    },
  },
} as const;

/**
 * Validate required environment variables on module load
 * This will throw an error during build/startup if required variables are missing
 */
export function validateEnv(): void {
  const required = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}\n\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}

// Validate environment variables when module is imported (server-side only)
if (typeof window === 'undefined') {
  try {
    validateEnv();
  } catch (error) {
    console.error('❌ Environment validation failed:');
    console.error(error);
    // In production, we want to fail fast
    if (env.isProduction) {
      process.exit(1);
    }
  }
}
