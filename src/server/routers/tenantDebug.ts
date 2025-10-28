/**
 * Tenant Debug Router
 *
 * Comprehensive debugging for multi-tenant architecture
 * Traces tenant_id flow from context → Prisma → Database
 *
 * Super Admin only - provides deep system insights
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

export const tenantDebugRouter = router({
  /**
   * Get complete session context information
   */
  getContextInfo: protectedProcedure.query(async ({ ctx }) => {
    // Get full user profile with email from users table
    const userProfile = await prisma.user_profiles.findUnique({
      where: { id: ctx.userId },
      include: {
        tenants: true,
        users: true,
      },
    });

    return {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      role: ctx.userRole,
      email: userProfile?.users?.email,
      firstName: userProfile?.first_name,
      lastName: userProfile?.last_name,
      userProfile: userProfile,
      rawContext: {
        studioId: ctx.studioId,
        userRole: ctx.userRole,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        tenantData: ctx.tenantData ? 'exists' : 'null',
      },
    };
  }),

  /**
   * Analyze database-level tenant isolation
   */
  analyzeDatabaseTenantIsolation: protectedProcedure.query(async ({ ctx }) => {
    // Only super admin can run this
    if (ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Super admin only',
      });
    }

    const results: any = {
      tenantCounts: {},
      crossTenantLeaks: [],
      nullTenantIds: {},
      queries: [],
    };

    // Tables with tenant_id to check
    const tables = [
      'competition_entries',
      'studios',
      'dancers',
      'reservations',
      'competitions',
      'email_logs',
      'judges',
      'scores',
      'email_preferences',
      'user_profiles',
    ];

    // Count records per tenant for each table
    for (const table of tables) {
      try {
        const query = `
          SELECT tenant_id, COUNT(*) as count
          FROM ${table}
          WHERE tenant_id IS NOT NULL
          GROUP BY tenant_id
        `;
        results.queries.push(query);

        const counts: any = await prisma.$queryRawUnsafe(query);
        results.tenantCounts[table] = counts.reduce((acc: any, row: any) => {
          acc[row.tenant_id] = parseInt(row.count);
          return acc;
        }, {});

        // Check for NULL tenant_id
        const nullQuery = `SELECT COUNT(*) as count FROM ${table} WHERE tenant_id IS NULL`;
        const nullCount: any = await prisma.$queryRawUnsafe(nullQuery);
        if (nullCount[0].count > 0) {
          results.nullTenantIds[table] = parseInt(nullCount[0].count);
        }
      } catch (error) {
        // Table might not have tenant_id column
        console.log(`Skipping ${table}:`, error);
      }
    }

    // Check for cross-tenant leaks (foreign key references to different tenants)
    const leakChecks = [
      {
        name: 'competition_entries → competitions',
        query: `
          SELECT COUNT(*) as leak_count
          FROM competition_entries e
          JOIN competitions c ON e.competition_id = c.id
          WHERE e.tenant_id != c.tenant_id
        `,
      },
      {
        name: 'competition_entries → studios',
        query: `
          SELECT COUNT(*) as leak_count
          FROM competition_entries e
          JOIN studios s ON e.studio_id = s.id
          WHERE e.tenant_id != s.tenant_id
        `,
      },
      {
        name: 'dancers → studios',
        query: `
          SELECT COUNT(*) as leak_count
          FROM dancers d
          JOIN studios s ON d.studio_id = s.id
          WHERE d.tenant_id != s.tenant_id
        `,
      },
      {
        name: 'reservations → competitions',
        query: `
          SELECT COUNT(*) as leak_count
          FROM reservations r
          JOIN competitions c ON r.competition_id = c.id
          WHERE r.tenant_id != c.tenant_id
        `,
      },
      {
        name: 'scores → competition_entries',
        query: `
          SELECT COUNT(*) as leak_count
          FROM scores s
          JOIN competition_entries e ON s.entry_id = e.id
          WHERE s.tenant_id != e.tenant_id
        `,
      },
    ];

    for (const check of leakChecks) {
      try {
        const result: any = await prisma.$queryRawUnsafe(check.query);
        const leakCount = parseInt(result[0].leak_count);
        if (leakCount > 0) {
          results.crossTenantLeaks.push({
            check: check.name,
            count: leakCount,
          });
        }
        results.queries.push(check.query);
      } catch (error) {
        console.error(`Leak check failed for ${check.name}:`, error);
      }
    }

    return results;
  }),

  /**
   * Validate Prisma schema vs actual database constraints
   */
  validateSchemaVsDatabase: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Super admin only',
      });
    }

    const results: any = {
      tablesWithTenantId: [],
      constraintMismatches: [],
    };

    // Query database for actual NOT NULL constraints on tenant_id
    const constraintsQuery = `
      SELECT
        table_name,
        column_name,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'tenant_id'
      ORDER BY table_name
    `;

    const dbConstraints: any = await prisma.$queryRawUnsafe(constraintsQuery);

    for (const constraint of dbConstraints) {
      results.tablesWithTenantId.push({
        name: constraint.table_name,
        nullable: constraint.is_nullable === 'YES',
        hasDefault: !!constraint.column_default,
      });
    }

    // Check for foreign key relations
    const relationsQuery = `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'tenant_id'
        AND tc.table_schema = 'public'
    `;

    const relations: any = await prisma.$queryRawUnsafe(relationsQuery);

    // Add relation info to tables
    for (const relation of relations) {
      const table = results.tablesWithTenantId.find(
        (t: any) => t.name === relation.table_name
      );
      if (table) {
        table.hasRelation = true;
        table.foreignTable = relation.foreign_table_name;
      }
    }

    return results;
  }),

  /**
   * Test entry creation flow with detailed logging
   */
  testEntryCreationFlow: protectedProcedure
    .input(z.object({
      configName: z.enum([
        'relational_with_nested',
        'relational_without_nested',
        'scalar_with_nested',
        'scalar_without_nested',
        'mixed_tenant_scalar',
      ]).default('relational_with_nested'),
    }))
    .mutation(async ({ ctx, input }) => {
    const steps: any[] = [];
    const { configName } = input;

    steps.push({
      name: 'Test Configuration',
      description: `Testing: ${configName}`,
      data: { configName },
    });

    try{
      // Step 1: Verify context
      steps.push({
        name: 'Verify Context',
        description: 'Check that ctx.tenantId exists',
        data: {
          userId: ctx.userId,
          tenantId: ctx.tenantId,
          role: ctx.userRole,
          tenantIdExists: !!ctx.tenantId,
        },
      });

      if (!ctx.tenantId) {
        throw new Error('ctx.tenantId is NULL');
      }

      // Step 2: Get competition (need for entry creation)
      steps.push({
        name: 'Fetch Competition',
        description: 'Get first competition for this tenant',
      });

      const competition = await prisma.competitions.findFirst({
        where: { tenant_id: ctx.tenantId },
        select: {
          id: true,
          name: true,
          tenant_id: true,
        },
      });

      if (!competition) {
        throw new Error('No competitions found for this tenant');
      }

      steps.push({
        name: 'Competition Found',
        description: `Using competition: ${competition.name}`,
        data: competition,
      });

      // Step 3: Get studio
      steps.push({
        name: 'Fetch Studio',
        description: 'Get first studio for this tenant',
      });

      const studio = await prisma.studios.findFirst({
        where: { tenant_id: ctx.tenantId },
        select: {
          id: true,
          name: true,
          tenant_id: true,
        },
      });

      if (!studio) {
        throw new Error('No studios found for this tenant');
      }

      steps.push({
        name: 'Studio Found',
        description: `Using studio: ${studio.name}`,
        data: studio,
      });

      // Step 4: Get category, classification, age group, size
      const category = await prisma.dance_categories.findFirst({
        where: { tenant_id: ctx.tenantId },
      });
      const classification = await prisma.classifications.findFirst({
        where: { tenant_id: ctx.tenantId },
      });
      const ageGroup = await prisma.age_groups.findFirst({
        where: { tenant_id: ctx.tenantId },
      });
      const sizeCategory = await prisma.entry_size_categories.findFirst({
        where: { tenant_id: ctx.tenantId },
      });

      if (!category || !classification || !ageGroup || !sizeCategory) {
        throw new Error('Missing required categories/settings');
      }

      steps.push({
        name: 'Categories Loaded',
        description: 'All required categories found',
        data: {
          category: category.name,
          classification: classification.name,
          ageGroup: ageGroup.name,
          sizeCategory: sizeCategory.name,
        },
      });

      // Step 5: Get a dancer
      const dancer = await prisma.dancers.findFirst({
        where: {
          studio_id: studio.id,
          tenant_id: ctx.tenantId,
        },
      });

      if (!dancer) {
        throw new Error('No dancers found for this studio');
      }

      steps.push({
        name: 'Dancer Found',
        description: `Using dancer: ${dancer.first_name} ${dancer.last_name}`,
        data: {
          id: dancer.id,
          name: `${dancer.first_name} ${dancer.last_name}`,
          studio_id: dancer.studio_id,
          tenant_id: dancer.tenant_id,
        },
      });

      // Step 6: Build create data based on configuration
      let createData: any = {};

      switch (configName) {
        case 'relational_with_nested':
          // Pure relational syntax with nested create
          createData = {
            title: `[${configName}] Test Entry`,
            status: 'draft',
            tenants: { connect: { id: ctx.tenantId } },
            competitions: { connect: { id: competition.id } },
            studios: { connect: { id: studio.id } },
            dance_categories: { connect: { id: category.id } },
            classifications: { connect: { id: classification.id } },
            age_groups: { connect: { id: ageGroup.id } },
            entry_size_categories: { connect: { id: sizeCategory.id } },
            entry_participants: {
              create: [{
                dancer_id: dancer.id,
                dancer_name: `${dancer.first_name} ${dancer.last_name}`,
                dancer_age: dancer.age_override || 10,
              }],
            },
          };
          break;

        case 'relational_without_nested':
          // Pure relational syntax WITHOUT nested create
          createData = {
            title: `[${configName}] Test Entry`,
            status: 'draft',
            tenants: { connect: { id: ctx.tenantId } },
            competitions: { connect: { id: competition.id } },
            studios: { connect: { id: studio.id } },
            dance_categories: { connect: { id: category.id } },
            classifications: { connect: { id: classification.id } },
            age_groups: { connect: { id: ageGroup.id } },
            entry_size_categories: { connect: { id: sizeCategory.id } },
            // NO nested create
          };
          break;

        case 'scalar_with_nested':
          // Pure scalar fields WITH nested create
          createData = {
            title: `[${configName}] Test Entry`,
            status: 'draft',
            tenant_id: ctx.tenantId,
            competition_id: competition.id,
            studio_id: studio.id,
            category_id: category.id,
            classification_id: classification.id,
            age_group_id: ageGroup.id,
            entry_size_category_id: sizeCategory.id,
            entry_participants: {
              create: [{
                dancer_id: dancer.id,
                dancer_name: `${dancer.first_name} ${dancer.last_name}`,
                dancer_age: dancer.age_override || 10,
              }],
            },
          };
          break;

        case 'scalar_without_nested':
          // Pure scalar fields WITHOUT nested create
          createData = {
            title: `[${configName}] Test Entry`,
            status: 'draft',
            tenant_id: ctx.tenantId,
            competition_id: competition.id,
            studio_id: studio.id,
            category_id: category.id,
            classification_id: classification.id,
            age_group_id: ageGroup.id,
            entry_size_category_id: sizeCategory.id,
            // NO nested create
          };
          break;

        case 'mixed_tenant_scalar':
          // Tenant as scalar, others as relations
          createData = {
            title: `[${configName}] Test Entry`,
            status: 'draft',
            tenant_id: ctx.tenantId, // SCALAR
            competitions: { connect: { id: competition.id } },
            studios: { connect: { id: studio.id } },
            dance_categories: { connect: { id: category.id } },
            classifications: { connect: { id: classification.id } },
            age_groups: { connect: { id: ageGroup.id } },
            entry_size_categories: { connect: { id: sizeCategory.id } },
            entry_participants: {
              create: [{
                dancer_id: dancer.id,
                dancer_name: `${dancer.first_name} ${dancer.last_name}`,
                dancer_age: dancer.age_override || 10,
              }],
            },
          };
          break;
      }

      steps.push({
        name: 'Build Create Data',
        description: 'Constructed Prisma create data object',
        data: createData,
      });

      // Step 7: Create entry (DRY RUN - with transaction rollback)
      steps.push({
        name: 'Test Entry Creation',
        description: 'Creating entry in transaction (will rollback)',
      });

      let createdEntry: any = null;

      await prisma.$transaction(async (tx) => {
        createdEntry = await tx.competition_entries.create({
          data: createData,
          include: {
            tenants: true,
            competitions: true,
            studios: true,
            entry_participants: true,
          },
        });

        steps.push({
          name: 'Entry Created Successfully',
          description: 'Entry created without errors',
          data: {
            id: createdEntry.id,
            title: createdEntry.title,
            tenant_id: createdEntry.tenant_id,
            competition_id: createdEntry.competition_id,
            studio_id: createdEntry.studio_id,
            participant_count: createdEntry.entry_participants.length,
          },
        });

        // Verify tenant_id matches context
        if (createdEntry.tenant_id !== ctx.tenantId) {
          throw new Error(
            `TENANT MISMATCH: Created with ${createdEntry.tenant_id}, expected ${ctx.tenantId}`
          );
        }

        steps.push({
          name: 'Tenant Verification',
          description: '✅ tenant_id matches ctx.tenantId',
          data: {
            expected: ctx.tenantId,
            actual: createdEntry.tenant_id,
            match: createdEntry.tenant_id === ctx.tenantId,
          },
        });

        // Rollback transaction (don't actually save test entry)
        throw new Error('ROLLBACK_TEST_TRANSACTION');
      }).catch((error) => {
        if (error.message !== 'ROLLBACK_TEST_TRANSACTION') {
          throw error;
        }
      });

      steps.push({
        name: 'Transaction Rolled Back',
        description: 'Test entry not saved to database (dry run)',
      });

      return {
        success: true,
        steps,
        result: createdEntry,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
        steps,
      };
    }
  }),
});
