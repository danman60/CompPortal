-- =====================================================
-- CompPortal Email System Monitoring Dashboard
-- =====================================================
-- Run these queries in Supabase SQL Editor to monitor
-- the whitelabel email system performance and health
-- =====================================================

-- 1. Email Queue Status Overview
-- Shows current state of email queue by type and status
SELECT
  email_type,
  status,
  COUNT(*) as count,
  MAX(created_at) as latest_email
FROM email_queue
GROUP BY email_type, status
ORDER BY email_type, status;

-- 2. Recent Email Activity (Last 24 Hours)
-- Shows email volume by tenant in the last day
SELECT
  t.name as tenant,
  eq.email_type,
  eq.status,
  COUNT(*) as count,
  MAX(eq.created_at) as most_recent
FROM email_queue eq
JOIN tenants t ON eq.tenant_id = t.id
WHERE eq.created_at > NOW() - INTERVAL '24 hours'
GROUP BY t.name, eq.email_type, eq.status
ORDER BY t.name, eq.email_type;

-- 3. Failed Emails with Error Details
-- Shows recent failures for troubleshooting
SELECT
  recipient_email,
  email_type,
  error,
  retry_count,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_old
FROM email_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- 4. Pending Emails Queue Depth
-- Shows how many emails are waiting to be sent
SELECT
  COUNT(*) as pending_count,
  MIN(created_at) as oldest_pending,
  MAX(created_at) as newest_pending,
  EXTRACT(EPOCH FROM (NOW() - MIN(created_at)))/60 as oldest_wait_minutes
FROM email_queue
WHERE status = 'pending';

-- 5. Email Processing Performance (Last Hour)
-- Shows send success rate and timing
SELECT
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'sent') /
    NULLIF(COUNT(*), 0),
    2
  ) as success_rate_pct,
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) FILTER (WHERE sent_at IS NOT NULL) as avg_send_time_seconds
FROM email_queue
WHERE created_at > NOW() - INTERVAL '1 hour';

-- 6. Cron Job Status
-- Shows scheduled jobs and their health
SELECT
  jobname,
  schedule,
  active,
  (SELECT MAX(start_time)
   FROM cron.job_run_details jrd
   WHERE jrd.job_name = j.jobname) as last_run,
  (SELECT status
   FROM cron.job_run_details jrd
   WHERE jrd.job_name = j.jobname
   ORDER BY start_time DESC
   LIMIT 1) as last_status
FROM cron.job j
WHERE jobname LIKE '%email%'
ORDER BY jobname;

-- 7. Cron Job Run History (Last 10 Runs)
-- Shows detailed execution history
SELECT
  job_name,
  status,
  return_message,
  start_time,
  end_time,
  EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
FROM cron.job_run_details
WHERE job_name LIKE '%email%'
ORDER BY start_time DESC
LIMIT 10;

-- 8. Email Volume by Hour (Last 24 Hours)
-- Shows email sending patterns
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending
FROM email_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- 9. Tenant Email Configuration
-- Verifies tenant settings are correct
SELECT
  slug,
  name,
  email_from,
  email_from_name,
  mailgun_domain,
  CASE
    WHEN email_from IS NOT NULL
      AND email_from_name IS NOT NULL
      AND mailgun_domain IS NOT NULL
    THEN '✓ Complete'
    ELSE '✗ Incomplete'
  END as config_status,
  LENGTH(email_template_footer) as footer_length
FROM tenants
WHERE slug IN ('empwr', 'glow')
ORDER BY slug;

-- 10. Top Email Recipients (Last 7 Days)
-- Shows which emails are receiving the most messages
SELECT
  recipient_email,
  COUNT(*) as email_count,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  MAX(created_at) as most_recent
FROM email_queue
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY recipient_email
ORDER BY email_count DESC
LIMIT 20;

-- 11. Retry Analysis
-- Shows emails that needed multiple attempts
SELECT
  email_type,
  retry_count,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE status = 'sent') as eventually_sent,
  COUNT(*) FILTER (WHERE status = 'failed') as permanently_failed
FROM email_queue
WHERE retry_count > 0
GROUP BY email_type, retry_count
ORDER BY email_type, retry_count;

-- 12. Daily Summary (Last 7 Days)
-- Shows daily email statistics
SELECT
  DATE(created_at) as date,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'sent') /
    NULLIF(COUNT(*), 0),
    2
  ) as success_rate_pct
FROM email_queue
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =====================================================
-- Maintenance Queries
-- =====================================================

-- Manual Cleanup (Run if needed)
-- DELETE FROM email_queue
-- WHERE status IN ('sent', 'failed')
--   AND created_at < NOW() - INTERVAL '30 days';

-- Reset Failed Emails for Retry
-- UPDATE email_queue
-- SET status = 'pending', retry_count = 0, error = NULL
-- WHERE status = 'failed' AND retry_count >= 3;

-- Clear Test Emails
-- DELETE FROM email_queue
-- WHERE recipient_email LIKE '%test%'
--   OR recipient_email LIKE '%example.com';

-- =====================================================
-- Alert Queries (Run these to check for problems)
-- =====================================================

-- Alert: Old Pending Emails (>5 minutes)
SELECT
  id,
  email_type,
  recipient_email,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_pending
FROM email_queue
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at;

-- Alert: High Failure Rate (>10% in last hour)
SELECT
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) as total,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'failed') /
    NULLIF(COUNT(*), 0),
    2
  ) as failure_rate_pct
FROM email_queue
WHERE created_at > NOW() - INTERVAL '1 hour'
HAVING ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'failed') /
    NULLIF(COUNT(*), 0),
    2
  ) > 10;

-- Alert: Cron Jobs Not Running
SELECT
  jobname,
  schedule,
  (SELECT MAX(start_time)
   FROM cron.job_run_details jrd
   WHERE jrd.job_name = j.jobname) as last_run,
  EXTRACT(EPOCH FROM (NOW() - (
    SELECT MAX(start_time)
    FROM cron.job_run_details jrd
    WHERE jrd.job_name = j.jobname
  )))/60 as minutes_since_last_run
FROM cron.job j
WHERE jobname LIKE '%email%'
  AND active = true
HAVING EXTRACT(EPOCH FROM (NOW() - (
    SELECT MAX(start_time)
    FROM cron.job_run_details jrd
    WHERE jrd.job_name = j.jobname
  )))/60 > 5;
