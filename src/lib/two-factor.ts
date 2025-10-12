/**
 * Two-Factor Authentication (2FA) Library
 * Implements TOTP-based 2FA with backup codes
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from './logger';

/**
 * Configuration
 */
const APP_NAME = 'CompPortal';
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

/**
 * Generate a new TOTP secret
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate QR code data URL for TOTP secret
 */
export async function generateQRCode(
  userEmail: string,
  secret: string
): Promise<string> {
  const otpauth = authenticator.keyuri(userEmail, APP_NAME, secret);
  return await QRCode.toDataURL(otpauth);
}

/**
 * Verify TOTP token against secret
 */
export function verifyToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    logger.error('2FA token verification failed', { error: error instanceof Error ? error : new Error(String(error)) });
    return false;
  }
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = crypto
      .randomBytes(BACKUP_CODE_LENGTH / 2)
      .toString('hex')
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join('-') || '';

    codes.push(code);
  }

  return codes;
}

/**
 * Hash a backup code for storage
 */
export function hashBackupCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');
}

/**
 * Hash multiple backup codes
 */
export function hashBackupCodes(codes: string[]): string[] {
  return codes.map(hashBackupCode);
}

/**
 * Verify a backup code against hashed codes
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): { valid: boolean; remainingCodes: string[] } {
  const hashedInput = hashBackupCode(code);
  const index = hashedCodes.indexOf(hashedInput);

  if (index === -1) {
    return { valid: false, remainingCodes: hashedCodes };
  }

  // Remove used code
  const remainingCodes = [...hashedCodes];
  remainingCodes.splice(index, 1);

  return { valid: true, remainingCodes };
}

/**
 * Encrypt secret for storage (simple XOR for demo - use proper encryption in production)
 */
export function encryptSecret(secret: string, key: string): string {
  // IMPORTANT: Replace with proper encryption (AES-256) in production
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(key.padEnd(32, '0').slice(0, 32)),
    Buffer.alloc(16, 0)
  );

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return encrypted;
}

/**
 * Decrypt secret from storage
 */
export function decryptSecret(encrypted: string, key: string): string {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key.padEnd(32, '0').slice(0, 32)),
      Buffer.alloc(16, 0)
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('2FA secret decryption failed', { error: error instanceof Error ? error : new Error(String(error)) });
    throw new Error('Failed to decrypt 2FA secret');
  }
}

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): string {
  const key = process.env.TWO_FACTOR_ENCRYPTION_KEY;

  if (!key) {
    console.warn('TWO_FACTOR_ENCRYPTION_KEY not set, using default (INSECURE)');
    return 'default-insecure-key-change-in-production';
  }

  return key;
}

/**
 * Setup 2FA for a user
 */
export interface Setup2FAOptions {
  userId: string;
  secret: string;
  backupCodes: string[];
}

export async function setup2FA(options: Setup2FAOptions): Promise<void> {
  const { userId, secret, backupCodes } = options;

  const encryptedSecret = encryptSecret(secret, getEncryptionKey());
  const hashedBackupCodes = hashBackupCodes(backupCodes);

  await prisma.user_profiles.update({
    where: { id: userId },
    data: {
      two_factor_secret: encryptedSecret,
      two_factor_backup_codes: hashedBackupCodes,
      two_factor_verified_at: new Date(),
    },
  });
}

/**
 * Enable 2FA for a user
 */
