import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
  getWhitelistEntries,
  addIpToWhitelist,
  removeIpFromWhitelist,
  toggleWhitelistEntry,
  checkIpWhitelist,
  isValidIpAddress,
  isValidCIDR,
} from '@/lib/ip-whitelist';
import { TRPCError } from '@trpc/server';
import { extractIpAddress } from '@/lib/activity';

export const ipWhitelistRouter = router({
  /**
   * Get all whitelist entries for current tenant
   */
  list: publicProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    if (!tenantId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Tenant ID required',
      });
    }

    const entries = await getWhitelistEntries(tenantId);

    return {
      entries,
      count: entries.length,
    };
  }),

  /**
   * Add new IP to whitelist
   */
  add: publicProcedure
    .input(
      z.object({
        ipAddress: z.string().min(7).max(50),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { ipAddress, description } = input;
      const tenantId = ctx.tenantId;
      const userId = ctx.userId;

      if (!tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // Validate IP format (supports CIDR)
      if (!isValidIpAddress(ipAddress) && !isValidCIDR(ipAddress)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid IP address or CIDR notation. Examples: 192.168.1.1 or 192.168.1.0/24',
        });
      }

      const entry = await addIpToWhitelist({
        tenantId,
        ipAddress,
        description,
        createdBy: userId || undefined,
      });

      return {
        success: true,
        entry,
      };
    }),

  /**
   * Remove IP from whitelist
   */
  remove: publicProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { entryId } = input;
      const tenantId = ctx.tenantId;

      if (!tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      await removeIpFromWhitelist({
        tenantId,
        entryId,
      });

      return {
        success: true,
        message: 'IP removed from whitelist',
      };
    }),

  /**
   * Toggle whitelist entry active status
   */
  toggle: publicProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { entryId, isActive } = input;
      const tenantId = ctx.tenantId;

      if (!tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      await toggleWhitelistEntry({
        tenantId,
        entryId,
        isActive,
      });

      return {
        success: true,
        message: `Whitelist entry ${isActive ? 'activated' : 'deactivated'}`,
      };
    }),

  /**
   * Get whitelist statistics
   */
  getStats: publicProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    if (!tenantId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Tenant ID required',
      });
    }

    const entries = await getWhitelistEntries(tenantId);
    const activeCount = entries.filter(e => e.is_active).length;

    return {
      total: entries.length,
      active: activeCount,
      inactive: entries.length - activeCount,
    };
  }),
});
