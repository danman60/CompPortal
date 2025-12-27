# Merge Plan: Tester → Main (Cherry-Pick Approach)

**Created:** Dec 27, 2025
**Purpose:** Bring Game Day, Media, MP3 features to main without affecting scheduler

---

## Critical Safety Note

**Scheduler is UNTOUCHED.** All files being copied are NEW or isolated replacements that have zero references to scheduling code.

---

## Files to Copy

### Backend Routers

| File | Lines | Action | Scheduler Impact |
|------|-------|--------|------------------|
| `src/server/routers/music.ts` | 827 | Replace existing | ⚪ NONE |
| `src/server/routers/musicNotification.ts` | 678 | NEW file | ⚪ NONE |
| `src/server/routers/media.ts` | 819 | NEW file | ⚪ NONE |

### Frontend Pages

| Directory | Action |
|-----------|--------|
| `src/app/judge/` | NEW |
| `src/app/tabulator/` | NEW |
| `src/app/backstage/` | NEW |
| `src/app/scoreboard/` | NEW |
| `src/app/dashboard/director-panel/live/` | NEW |
| `src/app/dashboard/director-panel/media/` | NEW |
| `src/app/dashboard/music-upload/` | NEW |

### API Routes

| Directory | Action |
|-----------|--------|
| `src/app/api/audio/` | NEW |
| `src/app/api/backstage/` | NEW |
| `src/app/api/media/` | NEW |
| `src/app/api/scoreboard/` | NEW |
| `src/app/api/tabulator/` | NEW |

### Components

| File | Action |
|------|--------|
| `src/components/MP3Player.tsx` | NEW |
| `src/components/MP3DownloadManager.tsx` | NEW |
| `src/components/audio/MP3DownloadPanel.tsx` | NEW |

---

## Execution Commands

```bash
cd D:/ClaudeCode/CompPortal

# 1. Backup
git stash
git branch backup-main-pre-merge

# 2. Copy routers
git checkout origin/tester -- src/server/routers/music.ts
git checkout origin/tester -- src/server/routers/musicNotification.ts
git checkout origin/tester -- src/server/routers/media.ts

# 3. Copy pages
git checkout origin/tester -- src/app/judge/
git checkout origin/tester -- src/app/tabulator/
git checkout origin/tester -- src/app/backstage/
git checkout origin/tester -- src/app/scoreboard/
git checkout origin/tester -- src/app/dashboard/director-panel/live/
git checkout origin/tester -- src/app/dashboard/director-panel/media/
git checkout origin/tester -- src/app/dashboard/music-upload/

# 4. Copy API routes
git checkout origin/tester -- src/app/api/audio/
git checkout origin/tester -- src/app/api/backstage/
git checkout origin/tester -- src/app/api/media/
git checkout origin/tester -- src/app/api/scoreboard/
git checkout origin/tester -- src/app/api/tabulator/

# 5. Copy components
git checkout origin/tester -- src/components/MP3Player.tsx
git checkout origin/tester -- src/components/MP3DownloadManager.tsx
git checkout origin/tester -- src/components/audio/

# 6. Update _app.ts (manual - add imports and registrations)
# Add: import { musicNotificationRouter } from './musicNotification';
# Add: import { mediaRouter } from './media';
# Add in router: musicNotification: musicNotificationRouter,
# Add in router: media: mediaRouter,

# 7. Fix bucket name in music.ts
sed -i "s/\.from('music')/\.from('CompPortalMp3s')/g" src/server/routers/music.ts

# 8. Build and verify
npm run build

# 9. Commit
git add .
git commit -m "feat: Add Game Day, Media, MP3 features from tester branch"
git push origin main
```

---

## Post-Copy Fix

In `src/server/routers/music.ts`, lines 619 and 764:
```typescript
// Change:
.from('music')
// To:
.from('CompPortalMp3s')
```

---

## Verification Checklist

- [ ] Build passes
- [ ] Scheduler still works (test on empwr.compsync.net)
- [ ] Invoice page still works
- [ ] New pages exist but have no nav links (hidden)
- [ ] MP3 upload connects to correct bucket

---

## Rollback

```bash
git checkout backup-main-pre-merge
git push origin main --force
```

---

## Why Scheduler Is Safe

Verified via grep - zero references to "scheduling" in any copied files:
- music.ts: No scheduling imports or calls
- musicNotification.ts: No scheduling references
- media.ts: No scheduling references
- All page components: No scheduling references

Files NOT touched:
- `src/server/routers/scheduling.ts`
- `src/app/dashboard/director-panel/schedule/page.tsx`
- `src/server/routers/invoice.ts`

---

*Plan verified Dec 27, 2025*
