// @ts-nocheck
/**
 * tRPC Router Pattern for CompPortal
 *
 * Use this as a template for new API routers
 * Follows authentication, validation, and error handling patterns
 */

import { router, protectedProcedure, publicProcedure } from '../trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

// Input validation schemas
const createExampleInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
})

const updateExampleInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
})

const getByIdInput = z.object({
  id: z.string().uuid()
})

// Router definition
export const exampleRouter = router({
  // List all (with optional filtering)
  list: protectedProcedure
    .input(z.object({
      isActive: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0)
    }).optional())
    .query(async ({ ctx, input }) => {
      const { prisma, userId, studioId } = ctx

      // Role-based filtering
      const where = {
        ...(studioId && { studioId }), // Studio Director sees only their data
        ...(input?.isActive !== undefined && { isActive: input.isActive })
      }

      const [items, total] = await Promise.all([
        prisma.example.findMany({
          where,
          take: input?.limit ?? 50,
          skip: input?.offset ?? 0,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.example.count({ where })
      ])

      return { items, total }
    }),

  // Get by ID
  getById: protectedProcedure
    .input(getByIdInput)
    .query(async ({ ctx, input }) => {
      const { prisma, userId, studioId } = ctx

      const item = await prisma.example.findUnique({
        where: { id: input.id }
      })

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Item not found'
        })
      }

      // Check permissions (Studio Director can only see own data)
      if (studioId && item.studioId !== studioId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this item'
        })
      }

      return item
    }),

  // Create new
  create: protectedProcedure
    .input(createExampleInput)
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId, studioId } = ctx

      // Business logic validation
      if (!studioId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Studio ID is required'
        })
      }

      // Create item
      const item = await prisma.example.create({
        data: {
          ...input,
          studioId,
          createdBy: userId
        }
      })

      return item
    }),

  // Update existing
  update: protectedProcedure
    .input(updateExampleInput)
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId, studioId } = ctx
      const { id, ...data } = input

      // Check if item exists
      const existing = await prisma.example.findUnique({
        where: { id }
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Item not found'
        })
      }

      // Check permissions
      if (studioId && existing.studioId !== studioId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this item'
        })
      }

      // Update item
      const updated = await prisma.example.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      })

      return updated
    }),

  // Delete
  delete: protectedProcedure
    .input(getByIdInput)
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId, studioId } = ctx

      // Check if item exists
      const existing = await prisma.example.findUnique({
        where: { id: input.id }
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Item not found'
        })
      }

      // Check permissions
      if (studioId && existing.studioId !== studioId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this item'
        })
      }

      // Check if item has dependencies (business logic)
      const dependentCount = await prisma.dependent.count({
        where: { exampleId: input.id }
      })

      if (dependentCount > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot delete item with ${dependentCount} dependent records`
        })
      }

      // Delete item
      await prisma.example.delete({
        where: { id: input.id }
      })

      return { success: true }
    })
})

/**
 * REMEMBER TO REGISTER IN _app.ts:
 *
 * import { exampleRouter } from './example'
 *
 * export const appRouter = router({
 *   // ... existing routers
 *   example: exampleRouter, // ← ADD THIS
 * })
 */

/**
 * Key Patterns:
 *
 * 1. Validation:
 *    - Use Zod schemas for input validation
 *    - Define schemas outside router for reuse
 *    - Validate UUIDs, string lengths, number ranges
 *
 * 2. Authentication:
 *    - Use protectedProcedure (requires auth)
 *    - Use publicProcedure only for public endpoints
 *    - Access ctx.userId, ctx.studioId, ctx.userRole
 *
 * 3. Authorization:
 *    - Check permissions before queries/mutations
 *    - Studio Directors: Filter by studioId
 *    - Competition Directors: See all data
 *    - Throw FORBIDDEN error if unauthorized
 *
 * 4. Error Handling:
 *    - Use TRPCError with appropriate codes
 *    - NOT_FOUND: Resource doesn't exist
 *    - FORBIDDEN: No permission
 *    - BAD_REQUEST: Invalid input/business logic
 *
 * 5. Database Queries:
 *    - Use Prisma for type-safe queries
 *    - Batch queries with Promise.all when possible
 *    - Check dependencies before deletes
 *
 * 6. Response Format:
 *    - Return plain objects (Prisma models)
 *    - Include pagination info (total, items)
 *    - Return { success: true } for deletes
 */
