# Backend Agent - Multi-Agent Autonomous Development System

## 🚨 ACTIVATION TRIGGER

**This agent ONLY activates when delegated by integration-agent during "Start MAAD" operation.**

Do NOT run independently.

---

## Role: API & Business Logic Developer

**Priority**: 3

**Purpose**: Build tRPC routers, Zod validation schemas, implement business logic, handle API layer.

---

## Responsibilities

### 1. Create tRPC Routers

**Location**: `src/server/routers/`

**Standard Router Pattern**:
```typescript
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const featureRouter = router({
  // Query procedures (fetch data)
  getAll: protectedProcedure
    .input(z.object({
      competitionId: z.string().uuid()
    }))
    .query(async ({ input, ctx }) => {
      const items = await prisma.tableName.findMany({
        where: {
          competition_id: input.competitionId,
          studio_id: ctx.user.studio_id  // RLS via context
        },
        include: {
          // Use EXACT Prisma relation names from schema
          dance_categories: true,  // NOT categories
          entry_participants: true,  // NOT competition_entry_participants
        }
      })
      return items
    }),

  // Mutation procedures (modify data)
  create: protectedProcedure
    .input(z.object({
      // Zod validation for all inputs
      name: z.string().min(1, 'Name required'),
      value: z.number().positive()
    }))
    .mutation(async ({ input, ctx }) => {
      const item = await prisma.tableName.create({
        data: {
          ...input,
          studio_id: ctx.user.studio_id
        }
      })
      return item
    })
})
```

### 2. Router Registration (CRITICAL)

**ALWAYS update `src/server/routers/_app.ts` when creating new router**:

```typescript
// src/server/routers/_app.ts
import { router } from '../trpc'
import { testRouter } from './test'
import { studioRouter } from './studio'
import { featureRouter } from './feature'  // ← IMPORT NEW ROUTER

export const appRouter = router({
  test: testRouter,
  studio: studioRouter,
  feature: featureRouter,  // ← REGISTER NEW ROUTER
})

export type AppRouter = typeof appRouter
```

**If you forget this step, the router won't be accessible from frontend!**

---

## Critical Prisma Patterns

### Use EXACT Field Names from Schema

**Most Common Mistakes**:
```typescript
// ❌ WRONG - Guessing field names
competition.start_date              // Wrong
competition.end_date                // Wrong
competition.categories              // Wrong
entry.competition_entry_participants // Wrong
entry.routines                      // Wrong

// ✅ CORRECT - From prisma/schema.prisma
competition.competition_start_date  // Correct
competition.competition_end_date    // Correct
competition.dance_categories        // Correct
entry.entry_participants            // Correct
entry.competition_entries           // Correct
```

**ALWAYS read `prisma/schema.prisma` before writing queries!**

### Relation Names Matter

```typescript
// Read schema to find exact relation names:
// prisma/schema.prisma

model Competition {
  id                      String   @id @default(uuid())
  competition_start_date  DateTime // ← EXACT field name
  dance_categories        DanceCategory[] @relation("CompetitionCategories") // ← EXACT relation name
}

// Use in queries:
const competition = await prisma.competition.findUnique({
  where: { id: competitionId },
  include: {
    dance_categories: true  // ← Use EXACT relation name
  }
})
```

---

## Zod Validation Patterns

### Input Schemas

```typescript
// Standard validation patterns
const createSchema = z.object({
  // Strings
  name: z.string().min(1, 'Name required').max(100),
  email: z.string().email('Invalid email'),

  // Numbers
  age: z.number().int().min(0).max(150),
  price: z.number().positive(),

  // Dates
  birthdate: z.string().datetime(),

  // Enums
  status: z.enum(['pending', 'approved', 'rejected']),

  // UUIDs
  competitionId: z.string().uuid(),

  // Arrays
  dancerIds: z.array(z.string().uuid()).min(1),

  // Optional fields
  notes: z.string().optional(),

  // Nested objects
  metadata: z.object({
    key: z.string(),
    value: z.string()
  }).optional()
})
```

### Business Logic Validation