export async function enable2FA(userId: string): Promise<void> {
  await prisma.user_profiles.update({
    where: { id: userId },
    data: {
      two_factor_enabled: true,
    },
  });
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(userId: string): Promise<void> {
  await prisma.user_profiles.update({
    where: { id: userId },
    data: {
      two_factor_enabled: false,
      two_factor_secret: null,
      two_factor_backup_codes: undefined,
      two_factor_verified_at: null,
    },
  });
}

/**
 * Check if user has 2FA enabled
 */
export async function is2FAEnabled(userId: string): Promise<boolean> {
  const profile = await prisma.user_profiles.findUnique({
    where: { id: userId },
    select: { two_factor_enabled: true },
  });

  return profile?.two_factor_enabled || false;
}

/**
 * Get user's 2FA secret (decrypted)
 */
export async function get2FASecret(userId: string): Promise<string | null> {
  const profile = await prisma.user_profiles.findUnique({
    where: { id: userId },
    select: { two_factor_secret: true },
  });

  if (!profile?.two_factor_secret) {
    return null;
  }

  return decryptSecret(profile.two_factor_secret, getEncryptionKey());
}

/**
 * Verify 2FA token for a user
 */
export interface Verify2FAOptions {
  userId: string;
  token: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function verify2FA(
  options: Verify2FAOptions
): Promise<{ success: boolean; backupCodeUsed?: boolean }> {
  const { userId, token, ipAddress, userAgent } = options;

  const profile = await prisma.user_profiles.findUnique({
    where: { id: userId },
    select: {
      two_factor_enabled: true,
      two_factor_secret: true,
      two_factor_backup_codes: true,
    },
  });

  if (!profile?.two_factor_enabled || !profile.two_factor_secret) {
    return { success: false };
  }

  const secret = decryptSecret(profile.two_factor_secret, getEncryptionKey());

  // Try TOTP verification first
  if (verifyToken(token, secret)) {
    await log2FAAction({
      userId,
      action: 'verify',
      success: true,
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  // Try backup code verification
  if (profile.two_factor_backup_codes) {
    const backupCodes = profile.two_factor_backup_codes as string[];
    const { valid, remainingCodes } = verifyBackupCode(token, backupCodes);

    if (valid) {
      // Update remaining backup codes
      await prisma.user_profiles.update({
        where: { id: userId },
        data: { two_factor_backup_codes: remainingCodes },
      });

      await log2FAAction({
        userId,
        action: 'backup_used',
        success: true,
        ipAddress,
        userAgent,
      });

      return { success: true, backupCodeUsed: true };
    }
  }

  // Both verification methods failed
  await log2FAAction({
    userId,
    action: 'verify',
    success: false,
    ipAddress,
    userAgent,
  });

  return { success: false };
}

/**
 * Log 2FA action to audit trail
 */
export interface Log2FAActionOptions {
  userId: string;
  action: 'setup' | 'verify' | 'disable' | 'backup_used';
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export async function log2FAAction(options: Log2FAActionOptions): Promise<void> {
  const { userId, action, success, ipAddress, userAgent } = options;

  try {
    await prisma.$executeRaw`
      INSERT INTO public.two_factor_audit_log (user_id, action, success, ip_address, user_agent)
      VALUES (${userId}::uuid, ${action}, ${success}, ${ipAddress}, ${userAgent})
    `;
  } catch (error) {
    logger.error('Failed to log 2FA action', { error: error instanceof Error ? error : new Error(String(error)) });
    // Don't throw - logging failure shouldn't block 2FA operation
  }
}

/**
 * Get 2FA audit log for a user
 */
export interface TwoFactorAuditLog {
  id: string;
  action: string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

export async function get2FAAuditLog(
  userId: string,
  limit: number = 50
): Promise<TwoFactorAuditLog[]> {
  const logs = await prisma.$queryRaw<TwoFactorAuditLog[]>`
    SELECT id, action, success, ip_address as "ipAddress", user_agent as "userAgent", timestamp
    FROM public.two_factor_audit_log
    WHERE user_id = ${userId}::uuid
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;

  return logs;
}

/**
 * Format backup codes for display
 */
export function formatBackupCodesForDisplay(codes: string[]): string {
  return codes
    .map((code, index) => `${(index + 1).toString().padStart(2, '0')}. ${code}`)
    .join('\n');
}

/**
 * Get remaining backup code count
 */
export async function getRemainingBackupCodeCount(
  userId: string
): Promise<number> {
  const profile = await prisma.user_profiles.findUnique({
    where: { id: userId },
    select: { two_factor_backup_codes: true },
  });

  if (!profile?.two_factor_backup_codes) {
    return 0;
  }

  return (profile.two_factor_backup_codes as string[]).length;
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  const newCodes = generateBackupCodes();
  const hashedCodes = hashBackupCodes(newCodes);

  await prisma.user_profiles.update({
    where: { id: userId },
    data: { two_factor_backup_codes: hashedCodes },
  });

  return newCodes;
}
