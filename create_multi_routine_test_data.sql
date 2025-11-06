-- Multi-Routine Test Data - 30 Entries for Split Invoice Testing
-- Reservation ID: f3defc45-6736-4f2e-a2c5-a0ca277ad574
-- Studio: Test Studio - Daniel (2a811127-7b5e-4447-affa-046c76ded8da)
-- Competition: EMPWR Dance - London (79cef00c-e163-449c-9f3c-d021fbb4d672)
-- Tenant: 00000000-0000-0000-0000-000000000001

-- IDs Reference:
-- Categories:
--   Classical Ballet: f3a58c90-71e5-4194-a4c9-c732c1021069
--   Contemporary: 01048636-14a4-4f11-9edc-c1d699e7b6ab
--   Hip-Hop: ab8393a1-87aa-4934-bbd4-94f09af45e99
--   Jazz: 890c7630-ba83-4f1d-947f-59173a5d869f
--   Lyrical: 8054a231-967e-4c52-83b1-b84f8090eaee
--   Modern: 3f4322ac-f4cb-464b-85ad-a460967374f4
--   Musical Theatre: 6fa0dce5-a15e-4ac6-a915-8ca2f0dee86e
--   Tap: 21cf4ca9-bdfd-4069-bdc5-6a42c3776fff

-- Size Categories:
--   Solo: 390f9890-9ca4-4741-8d68-0f488a4f6860
--   Duet/Trio: 03a36044-e756-4cc6-9d14-d8236bae5080
--   Small Group: c16e265b-a8f3-4194-a657-1814fb041ad8
--   Large Group: f171316e-f37e-4f67-95de-9d5b1cf317bd
--   Production: f6d579db-4e2f-4129-804c-cba38103aa03

-- Classifications:
--   Competitive: 3804704c-3552-412a-9fc8-afa1c3a04536
--   Production: 93998eb8-5925-4c39-b370-bd799c6988eb

-- Age Group:
--   Adult: d4cd698f-ac06-4cda-bf5b-384ba68579c2

-- Dancers (20 total, all IDs from query):
-- 1. Alexander Martinez: ff51d6f0-2ec5-4e8c-9a6f-2eec588106b5
-- 2. Amelia Jones: f2603d56-3aac-48af-98ce-0c3feecd6812
-- 3. Ava Jones: d49d840c-4150-4a26-bcef-5720002dfae5
-- 4. Benjamin Brown: f1383864-7a9b-4c4a-84c1-6e7a98c14ab8
-- 5. Charlotte Williams: ef4da692-af0a-4b13-86e4-7f8d06d9d564
-- 6. Emma Smith: cbc8aef1-1dba-40ed-b8eb-cd638b2ac8e7
-- 7. Ethan Garcia: d4e1196c-a5c4-4252-affe-d8b1d58681cb
-- 8. Evelyn Rodriguez: fefbf763-1f94-4e76-9d9c-1b253c906fab
-- 9. Harper Miller: f4549074-9091-4c47-89cb-45a9f80c8c38
-- 10. Henry Davis: f611accd-54f8-4157-a93e-078b4a331394
-- 11. Isabella Rodriguez: e33d36f7-f99c-4ef3-9b4f-79c425f261c3
-- 12. James Johnson: ecb365d9-ef8e-479e-9044-8dcf944f93e4
-- 13. Liam Johnson: cf5da24f-ae5e-4355-858b-06ddff91bedd
-- 14. Lucas Garcia: f271a9f4-9c98-4b8a-a0a4-b9bc62faafa9
-- 15. Mason Davis: df2b9148-d62a-48b9-84d2-44e6ccd77e83
-- 16. Mia Smith: e5e7dab1-9706-44a0-8304-2e7606ded34f
-- 17. Noah Brown: d299745f-8423-42f7-bb0d-e2fca288a6b9
-- 18. Olivia Williams: d266024e-8722-431c-ac9d-8afcb26e9fbc
-- 19. Sophia Miller: dc511b85-772c-4f9a-9d33-ecdc7c1c77d7
-- 20. William Martinez: e4403ae0-d05f-4977-a670-5ab592dc8346

BEGIN;

-- ============================================================================
-- PRODUCTION NUMBERS (3 routines with all 20 dancers)
-- ============================================================================

-- P1: "Opening Number" - Musical Theatre Production
-- Base: $115, Extended: +$25, Title: +$10 = $150 total
INSERT INTO competition_entries (
  id, competition_id, reservation_id, studio_id, title,
  category_id, classification_id, age_group_id, entry_size_category_id,
  is_title_upgrade, extended_time_requested,
  entry_fee, total_fee, status, tenant_id,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '79cef00c-e163-449c-9f3c-d021fbb4d672',
  'f3defc45-6736-4f2e-a2c5-a0ca277ad574',
  '2a811127-7b5e-4447-affa-046c76ded8da',
  'Opening Number',
  '6fa0dce5-a15e-4ac6-a915-8ca2f0dee86e', -- Musical Theatre
  '93998eb8-5925-4c39-b370-bd799c6988eb', -- Production classification
  'd4cd698f-ac06-4cda-bf5b-384ba68579c2', -- Adult
  'f6d579db-4e2f-4129-804c-cba38103aa03', -- Production
  true,  -- is_title_upgrade
  true,  -- extended_time_requested
  115.00,
  150.00,
  'active',
  '00000000-0000-0000-0000-000000000001',
  NOW(),
  NOW()
)
RETURNING id;

-- Store the entry ID for participants (will use in next step)
-- Note: In production, we'd use WITH clauses or variables

COMMIT;

-- This is a template - I'll need to create this programmatically
-- due to the large number of entries and participants
