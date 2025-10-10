-- Enable RLS on all tenant-scoped tables
ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."competitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."studios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."competition_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."dancers" ENABLE ROW LEVEL SECURITY;

-- Function to get current user's tenant_id from user_profiles
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid();
$$;

-- Function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role = 'super_admin' FROM public.user_profiles WHERE id = auth.uid();
$$;

-- ===== TENANTS TABLE POLICIES =====
-- Super admins can see all tenants
CREATE POLICY "tenants_super_admin_all"
ON "public"."tenants"
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Users can see their own tenant
CREATE POLICY "tenants_user_own"
ON "public"."tenants"
FOR SELECT
TO authenticated
USING (id = public.get_user_tenant_id());

-- ===== COMPETITIONS TABLE POLICIES =====
-- Super admins can see/modify all competitions
CREATE POLICY "competitions_super_admin_all"
ON "public"."competitions"
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Users can see competitions in their tenant
CREATE POLICY "competitions_user_select"
ON "public"."competitions"
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

-- Competition directors can insert/update competitions in their tenant
CREATE POLICY "competitions_cd_insert"
ON "public"."competitions"
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id() AND
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'competition_director'
);

CREATE POLICY "competitions_cd_update"
ON "public"."competitions"
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id() AND
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'competition_director'
);

-- ===== STUDIOS TABLE POLICIES =====
-- Super admins can see/modify all studios
CREATE POLICY "studios_super_admin_all"
ON "public"."studios"
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Users can see studios in their tenant
CREATE POLICY "studios_user_select"
ON "public"."studios"
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

-- Studio directors can insert/update their own studio
CREATE POLICY "studios_sd_insert"
ON "public"."studios"
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id() AND
  owner_id = auth.uid()
);

CREATE POLICY "studios_sd_update"
ON "public"."studios"
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id() AND
  owner_id = auth.uid()
);

-- ===== USER_PROFILES TABLE POLICIES =====
-- Super admins can see/modify all user profiles
CREATE POLICY "user_profiles_super_admin_all"
ON "public"."user_profiles"
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Users can see profiles in their tenant
CREATE POLICY "user_profiles_user_select"
ON "public"."user_profiles"
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id() OR id = auth.uid());

-- Users can update their own profile
CREATE POLICY "user_profiles_user_update"
ON "public"."user_profiles"
FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "user_profiles_user_insert"
ON "public"."user_profiles"
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ===== RESERVATIONS TABLE POLICIES =====
-- Super admins can see/modify all reservations
CREATE POLICY "reservations_super_admin_all"
ON "public"."reservations"
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Studio directors can see/modify reservations for their studio
CREATE POLICY "reservations_sd_all"
ON "public"."reservations"
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id() AND
  studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid())
);

-- Competition directors can see/modify all reservations in their tenant
CREATE POLICY "reservations_cd_all"
ON "public"."reservations"
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id() AND
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'competition_director'
);

-- ===== COMPETITION_ENTRIES TABLE POLICIES =====
-- Super admins can see/modify all entries
CREATE POLICY "entries_super_admin_all"
ON "public"."competition_entries"
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Studio directors can see/modify entries for their studio
CREATE POLICY "entries_sd_all"
ON "public"."competition_entries"
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id() AND
  studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid())
);

-- Competition directors can see all entries in their tenant
CREATE POLICY "entries_cd_select"
ON "public"."competition_entries"
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id() AND
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'competition_director'
);

-- ===== INVOICES TABLE POLICIES =====
-- Super admins can see/modify all invoices
CREATE POLICY "invoices_super_admin_all"
ON "public"."invoices"
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Studio directors can see invoices for their studio
CREATE POLICY "invoices_sd_select"
ON "public"."invoices"
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id() AND
  studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid())
);

-- Competition directors can see/modify all invoices in their tenant
CREATE POLICY "invoices_cd_all"
ON "public"."invoices"
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id() AND
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'competition_director'
);

-- ===== DANCERS TABLE POLICIES =====
-- Super admins can see/modify all dancers
CREATE POLICY "dancers_super_admin_all"
ON "public"."dancers"
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Studio directors can see/modify dancers for their studio
CREATE POLICY "dancers_sd_all"
ON "public"."dancers"
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id() AND
  studio_id IN (SELECT id FROM public.studios WHERE owner_id = auth.uid())
);

-- Competition directors can see all dancers in their tenant
CREATE POLICY "dancers_cd_select"
ON "public"."dancers"
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id() AND
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'competition_director'
);
