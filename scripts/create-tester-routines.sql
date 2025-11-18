-- Test Data for V4 Scheduling (Session 66+)
-- Creates 60 routines for Auto-Generate testing
-- TENANT: 00000000-0000-0000-0000-000000000003 (tester)
-- COMPETITION: 1b786221-8f8e-413f-b532-06fa20a2ff63 (Test Competition Spring 2026)

-- Note: This script creates competition_entries (routines) without scheduling them
-- The Auto-Generate feature will then schedule them across Thursday-Sunday

-- First, create a test studio and reservation if they don't exist
INSERT INTO studios (id, tenant_id, name, email, phone, address, city, state, postal_code, status, created_at, updated_at)
VALUES (
  '2a811127-7b5e-4447-affa-046c76ded8da',
  '00000000-0000-0000-0000-000000000003',
  'Test Dance Studio',
  'test@studio.com',
  '555-0100',
  '123 Test St',
  'Test City',
  'ON',
  'L2R 1A1',
  'active',
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '1 month'
)
ON CONFLICT (id) DO NOTHING;

-- Create reservation
INSERT INTO reservations (id, studio_id, competition_id, tenant_id, status, tokens_requested, tokens_approved, created_at, updated_at, submitted_at, approved_at, summary_submitted_at)
VALUES (
  'f3defc45-6736-4f2e-a2c5-a0ca277ad574',
  '2a811127-7b5e-4447-affa-046c76ded8da',
  '1b786221-8f8e-413f-b532-06fa20a2ff63',
  '00000000-0000-0000-0000-000000000003',
  'summarized',
  60,
  60,
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '10 days'
)
ON CONFLICT (id) DO NOTHING;

-- Insert 60 competition entries (routines)
-- Using placeholder IDs for age_group, category, classification, and entry_size_category
-- These should exist in your test competition setup

INSERT INTO competition_entries (
  tenant_id, competition_id, reservation_id, studio_id,
  title, status, entry_fee, total_fee, created_at, updated_at
)
VALUES
  -- 15 routines for Thursday
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Broadway Bound', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Dancing Queens', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Electric Avenue', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Starlight Express', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Rhythm Nation', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Dreamscape', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Firefly', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Midnight Hour', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Power Move', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Elegance', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Unity', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Breakout', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Jazz Hands', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Velocity', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Moonlight Dreams', 'registered', 100.00, 100.00, NOW(), NOW()),

  -- 15 routines for Friday
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Sunrise Serenade', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Groove Theory', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Crystal Clear', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Flashpoint', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Stellar Motion', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Cascade', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Horizon', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Pulse', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Radiance', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Tempest', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Aurora', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Zenith', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Mirage', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Eclipse', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Phoenix Rising', 'registered', 100.00, 100.00, NOW(), NOW()),

  -- 15 routines for Saturday
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Neon Nights', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Infinity', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Serenity', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Momentum', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Catalyst', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Odyssey', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Synergy', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Vertigo', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Kaleidoscope', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Phantom', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Spectrum', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Velocity Peak', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Crimson Wave', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Silver Lining', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Cosmic Journey', 'registered', 100.00, 100.00, NOW(), NOW()),

  -- 15 routines for Sunday
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Golden Hour', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Tidal Force', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Whisper', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Thunder', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Sapphire Dreams', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Nebula', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Prism', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Resonance', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Vortex', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Luminous', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Harmony', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Equilibrium', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Ascension', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Destiny', 'registered', 100.00, 100.00, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '1b786221-8f8e-413f-b532-06fa20a2ff63', 'f3defc45-6736-4f2e-a2c5-a0ca277ad574', '2a811127-7b5e-4447-affa-046c76ded8da', 'Grand Finale', 'registered', 100.00, 100.00, NOW(), NOW());

-- Verify the insert
SELECT COUNT(*) as total_routines_created
FROM competition_entries
WHERE tenant_id = '00000000-0000-0000-0000-000000000003'
  AND competition_id = '1b786221-8f8e-413f-b532-06fa20a2ff63';
