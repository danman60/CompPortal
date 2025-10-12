-- Add 'judge' role to user_role enum
-- Allows user_profiles to have judge role in addition to studio_director, competition_director, super_admin

ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'judge';

-- Add comment for documentation
COMMENT ON TYPE "public"."user_role" IS 'User roles: studio_director, competition_director, judge, super_admin';
