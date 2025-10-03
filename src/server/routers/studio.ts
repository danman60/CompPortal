import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { supabaseAdmin } from '@/lib/supabase-server';

export const studioRouter = router({
  // Get all studios
  getAll: publicProcedure.query(async () => {
    const { data: studios, error } = await supabaseAdmin
      .from('studios')
      .select('id, name, code, city, province, country, status, email, phone, created_at')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch studios: ${error.message}`);
    }

    return {
      studios: studios ?? [],
      count: studios?.length ?? 0,
    };
  }),

  // Get a single studio by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      // Get studio with dancers
      const { data: studio, error: studioError } = await supabaseAdmin
        .from('studios')
        .select('*, dancers(id, first_name, last_name, date_of_birth)')
        .eq('id', input.id)
        .single();

      if (studioError) {
        throw new Error(`Failed to fetch studio: ${studioError.message}`);
      }

      if (!studio) {
        throw new Error('Studio not found');
      }

      // Get counts separately
      const [dancersCount, reservationsCount, entriesCount] = await Promise.all([
        supabaseAdmin.from('dancers').select('id', { count: 'exact', head: true }).eq('studio_id', input.id),
        supabaseAdmin.from('reservations').select('id', { count: 'exact', head: true }).eq('studio_id', input.id),
        supabaseAdmin.from('competition_entries').select('id', { count: 'exact', head: true }).eq('studio_id', input.id),
      ]);

      return {
        ...(studio as Record<string, any>),
        _count: {
          dancers: dancersCount.count ?? 0,
          reservations: reservationsCount.count ?? 0,
          competition_entries: entriesCount.count ?? 0,
        },
      };
    }),

  // Get studios with statistics
  getStats: publicProcedure.query(async () => {
    const [totalResult, pendingResult, approvedResult] = await Promise.all([
      supabaseAdmin.from('studios').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('studios').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('studios').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    ]);

    // Get count of studios with dancers (need to do this differently)
    const { data: studiosWithDancers, error: dancersError } = await supabaseAdmin
      .from('studios')
      .select('id, dancers(id)')
      .not('dancers', 'is', null);

    const withDancersCount = studiosWithDancers?.filter(
      (studio) => studio.dancers && studio.dancers.length > 0
    ).length ?? 0;

    return {
      total: totalResult.count ?? 0,
      pending: pendingResult.count ?? 0,
      approved: approvedResult.count ?? 0,
      withDancers: withDancersCount,
    };
  }),

  // Create a new studio
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        country: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // For now, using a dummy owner_id - will be replaced with actual auth
      const dummyOwnerId = '00000000-0000-0000-0000-000000000000';

      const { data: studio, error } = await supabaseAdmin
        .from('studios')
        .insert({
          name: input.name,
          email: input.email,
          phone: input.phone,
          city: input.city,
          province: input.province,
          country: input.country ?? 'Canada',
          owner_id: dummyOwnerId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create studio: ${error.message}`);
      }

      return studio;
    }),
});
