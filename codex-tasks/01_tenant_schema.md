## Task: Multi-Tenant Database Schema

**Context:**
- We need to add multi-tenancy support to isolate client data
- Each tenant (client) will have their own subdomain (e.g., empwr.compsync.net)
- Existing database has competitions, studios, entries, etc.
- Pattern: Use existing Prisma schema in `prisma/schema.prisma`

**Requirements:**

1. **Create Tenant Model** in `prisma/schema.prisma`:
```prisma
model Tenant {
  id          String   @id @default(uuid())
  slug        String   @unique  // URL-safe name (e.g., "empwr", "demo")
  subdomain   String   @unique  // Subdomain (e.g., "empwr", "demo")
  name        String              // Display name (e.g., "EMPWR Dance")

  // Branding Configuration
  branding    Json                // { primaryColor, secondaryColor, logo, tagline }

  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  competitions Competition[]
  studios     Studio[]
  userProfiles UserProfile[]

  @@map("tenants")
}
```

2. **Add tenantId to Existing Models**:
Add these fields to: Competition, Studio, UserProfile, Reservation, CompetitionEntry, Invoice, Dancer

Example pattern:
```prisma
model Competition {
  // ... existing fields

  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  // ... rest of model
}
```

3. **Create Migration File**: `prisma/migrations/[timestamp]_add_multi_tenancy/migration.sql`

Migration should:
- Create tenants table
- Add tenant_id column to all tables
- Create foreign keys
- Create indexes on tenant_id
- Seed two tenants: "demo" and "empwr"

4. **Seed Data**:
Create seed SQL statements for:
```sql
-- Demo tenant
INSERT INTO tenants (id, slug, subdomain, name, branding) VALUES (
  'demo-tenant-uuid',
  'demo',
  'demo',
  'Demo Competition Portal',
  '{"primaryColor": "#6366F1", "secondaryColor": "#8B5CF6", "logo": null, "tagline": "Dance Competition Management"}'::jsonb
);

-- EMPWR tenant
INSERT INTO tenants (id, slug, subdomain, name, branding) VALUES (
  'empwr-tenant-uuid',
  'empwr',
  'empwr',
  'EMPWR Dance',
  '{"primaryColor": "#8B5CF6", "secondaryColor": "#EC4899", "logo": null, "tagline": "Empowering Dance Excellence"}'::jsonb
);
```

5. **Assign Existing Competitions**:
- All competitions with "GLOW" in name → demo tenant
- All other competitions → empwr tenant

**Deliverables:**
1. Updated `prisma/schema.prisma` with Tenant model and tenantId fields
2. Migration SQL file
3. Seed SQL statements in migration

**Quality Gates:**
✅ Prisma schema compiles (`npx prisma validate`)
✅ All existing relations preserved
✅ Indexes created on all tenantId columns
✅ Foreign key constraints proper
✅ Cascade delete configured

**Output to**: `codex-tasks/outputs/01_tenant_schema_result.md`
