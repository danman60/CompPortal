-- Baseline database state before CSV import tests
-- Studio: de74304a-c0b3-4a5b-85d3-80c4d4c7073a (Dans Dancer)
-- Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

SELECT
  (SELECT COUNT(*) FROM dancers WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a') as baseline_dancers,
  (SELECT COUNT(*) FROM reservations WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a') as baseline_reservations,
  (SELECT COUNT(*) FROM entries WHERE reservation_id IN (
    SELECT id FROM reservations WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  )) as baseline_entries,
  NOW() as test_start_time;
