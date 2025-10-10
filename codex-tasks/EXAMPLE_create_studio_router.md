# Task: Create Studio Router

**Type:** Boilerplate Generation (tRPC Router)
**Priority:** Low
**Estimated Time:** 5 minutes

---

## Context

**File to create:** `src/server/routers/studio.ts`

**Purpose:** Create a complete tRPC router for Studio CRUD operations to support studio management features.

**Related files:**
- Schema: `prisma/schema.prisma` (Studio model)
- Router registry: `src/server/routers/_app.ts` (must add export)
- Pattern: Use `trpc_router` pattern from `codex.config.json`

---

## Requirements

### 1. Router Procedures

Create the following tRPC procedures:

**list** (query)
- Returns: All studios ordered by `studio_name`
- No input required
- Include: id, studio_name, contact_email, contact_phone, address

**byId** (query)
- Input: `{ id: string }`
- Returns: Single studio by ID
- Handle: Return null if not found

**create** (mutation)
- Input: Zod schema with:
  - `studio_name` (string, min 1 char, required)
  - `contact_email` (string, email format, required)
  - `contact_phone` (string, optional)
  - `address` (string, optional)
- Returns: Created studio object
- Validation: Ensure email format is valid

**update** (mutation)
- Input: `{ id: string, data: Partial<Studio> }`
- Returns: Updated studio object
- Validation: At least one field must be provided

**delete** (mutation)
- Input: `{ id: string }`
- Returns: Deleted studio object
- Note: Will fail if studio has competitions (FK constraint)

### 2. Prisma Model Reference

From `prisma/schema.prisma`:

```prisma
model Studio {
  id            String   @id @default(cuid())
  studio_name   String
  contact_email String
  contact_phone String?
  address       String?
  created_at    DateTime @default(now())

  competitions  Competition[]
  entries       Entry[]
}
```

**CRITICAL:** Use exact field names above. NOT camelCase variants.

### 3. Pattern to Follow

Use the `trpc_router` pattern from `codex.config.json`:

```typescript
import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

export const studioRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    // Implementation
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Implementation
    }),

  create: publicProcedure
    .input(z.object({
      studio_name: z.string().min(1),
      contact_email: z.string().email(),
      contact_phone: z.string().optional(),
      address: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),

  // ... update, delete
});
```

---

## Deliverables

1. **File:** `src/server/routers/studio.ts`
   - Complete tRPC router with all 5 procedures
   - Proper TypeScript types
   - Zod validation schemas
   - Error handling (try/catch where needed)

2. **Router Export Instruction:**
   - Add to `src/server/routers/_app.ts`:
   ```typescript
   import { studioRouter } from './studio';

   export const appRouter = router({
     // ... existing routers
     studio: studioRouter,  // ← ADD THIS
   });
   ```

3. **Output Location:** `codex-tasks/outputs/create_studio_router_result.md`

---

## Validation Checklist

Before outputting, verify:

- ✅ All 5 procedures implemented (list, byId, create, update, delete)
- ✅ Zod schemas have proper validation
- ✅ Prisma field names match schema exactly (studio_name, contact_email, etc.)
- ✅ Error handling present for database operations
- ✅ TypeScript types are correct
- ✅ Imports are complete
- ✅ Router export instruction included

---

## Expected Output Format

Output should be ready to copy-paste:

````markdown
## Studio Router Implementation

**File:** `src/server/routers/studio.ts`

```typescript
[COMPLETE IMPLEMENTATION HERE]
```

**Router Registration:**

Add to `src/server/routers/_app.ts`:
```typescript
import { studioRouter } from './studio';

export const appRouter = router({
  // ... existing routers
  studio: studioRouter,
});
```

**Validation:**
- ✅ Build: Success
- ✅ Prisma fields: Exact match
- ✅ TypeScript: No errors
- ✅ Zod validation: Complete

**Next Steps:**
1. Copy code to `src/server/routers/studio.ts`
2. Update `_app.ts` with router export
3. Run `npm run build`
4. Test with Playwright on production
````

---

## Notes

- This is a SIMPLE task - straightforward CRUD router
- Follow existing patterns exactly
- Don't overthink - copy pattern, adjust for Studio model
- If uncertain about schema, CREATE BLOCKER, don't guess
- Output should compile without changes

---

**Codex: Execute this task following all instructions above.**
