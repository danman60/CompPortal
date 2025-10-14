import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { suggestMapping } from '@/lib/import/autoMap';

// NOTE: This is scaffolding for review. It does not perform actual file IO.

export const importRouter = router({
  // Propose fuzzy mapping given headers + sample rows
  proposeMapping: protectedProcedure
    .input(z.object({ headers: z.array(z.string()), sampleRows: z.array(z.record(z.string())), entity: z.enum(['dancers','routines']).optional() }))
    .query(({ input }) => {
      const suggestions = suggestMapping({ headers: input.headers, sampleRows: input.sampleRows as any, contextHint: input.entity });
      return { suggestions };
    }),

  // Preview (dry run) — placeholder validating presence of required mappings
  preview: protectedProcedure
    .input(z.object({ mapping: z.record(z.string(), z.string().nullable()), rows: z.array(z.record(z.any())), entity: z.enum(['dancers','routines']) }))
    .mutation(({ input }) => {
      const errors: { row: number; message: string }[] = [];
      const normalized = input.rows.slice(0, 50).map((row, idx) => {
        const mapped: Record<string, any> = {};
        for (const [src, dst] of Object.entries(input.mapping)) {
          if (!dst) continue;
          mapped[dst] = row[src];
        }
        if (input.entity === 'dancers') {
          if (!mapped.first_name || !mapped.last_name) errors.push({ row: idx + 1, message: 'Missing first/last name' });
        } else {
          if (!mapped.title) errors.push({ row: idx + 1, message: 'Missing routine title' });
        }
        return mapped;
      });
      return { rows: normalized, errors };
    }),

  // Commit (placeholder — returns success without DB writes)
  commit: protectedProcedure
    .input(z.object({ mapping: z.record(z.string(), z.string().nullable()), rows: z.array(z.record(z.any())), entity: z.enum(['dancers','routines']), strategy: z.enum(['create_only','merge_on_duplicate']).default('create_only') }))
    .mutation(() => {
      return { success: true, created: 0, updated: 0, skipped: 0 };
    }),

  // Templates (scaffold)
  templates: router({
    list: protectedProcedure.query(() => ({ templates: [] as any[] })),
    save: protectedProcedure.input(z.object({ name: z.string(), mapping: z.record(z.string(), z.string().nullable()), entity: z.enum(['dancers','routines']) })).mutation(() => ({ success: true })),
    apply: protectedProcedure.input(z.object({ templateId: z.string() })).mutation(() => ({ mapping: {} as Record<string,string|null> })),
  }),
});

