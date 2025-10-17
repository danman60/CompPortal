import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { renderEntrySubmitted, getEmailSubject, type EntrySubmittedData } from '@/lib/email-templates';
import { logActivity } from '@/lib/activity';
import { logger } from '@/lib/logger';

// Validation schema for entry participant
const entryParticipantSchema = z.object({
  dancer_id: z.string().uuid(),
  dancer_name: z.string().max(255),
  dancer_age: z.number().int().min(0).optional(),
  role: z.string().max(100).optional(),
  display_order: z.number().int().min(0).optional(),
  costume_size: z.string().max(20).optional(),
  special_needs: z.string().optional(),
});

// Validation schema for entry input
const entryInputSchema = z.object({
  competition_id: z.string().uuid(),
  reservation_id: z.string().uuid().optional(),
  studio_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  category_id: z.string().uuid(),
  classification_id: z.string().uuid(),
  age_group_id: z.string().uuid().optional(), // Optional - auto-detected from dancers
  entry_size_category_id: z.string().uuid().optional(), // Optional - auto-detected from dancers
  session_id: z.string().uuid().optional(),
  performance_date: z.string().optional(), // ISO date string
  performance_time: z.string().optional(), // ISO time string
  duration: z.string().optional(), // Duration in format "HH:MM:SS"
  warm_up_time: z.string().optional(), // ISO time string
  heat: z.string().max(50).optional(),
  running_order: z.number().int().min(0).optional(),
  is_title_upgrade: z.boolean().default(false),
  is_title_interview: z.boolean().default(false),
  is_improvisation: z.boolean().default(false),
  is_glow_off_round: z.boolean().default(false),
  is_overall_competition: z.boolean().default(false),
  music_title: z.string().max(255).optional(),
  music_artist: z.string().max(255).optional(),
  music_file_url: z.string().url().optional().or(z.literal('')),
  special_requirements: z.string().optional(),
  entry_fee: z.number().min(0).optional(),
  late_fee: z.number().min(0).default(0),
  total_fee: z.number().min(0).optional(),
  status: z.enum(['draft', 'registered', 'confirmed', 'cancelled', 'completed']).default('draft'),
  choreographer: z.string().max(255).optional(),
  costume_description: z.string().optional(),
  props_required: z.string().optional(),
  accessibility_needs: z.string().optional(),
  participants: z.array(entryParticipantSchema).optional(),
});

