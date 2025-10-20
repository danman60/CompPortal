/**
 * WebSocket JWT Authentication
 * Verifies Supabase JWT tokens for WebSocket connections
 */

import { jwtVerify } from 'jose';
import { logger } from './logger';

interface JWTPayload {
  sub: string; // user ID
  role?: string;
  email?: string;
  exp?: number;
  iat?: number;
}

/**
 * Verify Supabase JWT token
 * @param token - JWT token from client
 * @returns Decoded payload if valid, null if invalid
 */
export async function verifyWebSocketToken(token: string): Promise<JWTPayload | null> {
  try {
    // Get Supabase JWT secret from environment
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;

    if (!jwtSecret) {
      logger.error('SUPABASE_JWT_SECRET not configured');
      return null;
    }

    // Verify JWT
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret, {
      issuer: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });

    // Extract user information
    return {
      sub: payload.sub!,
      role: payload.role as string | undefined,
      email: payload.email as string | undefined,
      exp: payload.exp,
      iat: payload.iat,
    };
  } catch (error) {
    logger.warn('JWT verification failed', {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return null;
  }
}

/**
 * Extract user ID from verified payload
 */
export function getUserIdFromPayload(payload: JWTPayload): string {
  return payload.sub;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(payload: JWTPayload): boolean {
  if (!payload.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}