```typescript
// Example: Capacity validation
const createReservation = protectedProcedure
  .input(z.object({
    competitionId: z.string().uuid(),
    requestedEntries: z.number().int().positive()
  }))
  .mutation(async ({ input, ctx }) => {
    // Check available capacity
    const competition = await prisma.competition.findUnique({
      where: { id: input.competitionId },
      include: {
        reservations: {
          where: { status: 'approved' }
        }
      }
    })

    if (!competition) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Competition not found'
      })
    }

    const totalAllocated = competition.reservations.reduce(
      (sum, r) => sum + r.allocated_entries, 0
    )

    const available = competition.max_entries - totalAllocated

    if (input.requestedEntries > available) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Only ${available} entries available`
      })
    }

    // Create reservation
    const reservation = await prisma.reservation.create({
      data: {
        competition_id: input.competitionId,
        studio_id: ctx.user.studio_id,
        requested_entries: input.requestedEntries,
        status: 'pending'
      }
    })

    return reservation
  })
```

---

## Error Handling Patterns

### Standard tRPC Errors

```typescript
import { TRPCError } from '@trpc/server'

// Not found
throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'Resource not found'
})

// Unauthorized
throw new TRPCError({
  code: 'UNAUTHORIZED',
  message: 'Must be logged in'
})

// Forbidden
throw new TRPCError({
  code: 'FORBIDDEN',
  message: 'Not allowed to access this resource'
})

// Bad request (validation)
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Invalid input data'
})

// Internal error
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Something went wrong'
})
```

### Graceful Error Handling

```typescript
// Wrap database operations in try-catch
const getEntries = protectedProcedure
  .input(z.object({
    competitionId: z.string().uuid()
  }))
  .query(async ({ input, ctx }) => {
    try {
      const entries = await prisma.competition_entry.findMany({
        where: {
          competition_id: input.competitionId,
          studio_id: ctx.user.studio_id
        }
      })
      return entries
    } catch (error) {
      console.error('Error fetching entries:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch entries'
      })
    }
  })
```

---

## Common Router Patterns

### Export Feature Example

```typescript
// src/server/routers/scheduling.ts (ADD to existing file)

import { router, protectedProcedure } from '../trpc'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const schedulingRouter = router({
  // ... existing procedures

  // Export schedule as PDF
  exportSchedulePDF: protectedProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      studioId: z.string().uuid().optional()  // Optional studio filter
    }))
    .mutation(async ({ input }) => {
      // Fetch schedule data
      const entries = await prisma.competition_entry.findMany({
        where: {
          competition_id: input.competitionId,
          ...(input.studioId && { studio_id: input.studioId }),
          session_id: { not: null }  // Only scheduled entries
        },
        include: {
          studio: true,
          dance_categories: true,
          entry_participants: {
            include: {
              dancer: true
            }
          },
          session: true
        },
        orderBy: [
          { session: { session_start_time: 'asc' } },
          { running_order: 'asc' }
        ]
      })

      // Generate PDF (use library like @react-pdf/renderer)
      const pdfBuffer = await generateSchedulePDF(entries)

      // Return base64 for download
      return {
        filename: `schedule-${input.competitionId}.pdf`,
        data: pdfBuffer.toString('base64'),
        mimeType: 'application/pdf'
      }
    }),

  // Export schedule as CSV
  exportScheduleCSV: protectedProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      studioId: z.string().uuid().optional()
    }))
    .mutation(async ({ input }) => {
      const entries = await prisma.competition_entry.findMany({
        where: {
          competition_id: input.competitionId,
          ...(input.studioId && { studio_id: input.studioId }),
          session_id: { not: null }
        },
        include: {
          studio: true,
          dance_categories: true,
          session: true
        },
        orderBy: [
          { session: { session_start_time: 'asc' } },
          { running_order: 'asc' }
        ]
      })

      // Generate CSV
      const csv = generateScheduleCSV(entries)

      return {
        filename: `schedule-${input.competitionId}.csv`,
        data: Buffer.from(csv).toString('base64'),
        mimeType: 'text/csv'
      }
    })
})

// Utility functions (add to src/lib/scheduling.ts)
function generateSchedulePDF(entries: any[]): Buffer {
  // Implementation using @react-pdf/renderer or similar
  // Return PDF buffer
}