export const entryRouter = router({
  // Get routine summary for a studio & competition
  getSummary: protectedProcedure
    .input(z.object({ studioId: z.string().uuid(), competitionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const { studioId, competitionId } = input;

      const [entries, reservation] = await Promise.all([
        prisma.competition_entries.findMany({
          where: { studio_id: studioId, competition_id: competitionId, status: { not: 'cancelled' } },
          select: { total_fee: true },
        }),
        prisma.reservations.findFirst({
          where: { studio_id: studioId, competition_id: competitionId, status: { in: ['approved', 'pending'] } },
          select: { spaces_confirmed: true },
        }),
      ]);

      const totalRoutines = entries.length;
      const estimatedCost = entries.reduce((sum: number, e: any) => sum + Number(e.total_fee || 0), 0);
      const confirmed = reservation?.spaces_confirmed || 0;

      return {
        totalRoutines,
        estimatedCost,
        remainingTokens: Math.max(confirmed - totalRoutines, 0),
        status: 'draft',
      };
    }),

  // Submit routine summary (lock & request invoice) - placeholder no-op
  submitSummary: protectedProcedure
    .input(z.object({ studioId: z.string().uuid(), competitionId: z.string().uuid() }))
    .mutation(async () => {
      return { success: true };
    }),

  // Download routine summary PDF - placeholder link
  downloadSummaryPDF: protectedProcedure
    .input(z.object({ studioId: z.string().uuid(), competitionId: z.string().uuid() }))
    .mutation(async () => {
      return { url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/entries` };
    }),

  // Bulk import routines from CSV-like input
  bulkImport: protectedProcedure
    .input(z.object({
      competition_id: z.string().uuid(),
      studio_id: z.string().uuid(),
      routines: z.array(z.object({
        routine_title: z.string().min(1),
        choreographer: z.string().optional(),
        dance_category: z.string().min(1),
        classification: z.string().min(1),
        props: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { competition_id, studio_id, routines } = input;

      const defaultAge = await prisma.age_groups.findFirst({ orderBy: { sort_order: 'asc' } });
      if (!defaultAge) throw new Error('No age groups configured');
      const defaultSize = await prisma.entry_size_categories.findFirst({ orderBy: { sort_order: 'asc' }, select: { id: true } });
      if (!defaultSize) throw new Error('No size categories configured');

      const results = await Promise.allSettled(routines.map(async (row) => {
        const category = await prisma.dance_categories.findFirst({ where: { name: { equals: row.dance_category, mode: 'insensitive' } }, select: { id: true } });
        const classification = await prisma.classifications.findFirst({ where: { name: { equals: row.classification, mode: 'insensitive' } }, select: { id: true } });
        if (!category || !classification) {
          throw new Error(`Lookup failed for category '${row.dance_category}' or classification '${row.classification}'`);
        }
        return prisma.competition_entries.create({
          data: {
            tenant_id: ctx.tenantId!,
            competition_id,
            studio_id,
            title: row.routine_title,
            category_id: category.id,
            classification_id: classification.id,
            age_group_id: defaultAge.id,
            entry_size_category_id: defaultSize.id,
            status: 'draft',
            choreographer: row.choreographer || undefined,
            special_requirements: row.props || undefined,
            entry_fee: new (require('@prisma/client').Prisma.Decimal)(0),
            total_fee: new (require('@prisma/client').Prisma.Decimal)(0),
          },
        });
      }));

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - successful;
      const errors = results
        .filter((r) => r.status === 'rejected')
        .map((r: any) => r.reason?.message || 'Unknown error');

      return { successful, failed, total: results.length, errors };
    }),
  // Get all entries with optional filtering (role-based access)
  getAll: protectedProcedure
    .input(
      z
        .object({
          studioId: z.string().uuid().optional(),
          competitionId: z.string().uuid().optional(),
          reservationId: z.string().uuid().optional(),
          status: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input = {}, ctx }) => {
      const { studioId, competitionId, reservationId, status, limit = 50, offset = 0 } = input;

      const where: any = {};

      // Role-based filtering: studio directors can only see their own entries
      if (ctx.userRole === 'studio_director') {
        if (!ctx.studioId) {
          return { entries: [], total: 0, limit, offset, hasMore: false };
        }
        where.studio_id = ctx.studioId;
      } else if (studioId) {
        // Admins can filter by specific studio
        where.studio_id = studioId;
      }

      if (competitionId) {
        where.competition_id = competitionId;
      }

      if (reservationId) {
        where.reservation_id = reservationId;
      }

      if (status) {
        where.status = status;
      }

      const [entries, total] = await Promise.all([
        prisma.competition_entries.findMany({
          where,
          select: {
            id: true,
            title: true,
            status: true,
            entry_number: true,
            entry_suffix: true,
            is_late_entry: true,
            competition_id: true,
            studio_id: true,
            music_file_url: true,
            music_title: true,
            music_artist: true,
            created_at: true,
            total_fee: true,
            studios: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            competitions: {
              select: {
                id: true,
                name: true,
                year: true,
              },
            },
            age_groups: {
              select: {
                id: true,
                name: true,
              },
            },
            dance_categories: {
              select: {
                id: true,
                name: true,
              },
            },
            entry_participants: {
              select: {
                id: true,
                dancer_id: true,
                dancer_name: true,
                role: true,
              },
              orderBy: { display_order: 'asc' },
              take: 4, // Only fetch first 4 participants for list view
            },
          },
          orderBy: [
            { entry_number: 'asc' },
          ],
          take: limit,
          skip: offset,
        }),
        prisma.competition_entries.count({ where }),
      ]);

      return {
        entries,
        total,
        limit,
        offset,
        hasMore: offset + entries.length < total,
      };
    }),

  // Get a single entry by ID (role-based access)
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const entry = await prisma.competition_entries.findUnique({
        where: { id: input.id },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              province: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
              competition_start_date: true,
            },
          },
          entry_participants: {
            include: {
              dancers: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  date_of_birth: true,
                  email: true,
                  phone: true,
                },
              },
            },
            orderBy: { display_order: 'asc' },
          },
          age_groups: true,
          dance_categories: true,
          classifications: true,
          entry_size_categories: true,
          competition_sessions: true,
        },
      });

      if (!entry) {
        throw new Error('Entry not found');
      }

      // Studio directors can only access their own studio's entries
      if (ctx.userRole === 'studio_director' && entry.studio_id !== ctx.studioId) {
        throw new Error('Unauthorized access to this entry');
      }

      return entry;
    }),

  // Get entries by studio
  getByStudio: publicProcedure
    .input(z.object({ studioId: z.string().uuid() }))
    .query(async ({ input }) => {
      const entries = await prisma.competition_entries.findMany({
        where: { studio_id: input.studioId },
        include: {
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
            },
          },
          entry_participants: {
            select: {
              id: true,
              dancer_name: true,
            },
          },
          _count: {
            select: {
              entry_participants: true,
            },
          },
        },
        orderBy: [
          { entry_number: 'asc' },
        ],
      });

      return {
        entries,
        count: entries.length,
      };
    }),

  // Get entry statistics
  getStats: publicProcedure
    .input(
      z
        .object({
          competitionId: z.string().uuid().optional(),
          studioId: z.string().uuid().optional(),
        })
        .optional()
    )
    .query(async ({ input = {} }) => {
      const where: any = {};

      if (input.competitionId) {
        where.competition_id = input.competitionId;
      }

      if (input.studioId) {
        where.studio_id = input.studioId;
      }

      const [total, byStatus, totalFees] = await Promise.all([
        prisma.competition_entries.count({ where }),
        prisma.competition_entries.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        prisma.competition_entries.aggregate({
          where,
          _sum: {
            entry_fee: true,
            late_fee: true,
            total_fee: true,
          },
        }),
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status || 'unknown'] = item._count;
          return acc;
        }, {} as Record<string, number>),
        totalEntryFees: totalFees._sum.entry_fee || 0,
        totalLateFees: totalFees._sum.late_fee || 0,
        totalFees: totalFees._sum.total_fee || 0,
      };
    }),

  // Create a new entry with participants
  create: publicProcedure
    .input(entryInputSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        performance_date,
        performance_time,
        warm_up_time,
        entry_fee,
        late_fee,
        total_fee,
        participants,
        ...data
      } = input;

      // If reservation ID provided, validate it and enforce space limits
      if (input.reservation_id) {
        const reservation = await prisma.reservations.findUnique({
          where: { id: input.reservation_id },
          include: {
            _count: {
              select: {
                competition_entries: true,
              },
            },
          },
        });

        if (!reservation) {
          throw new Error('Reservation not found.');
        }

        if (reservation.status !== 'approved') {
          throw new Error('Reservation must be approved before creating routines.');
        }

        if (reservation.studio_id !== input.studio_id || reservation.competition_id !== input.competition_id) {
          throw new Error('Invalid reservation for this studio and competition.');
        }

        const currentEntries = reservation._count.competition_entries;
        const confirmedSpaces = reservation.spaces_confirmed || 0;

        if (currentEntries >= confirmedSpaces) {
          throw new Error(
            `Reservation capacity exceeded. Confirmed: ${confirmedSpaces}, Current: ${currentEntries}`
          );
        }
      }

      // Get tenant_id from studio (this is a publicProcedure, so ctx.tenantId might be null)
      const studio = await prisma.studios.findUnique({
        where: { id: data.studio_id },
        select: { tenant_id: true },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      // Get defaults for age_group and entry_size_category if not provided (required by schema)
      let ageGroupId = data.age_group_id;
      let entrySizeCategoryId = data.entry_size_category_id;

      if (!ageGroupId) {
        const defaultAge = await prisma.age_groups.findFirst({ orderBy: { sort_order: 'asc' } });
        if (!defaultAge) throw new Error('No age groups configured');
        ageGroupId = defaultAge.id;
      }

      if (!entrySizeCategoryId) {
        const defaultSize = await prisma.entry_size_categories.findFirst({ orderBy: { sort_order: 'asc' }, select: { id: true } });
        if (!defaultSize) throw new Error('No size categories configured');
        entrySizeCategoryId = defaultSize.id;
      }

      // Create entry with participants
      // Build Prisma data object using relation connect syntax (not foreign key IDs)
      const createData: any = {
        title: data.title,
        status: data.status,
        is_title_upgrade: data.is_title_upgrade,
        is_title_interview: data.is_title_interview,
        is_improvisation: data.is_improvisation,
        is_glow_off_round: data.is_glow_off_round,
        is_overall_competition: data.is_overall_competition,
        // Use Prisma relation connect syntax for foreign keys
        tenants: { connect: { id: studio.tenant_id } },
        competitions: { connect: { id: data.competition_id } },
        studios: { connect: { id: data.studio_id } },
        dance_categories: { connect: { id: data.category_id } },
        classifications: { connect: { id: data.classification_id } },
      };

      // Required relation fields (use defaults if not provided)
      createData.age_groups = { connect: { id: ageGroupId } };
      createData.entry_size_categories = { connect: { id: entrySizeCategoryId } };

      // Optional relation fields
      if (data.reservation_id) createData.reservations = { connect: { id: data.reservation_id } };
      if (data.session_id) createData.competition_sessions = { connect: { id: data.session_id } };

      // Optional string fields
      if (data.choreographer) createData.choreographer = data.choreographer;
      if (data.props_required) createData.props_required = data.props_required;
      if (data.special_requirements) createData.special_requirements = data.special_requirements;
      if (data.costume_description) createData.costume_description = data.costume_description;
      if (data.accessibility_needs) createData.accessibility_needs = data.accessibility_needs;
      if (data.music_title) createData.music_title = data.music_title;
      if (data.music_artist) createData.music_artist = data.music_artist;
      if (data.music_file_url) createData.music_file_url = data.music_file_url;
      if (data.heat) createData.heat = data.heat;
      if (data.running_order !== undefined) createData.running_order = data.running_order;
      if (data.duration) createData.duration = data.duration;

      // Date/time fields
      if (performance_date) createData.performance_date = new Date(performance_date);
      if (performance_time) createData.performance_time = new Date(`1970-01-01T${performance_time}`);
      if (warm_up_time) createData.warm_up_time = new Date(`1970-01-01T${warm_up_time}`);

      // Fee fields - calculate from size category if not provided
      let finalEntryFee = entry_fee;
      let finalTotalFee = total_fee;

      if (finalEntryFee === undefined || finalEntryFee === 0) {
        // Auto-calculate from entry_size_category pricing
        const sizeCategory = await prisma.entry_size_categories.findUnique({
          where: { id: entrySizeCategoryId },
          select: { base_fee: true, per_participant_fee: true },
        });

        if (sizeCategory) {
          const baseFee = Number(sizeCategory.base_fee || 0);
          const perParticipantFee = Number(sizeCategory.per_participant_fee || 0);
          const participantCount = participants?.length || 0;
          finalEntryFee = baseFee + (perParticipantFee * participantCount);
          finalTotalFee = finalEntryFee + (late_fee || 0);
        }
      }

      if (finalEntryFee !== undefined) createData.entry_fee = finalEntryFee.toString();
      if (late_fee !== undefined) createData.late_fee = late_fee.toString();
      if (finalTotalFee !== undefined) createData.total_fee = finalTotalFee.toString();

      // Participants (nested create)
      if (participants && participants.length > 0) {
        createData.entry_participants = {
          create: participants.map((p) =>
            // Remove undefined values from each participant
            Object.fromEntries(
              Object.entries({
                dancer_id: p.dancer_id,
                dancer_name: p.dancer_name,
                dancer_age: p.dancer_age,
                role: p.role,
                display_order: p.display_order,
                costume_size: p.costume_size,
                special_needs: p.special_needs,
              }).filter(([_, value]) => value !== undefined)
            )
          ),
        };
      }

      const entry = await prisma.competition_entries.create({
        data: createData,
        include: {
          entry_participants: {
            include: {
              dancers: true,
            },
          },
          studios: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Activity logging (non-blocking, only if user is authenticated)
      if (ctx.userId) {
        try {
          await logActivity({
            userId: ctx.userId,
            studioId: ctx.studioId || input.studio_id,
            action: 'entry.create',
            entityType: 'entry',
            entityId: entry.id,
            details: {
              title: entry.title,
              competition_id: entry.competition_id,
              studio_id: entry.studio_id,
              category_id: entry.category_id,
              classification_id: entry.classification_id,
            },
          });
        } catch (err) {
          logger.error('Failed to log activity (entry.create)', { error: err instanceof Error ? err : new Error(String(err)) });
        }
      }

      // Send email notification
      try {
        // Fetch additional data for email
        const [studio, competition, category, sizeCategory] = await Promise.all([
          prisma.studios.findUnique({
            where: { id: input.studio_id },
            select: { name: true, email: true },
          }),
          prisma.competitions.findUnique({
            where: { id: input.competition_id },
            select: { name: true, year: true },
          }),
          prisma.dance_categories.findUnique({
            where: { id: input.category_id },
            select: { name: true },
          }),
          // Size category is optional now (auto-detected from dancers)
          input.entry_size_category_id ? prisma.entry_size_categories.findUnique({
            where: { id: input.entry_size_category_id },
            select: { name: true },
          }) : Promise.resolve(null),
        ]);

        if (studio?.email && competition && category) {
          const emailData: EntrySubmittedData = {
            studioName: studio.name,
            competitionName: competition.name,
            competitionYear: competition.year,
            entryTitle: entry.title,
            entryNumber: entry.entry_number || undefined,
            category: category.name,
            sizeCategory: sizeCategory?.name || 'TBD', // TBD if not set (auto-detected later)
            participantCount: entry.entry_participants?.length || 0,
            entryFee: entry_fee || 0,
          };

          const html = await renderEntrySubmitted(emailData);
          const subject = getEmailSubject('entry', {
            entryTitle: entry.title,
            competitionName: competition.name,
          });

          await sendEmail({
            to: studio.email,
            subject,
            html,
          });
        }
      } catch (emailError) {
        logger.error('Failed to send entry submission email', { error: emailError instanceof Error ? emailError : new Error(String(emailError)) });
        // Don't fail the mutation if email fails
      }

      return entry;
    }),

  // Update an entry
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: entryInputSchema.partial().omit({ participants: true }),
      })
    )
    .mutation(async ({ input }) => {
      const {
        performance_date,
        performance_time,
        warm_up_time,
        entry_fee,
        late_fee,
        total_fee,
        ...data
      } = input.data;

      const entry = await prisma.competition_entries.update({
        where: { id: input.id },
        data: {
          ...data,
          performance_date: performance_date ? new Date(performance_date) : undefined,
          performance_time: performance_time ? new Date(`1970-01-01T${performance_time}`) : undefined,
          warm_up_time: warm_up_time ? new Date(`1970-01-01T${warm_up_time}`) : undefined,
          entry_fee: entry_fee?.toString(),
          late_fee: late_fee?.toString(),
          total_fee: total_fee?.toString(),
          updated_at: new Date(),
        },
        include: {
          entry_participants: {
            include: {
              dancers: true,
            },
          },
        },
      });

      return entry;
    }),

  // Add participant to entry
  addParticipant: publicProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        participant: entryParticipantSchema,
      })
    )
    .mutation(async ({ input }) => {
      // Check if this dancer is already assigned to this entry
      const existingParticipant = await prisma.entry_participants.findFirst({
        where: {
          entry_id: input.entryId,
          dancer_id: input.participant.dancer_id,
        },
      });

      if (existingParticipant) {
        // Return the existing participant instead of throwing error
        return existingParticipant;
      }

      // Create new participant
      const participant = await prisma.entry_participants.create({
        data: {
          entry_id: input.entryId,
          dancer_id: input.participant.dancer_id,
          dancer_name: input.participant.dancer_name,
          dancer_age: input.participant.dancer_age,
          role: input.participant.role,
          display_order: input.participant.display_order,
          costume_size: input.participant.costume_size,
          special_needs: input.participant.special_needs,
        },
        include: {
          dancers: true,
        },
      });

      return participant;
    }),

  // Remove participant from entry
  removeParticipant: publicProcedure
    .input(
      z.object({
        participantId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      await prisma.entry_participants.delete({
        where: { id: input.participantId },
      });

      return { success: true, message: 'Participant removed successfully' };
    }),

  // Delete an entry
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // 🔐 TRANSACTION: Wrap delete operation for atomicity and consistency
      await prisma.$transaction(async (tx) => {
        // Delete entry (participants will cascade delete via DB constraints)
        await tx.competition_entries.delete({
          where: { id: input.id },
        });
      });

      return { success: true, message: 'Entry deleted successfully' };
    }),

  // Cancel an entry
  cancel: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const entry = await prisma.competition_entries.update({
        where: { id: input.id },
        data: {
          status: 'cancelled',
          updated_at: new Date(),
        },
      });

      return entry;
    }),

  // Confirm an entry (draft -> registered)
  confirm: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const entry = await prisma.competition_entries.update({
        where: { id: input.id },
        data: {
          status: 'confirmed',
          updated_at: new Date(),
        },
      });

      return entry;
    }),

  // Update music file URL
  updateMusic: publicProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        musicFileUrl: z.string().url().optional().nullable(),
        musicTitle: z.string().max(255).optional(),
        musicArtist: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const entry = await prisma.competition_entries.update({
        where: { id: input.entryId },
        data: {
          music_file_url: input.musicFileUrl || null,
          music_title: input.musicTitle,
          music_artist: input.musicArtist,
          updated_at: new Date(),
        },
      });

      return entry;
    }),
});
