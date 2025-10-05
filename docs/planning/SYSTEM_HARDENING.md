# 🛡️ System Hardening & Safety Features

## 1. Session Tokenization & Rollback Isolation

**Objective**: Prevent accidental or partial writes from corrupting live competition data.

**Implementation Strategy:**

### Session Sandbox Layer:
- Each editing session (Studio Director or Competition Director) operates in a tokenized session container.
- All user actions—creates, edits, deletions—are written to a temporary session table (`session_drafts`) instead of the live tables.
- On "Publish" or "Finalize," a controlled merge operation writes to production tables with full validation.

### Rollback Control:
- Every session token maintains a diff log of changes.
- Admins or system monitors can revert the session state to any prior checkpoint.

### Audit Trail:
- Each change includes timestamp, user_id, and IP signature.
- All rollback events are logged with reason codes for forensic analysis.

**Benefits:**
- Prevents live database corruption.
- Allows safe "undo" for entire sessions.
- Enables pre-competition QA reviews before final commit.

---

## 2. Continuous Database Backups & Checkpoints

### Automated Backups:
- **Frequency**: Hourly incremental, daily full backups.
- **Retention**: 30-day rolling backup retention with cold storage copy (AWS Glacier or Supabase cold storage).
- **Verification**: Nightly checksum validation and restore simulation in staging environment.

### Recovery Scenarios:
- **Soft Restore**: Rollback to any daily checkpoint (point-in-time recovery).
- **Full Disaster Recovery**: Restore to alternate instance within 30 minutes using Supabase's managed backup restore API.

---

## 3. Offline & On-Device Fail-Safes

### Critical Use Case: Competition Weekend

**Judge Tablets:**
- Progressive Web App (PWA) stores scoring data locally using IndexedDB.
- All submissions queue in an offline sync buffer until internet connectivity is re-established.
- Automatic retry with exponential backoff on reconnection.

**Offline Cache:**
- Judges' tablets and competition director devices maintain a local snapshot of the competition schedule, routines, and dancer data.

**Local Backup:**
- At configurable intervals (e.g., every 15 minutes), local encrypted copies of current session data are stored and can be exported to a USB key if catastrophic network loss occurs.

---

## 4. Real-Time Health & Watchdog Monitoring

- **Heartbeat Pings**: Every 10 seconds from each active client; server monitors stale sessions and prompts reconnects.
- **Error Alerting**: Sentry integration for frontend/back-end exceptions; auto-triggers Slack/email alerts for admins.
- **Uptime Monitoring**: Synthetic checks every 30 seconds from multiple regions with automatic failover routing if downtime exceeds 90 seconds.
- **Competition Day Panic Switch**: "Freeze Mode" button in admin dashboard temporarily halts all writes and locks schedules to prevent further corruption if anomalies detected.

---

## 5. Data Integrity & Validation Layer

- **Transactional Writes**: All final commits occur inside database transactions to ensure atomicity.
- **Schema Constraints**: Foreign keys, unique indexes, and cascading delete safeguards prevent orphaned data.
- **Routine Validation Hooks**: Pre-save triggers check for capacity, duplicate dancer assignments, and missing metadata before acceptance.
- **Conflict Prevention**: Scheduling algorithm runs a validation pass before every publish to detect overlapping or impossible dancer assignments.

---

## 6. Redundancy & Fallback Architecture

### Dual Environment Deployment:
- Production (Vercel/Supabase) + Hot Standby in separate region (Neon or PlanetScale).

### Automated Failover:
- DNS-level routing switch (Cloudflare) for <60 second recovery time objective.

### File Storage Duplication:
- All music files mirrored between Supabase Storage and S3 bucket for redundancy.

### Edge CDN Caching:
- Read-heavy endpoints (e.g., schedules, reports) cached at edge to survive brief backend outages.

---

## 7. Competition-Day "Nightmare Scenario" Mitigations

| Scenario | Mitigation |
|----------|------------|
| Database lost/corrupted | Hourly backups + 30 min disaster recovery restore; local CSV export of all registrations before competition weekend |
| Judges can't enter scores (no network) | Offline-first judge PWA + queued sync buffer |
| Music playback fails | Local pre-downloaded playlist package generated automatically before competition day |
| System freeze during awards tabulation | "Freeze Mode" + offline scoring export (CSV/PDF) to continue manually |
| Mass data loss from studios | Pre-competition export of all studio data (CSV) for off-platform safekeeping |
| Faulty scheduling logic causes conflicts | Simulation & validation step pre-publish; rollback to prior schedule version |
| Login failures / missing data | Graceful fallback to cached local profiles and offline "view-only" mode |

---

## 8. Security Hardening

- **RLS (Row-Level Security)** enforced on all Supabase tables.
- **JWT-based Auth** with short-lived tokens and refresh flow.
- **Data Encryption**: At rest (AES-256) and in transit (TLS 1.3).
- **Secret Management**: Environment variables stored in encrypted Vercel/Supabase vaults.
- **Rate Limiting & WAF**: Cloudflare or Supabase Edge functions throttle abusive requests.
- **Audit Logs**: Immutable log table for all create/update/delete operations with user and timestamp.

---

## 9. Pre-Competition QA Protocol

1. Generate full system snapshot (studios, dancers, routines, schedules).
2. Run validation scripts for: duplicate dancers, missing ages, empty music links, capacity overages.
3. Export all verified data to encrypted archive (CSV + JSON) and store locally.
4. Issue versioned "Competition Snapshot ID" before live weekend.

---

## 10. Post-Competition Safety Flow

1. Lock database writes post-event.
2. Archive final state snapshot.
3. Verify backup integrity.
4. Generate immutable "Competition Record Archive" (PDF/CSV bundle).
5. Tag archival state in Supabase with version stamp (e.g., `GLOW_2026_Toronto_Final_v1`).

---

## Outcome

These hardening and safety protocols transform CompPortal into a fault-tolerant, auditable, and rollback-capable platform designed for zero-downtime competition weekends—even under adverse network or data conditions.