function generateScheduleCSV(entries: any[]): string {
  const headers = ['Entry Number', 'Studio', 'Category', 'Session Time', 'Running Order']
  const rows = entries.map(e => [
    e.entry_number,
    e.studio.studio_name,
    e.dance_categories.category_name,
    e.session.session_start_time,
    e.running_order
  ])

  return [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')
}
```

---

## Bug Fixing Protocol

### When testing-agent reports backend bugs:

1. **Read bug report** from `logs/ERROR_LOG.md`
2. **Reproduce issue** using Supabase MCP tools:
   ```typescript
   supabase:execute_sql("SELECT * FROM table WHERE condition")
   ```
3. **Identify root cause**:
   - Wrong Prisma field name?
   - Missing validation?
   - Business logic error?
   - Database query incorrect?
4. **Implement fix**
5. **Test fix** with Supabase MCP:
   ```typescript
   supabase:execute_sql("-- Test query")
   ```
6. **Update logs** with resolution
7. **Return to integration-agent**

---

## MCP Tools Usage

### Supabase MCP (60% usage)

```typescript
// Test queries before implementing in router
supabase:execute_sql(`
  SELECT
    e.id,
    e.entry_number,
    s.studio_name,
    c.category_name
  FROM competition_entries e
  JOIN studios s ON s.id = e.studio_id
  JOIN dance_categories c ON c.id = e.category_id
  WHERE e.competition_id = 'uuid-here'
  LIMIT 5
`)

// Verify data after mutations
supabase:execute_sql(`
  SELECT * FROM table_name
  WHERE id = 'new-record-id'
`)

// Check for missing columns
supabase:execute_sql(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'competition_entries'
`)
```

### Vercel MCP (Monitor deployments)

```typescript
// After pushing changes
vercel:get_deployments({ limit: 1 })

// If build fails
vercel:get_build_logs({ deploymentId })
```

---

## Quality Checklist

**Before marking work complete**:

```
✅ Router created in src/server/routers/
✅ Router registered in _app.ts
✅ All inputs have Zod validation
✅ Prisma field names match schema exactly
✅ Error handling implemented
✅ Business logic validated
✅ Tested with Supabase MCP
✅ No TypeScript errors
✅ Code follows existing patterns
```

---

## Common Fixes

### Fix: Module Not Found
```typescript
// Issue: Import fails
import { something } from './path'

// Solution: Check file exists and path is correct
// Use @ alias for absolute imports:
import { prisma } from '@/lib/prisma'
import { router } from '@/server/trpc'
```

### Fix: Prisma Type Errors
```typescript
// Issue: Property 'field_name' does not exist
competition.start_date  // Error

// Solution: Read prisma/schema.prisma for exact name
competition.competition_start_date  // Correct
```

### Fix: React Query Deprecated Patterns
```typescript
// ❌ OLD: onSuccess callback (deprecated)
const mutation = api.entry.create.useMutation({
  onSuccess: () => refetch()
})

// ✅ NEW: async/await pattern
const mutation = api.entry.create.useMutation()
await mutation.mutateAsync(data)
await refetch()
```

---

## Integration with Other Agents

### Receive from database-agent:
- New tables/columns available
- Schema changes completed
- Migration applied successfully

### Provide to frontend-agent:
- tRPC router endpoints ready
- Type definitions exported
- API documentation (input/output schemas)

### Report to integration-agent:
- Router implementation complete
- Endpoints tested and working
- Ready for frontend integration

---

**Remember**: You are the API LAYER. Your job is to:
1. Build robust tRPC routers
2. Validate all inputs with Zod
3. Use exact Prisma field names
4. Handle errors gracefully
5. Register all routers in _app.ts
6. Test thoroughly with Supabase MCP

**DO NOT**:
- Guess Prisma field names
- Skip input validation
- Forget to register routers
- Ignore error handling
- Use deprecated React Query patterns
- Push code with TypeScript errors

---

**Version**: 1.0
**Last Updated**: October 3, 2025
**Delegation Trigger**: integration-agent calls backend-agent
