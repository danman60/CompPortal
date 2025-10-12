/**
 * CDN Configuration Library
 * Handles static asset delivery through CDN (Cloudflare/CloudFront)
 */

/**
 * CDN Configuration
 */
export interface CDNConfig {
  enabled: boolean;
  baseUrl: string;
  staticAssets: {
    images: boolean;
    css: boolean;
    js: boolean;
  };
  cacheControl: {
    images: string;
    css: string;
    js: string;
  };
}

/**
 * Get CDN configuration from environment
 */
export function getCDNConfig(): CDNConfig {
  const enabled = process.env.NEXT_PUBLIC_CDN_ENABLED === 'true';
  const baseUrl = process.env.NEXT_PUBLIC_CDN_URL || '';

  return {
    enabled: enabled && !!baseUrl,
    baseUrl,
    staticAssets: {
      images: process.env.NEXT_PUBLIC_CDN_IMAGES !== 'false', // Default true
      css: process.env.NEXT_PUBLIC_CDN_CSS !== 'false', // Default true
      js: process.env.NEXT_PUBLIC_CDN_JS !== 'false', // Default true
    },
    cacheControl: {
      images: process.env.CDN_CACHE_IMAGES || 'public, max-age=31536000, immutable',
      css: process.env.CDN_CACHE_CSS || 'public, max-age=31536000, immutable',
      js: process.env.CDN_CACHE_JS || 'public, max-age=31536000, immutable',
    },
  };
}

/**
 * Get CDN URL for an asset path
 */
export function getCDNUrl(assetPath: string): string {
  const config = getCDNConfig();

  // If CDN disabled, return original path
  if (!config.enabled) {
    return assetPath;
  }

  // Ensure path starts with /
  const path = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;

  // Determine asset type
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext);
  const isCSS = ext === 'css';
  const isJS = ['js', 'mjs'].includes(ext);

  // Check if this asset type should use CDN
  if (
    (isImage && !config.staticAssets.images) ||
    (isCSS && !config.staticAssets.css) ||
    (isJS && !config.staticAssets.js)
  ) {
    return path;
  }

  // Return CDN URL
  return `${config.baseUrl}${path}`;
}

/**
 * Get CDN URL for image with optimization hints
 */
export interface ImageCDNOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
}

export function getImageCDNUrl(imagePath: string, options?: ImageCDNOptions): string {
  const config = getCDNConfig();

  // If CDN disabled or images not enabled, return original
  if (!config.enabled || !config.staticAssets.images) {
    return imagePath;
  }

  const baseUrl = getCDNUrl(imagePath);

  // If no options, return base URL
  if (!options) {
    return baseUrl;
  }

  // For Cloudflare Images, use transformation parameters
  // Format: /cdn-cgi/image/width=X,height=Y,quality=Z,format=webp/path
  if (config.baseUrl.includes('cloudflare')) {
    const params: string[] = [];

    if (options.width) params.push(`width=${options.width}`);
    if (options.height) params.push(`height=${options.height}`);
    if (options.quality) params.push(`quality=${options.quality}`);
    if (options.format) params.push(`format=${options.format}`);

    if (params.length > 0) {
      return `${config.baseUrl}/cdn-cgi/image/${params.join(',')}${imagePath}`;
    }
  }

  // For CloudFront, use query parameters (if Lambda@Edge configured)
  if (config.baseUrl.includes('cloudfront') && options) {
    const params = new URLSearchParams();

    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('f', options.format);

    const query = params.toString();
    return query ? `${baseUrl}?${query}` : baseUrl;
  }

  return baseUrl;
}

/**
 * Purge CDN cache for specific paths
 */
export async function purgeCDNCache(paths: string[]): Promise<{ success: boolean; error?: string }> {
  const config = getCDNConfig();

  if (!config.enabled) {
    return { success: false, error: 'CDN not enabled' };
  }

  // Cloudflare cache purge
  if (config.baseUrl.includes('cloudflare')) {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!zoneId || !apiToken) {
      return { success: false, error: 'Cloudflare credentials not configured' };
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: paths.map((path) => `${config.baseUrl}${path}`),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.errors?.[0]?.message || 'Purge failed' };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // CloudFront cache invalidation
  if (config.baseUrl.includes('cloudfront')) {
    const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.AWS_REGION || 'us-east-1';

    if (!distributionId || !awsAccessKey || !awsSecretKey) {
      return { success: false, error: 'CloudFront credentials not configured' };
    }

    // Note: This requires AWS SDK
    // For production, install @aws-sdk/client-cloudfront
    return {
      success: false,
      error: 'CloudFront invalidation requires @aws-sdk/client-cloudfront package',
    };
  }

  return { success: false, error: 'Unsupported CDN provider' };
}

/**
 * Get cache control headers for asset type
 */
export function getCacheControlHeaders(assetPath: string): Record<string, string> {
  const config = getCDNConfig();
  const ext = assetPath.split('.').pop()?.toLowerCase() || '';

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext);
  const isCSS = ext === 'css';
  const isJS = ['js', 'mjs'].includes(ext);

  if (isImage) {
    return { 'Cache-Control': config.cacheControl.images };
  }

  if (isCSS) {
    return { 'Cache-Control': config.cacheControl.css };
  }

  if (isJS) {
    return { 'Cache-Control': config.cacheControl.js };
  }

  // Default: 1 hour cache
  return { 'Cache-Control': 'public, max-age=3600' };
}

/**
 * Check if CDN is healthy
 */
export async function checkCDNHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  const config = getCDNConfig();

  if (!config.enabled) {
    return { healthy: false, error: 'CDN not enabled' };
  }

  const testUrl = `${config.baseUrl}/favicon.ico`;
  const startTime = Date.now();

  try {
    const response = await fetch(testUrl, { method: 'HEAD' });
    const latency = Date.now() - startTime;

    if (response.ok) {
      return { healthy: true, latency };
    }

    return { healthy: false, error: `HTTP ${response.status}`, latency };
  } catch (error: any) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Get CDN statistics (Cloudflare only)
 */
export interface CDNStats {
  requests: number;
  bandwidth: number;
  cachedRequests: number;
  cacheHitRatio: number;
}

export async function getCDNStats(
  since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
): Promise<{ success: boolean; stats?: CDNStats; error?: string }> {
  const config = getCDNConfig();

  if (!config.enabled) {
    return { success: false, error: 'CDN not enabled' };
  }

  // Cloudflare Analytics API
  if (config.baseUrl.includes('cloudflare')) {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!zoneId || !apiToken) {
      return { success: false, error: 'Cloudflare credentials not configured' };
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/analytics/dashboard?since=${since.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.errors?.[0]?.message || 'Analytics fetch failed' };
      }

      const result = data.result;

      return {
        success: true,
        stats: {
          requests: result.totals.requests.all,
          bandwidth: result.totals.bandwidth.all,
          cachedRequests: result.totals.requests.cached,
          cacheHitRatio: result.totals.requests.cached / result.totals.requests.all,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'CDN statistics not available for this provider' };
}
