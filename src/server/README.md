# CompPortal API Documentation

## Overview

CompPortal uses [tRPC](https://trpc.io/) for type-safe API endpoints. All routes are defined in `src/server/routers/` and consumed via React hooks through `@trpc/react-query`.

## Architecture

```
src/server/
├── routers/          # API endpoints organized by domain
│   ├── entry.ts      # Competition entry management
│   ├── reservation.ts # Reservation workflow
│   ├── dancer.ts     # Dancer profiles
│   ├── studio.ts     # Studio management
│   ├── competition.ts # Competition setup
│   └── ...           # Other domain routers
├── middleware/       # Authentication & authorization
└── trpc.ts          # tRPC initialization
```

## Authentication

All routes use one of two procedures:

- **`publicProcedure`**: No authentication required (login, signup, public pages)
- **`protectedProcedure`**: Requires authenticated session via Supabase Auth

Example:
```typescript
// Public endpoint
export const publicRouter = router({
  hello: publicProcedure.query(() => 'Hello World'),
});

// Protected endpoint
export const userRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id; // User is guaranteed to exist
    return await prisma.users.findUnique({ where: { id: userId } });
  }),
});
```

## Key Routers

### Entry Router (`entry.ts`)

Manages competition entries (routines).

**Key Procedures:**
- `create` - Create new entry with participants and metadata
- `list` - List entries with filtering (by competition, studio, status)
- `getById` - Get single entry with full details
- `update` - Update entry details (name, category, participants)
- `updateStatus` - Change entry status (draft → submitted → approved → scheduled)
- `delete` - Soft delete entry

**Business Rules:**
- Participant count must match size category constraints (Wave 2.2)
- Entry fees validated against category pricing (Wave 2.2)
- Reservation must be approved before creating entries
- Cannot exceed reservation's confirmed space allocation

**Example Usage:**
```typescript
// In a React component
import { api } from '@/lib/trpc';

function EntryForm() {
  const createEntry = api.entry.create.useMutation();

  const handleSubmit = async (data) => {
    await createEntry.mutateAsync({
      competition_id: 'comp-123',
      reservation_id: 'res-456',
      entry_name: 'Jazz Solo - Sarah',
      entry_size_category_id: 'solo-cat-id',
      participants: [{ dancer_id: 'dancer-789' }],
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Reservation Router (`reservation.ts`)

Handles studio reservation requests and approvals.

**Key Procedures:**
- `create` - Studio requests reservation (spaces + tokens)
- `list` - List reservations (filterable by competition, studio, status)
- `getById` - Get reservation details with entries
- `updateStatus` - Approve/reject reservation (directors only)
- `updateSpaces` - Adjust confirmed space allocation

**Business Rules:**
- Requested spaces must be > 0 and < 500 (Wave 2.2)
- Token-based capacity validation (available_reservation_tokens)
- Status transitions: pending → approved → confirmed

### Dancer Router (`dancer.ts`)

Manages dancer profiles and relationships.

**Key Procedures:**
- `create` - Add new dancer to studio
- `list` - List dancers (filterable by studio, age, status)
- `getById` - Get dancer with entry history
- `update` - Update dancer details (name, DOB, level)
- `batchCreate` - Bulk import dancers from CSV/Excel
- `delete` - Archive dancer (soft delete)

**Validation:**
- Age validation against age groups when creating entries
- Unique constraint: (first_name, last_name, date_of_birth, studio_id)

### Studio Router (`studio.ts`)

Studio account management and settings.

**Key Procedures:**
- `create` - Register new studio account
- `list` - List studios (directors only)
- `getById` - Get studio with dancers and reservations
- `update` - Update studio details and settings
- `getStats` - Get studio analytics (entries, dancers, invoices)

### Competition Router (`competition.ts`)

Competition setup and configuration (directors only).

**Key Procedures:**
- `create` - Create new competition with settings
- `list` - List competitions (public: active only, directors: all)
- `getById` - Get competition with categories and schedule
- `update` - Update competition details and rules
- `publish` - Make competition visible to studios
- `close` - Close registration and finalize entries

**Settings Include:**
- Date range and venue details
- Age groups and entry size categories
- Pricing (base fees, per-dancer fees, late fees)
- Capacity (reservation tokens, venue capacity)
- Scoring rubric and judge assignments

## Validation Layers

CompPortal uses multi-layer validation:

1. **Zod Schema Validation** (Type safety)
   - Validates input types and structure
   - Defined inline in each router's `.input()` clause
   - Example: `z.object({ entry_name: z.string().min(1).max(100) })`

2. **Business Rule Validation** (Domain logic) - **Wave 2.2**
   - Validates domain constraints and relationships
   - Defined in `src/lib/validators/businessRules.ts`
   - Example: `validateEntrySizeCategory(categoryId, participantCount)`

3. **Database Constraints** (Data integrity)
   - Foreign keys, unique constraints, check constraints
   - Defined in Prisma schema (`prisma/schema.prisma`)

Example Flow:
```typescript
export const entryRouter = router({
  create: protectedProcedure
    .input(z.object({
      entry_name: z.string(),
      participants: z.array(z.object({ dancer_id: z.string() })),
      entry_size_category_id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Layer 1: Zod validation (automatic)
      // ✅ input is now type-safe

      // Layer 2: Business rules
      const participantCount = input.participants.length;
      validateMinimumParticipants(participantCount); // Must have >= 1
      await validateEntrySizeCategory(input.entry_size_category_id, participantCount);

      // Layer 3: Database constraints (automatic on insert)
      return await prisma.competition_entries.create({ data: input });
    }),
});
```

## Error Handling

tRPC errors follow this structure:

```typescript
import { TRPCError } from '@trpc/server';

throw new TRPCError({
  code: 'BAD_REQUEST',        // HTTP-style error codes
  message: 'User-friendly message',
  cause: originalError,        // Optional: underlying error
});
```

**Common Error Codes:**
- `BAD_REQUEST` - Invalid input or business rule violation
- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Logged in but insufficient permissions
- `NOT_FOUND` - Resource doesn't exist
- `CONFLICT` - Duplicate entry or constraint violation
- `INTERNAL_SERVER_ERROR` - Unexpected server error

**Client-Side Handling:**
```typescript
const createEntry = api.entry.create.useMutation({
  onError: (error) => {
    if (error.data?.code === 'BAD_REQUEST') {
      toast.error(error.message); // Show user-friendly message
    } else {
      toast.error('An unexpected error occurred');
    }
  },
  onSuccess: () => {
    toast.success('Entry created successfully!');
  },
});
```

## Performance Considerations

### Pagination

Large lists should use cursor-based pagination:

```typescript
export const entryRouter = router({
  list: protectedProcedure
    .input(z.object({
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const entries = await prisma.competition_entries.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { created_at: 'desc' },
      });

      let nextCursor: string | undefined = undefined;
      if (entries.length > input.limit) {
        const nextItem = entries.pop();
        nextCursor = nextItem!.id;
      }

      return { items: entries, nextCursor };
    }),
});
```

### Caching

React Query automatically caches tRPC responses. Configure in `src/providers/trpc-provider.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});
```

### Invalidation

Invalidate cache after mutations:

```typescript
const utils = api.useUtils();
const createEntry = api.entry.create.useMutation({
  onSuccess: () => {
    utils.entry.list.invalidate(); // Refetch entry lists
  },
});
```

## Testing

See `src/lib/validators/businessRules.test.ts` for testing examples.

**Test Structure:**
```typescript
import { describe, it, expect } from 'vitest';
import { validateMinimumParticipants } from './businessRules';

describe('validateMinimumParticipants', () => {
  it('should pass when participant count is 1 or more', () => {
    expect(() => validateMinimumParticipants(1)).not.toThrow();
  });

  it('should throw error when participant count is less than 1', () => {
    expect(() => validateMinimumParticipants(0)).toThrow(
      'At least one dancer is required for an entry'
    );
  });
});
```

Run tests:
```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## Development Workflow

1. **Define Router**: Create/modify router in `src/server/routers/`
2. **Add Validation**: Add business rules in `src/lib/validators/businessRules.ts`
3. **Write Tests**: Create tests for validators
4. **Use in UI**: Import via `api.router.procedure.useQuery()` or `.useMutation()`
5. **Build**: Run `npm run build` to verify type safety

## Additional Resources

- [tRPC Documentation](https://trpc.io/docs)
- [Prisma Schema Reference](../prisma/schema.prisma)
- [Business Rule Validators](../lib/validators/businessRules.ts)
- [Environment Variables](../lib/env.ts)
- [Project Status](../../PROJECT_STATUS.md)
