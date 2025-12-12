# Game Day Test Specifications

**Status:** COMPLETE - Ready for Implementation
**Last Updated:** December 11, 2025

---

## Overview

Comprehensive test specifications for Game Day implementation with testable acceptance criteria.

---

## 1. Unit Tests

### 1.1 Score Validation

```typescript
describe('ScoreSchema', () => {
  it('should accept score 60', () => {
    expect(() => ScoreSchema.parse(60)).not.toThrow();
  });

  it('should accept score 100', () => {
    expect(() => ScoreSchema.parse(100)).not.toThrow();
  });

  it('should accept score 82.5', () => {
    expect(() => ScoreSchema.parse(82.5)).not.toThrow();
  });

  it('should reject score 59.5', () => {
    expect(() => ScoreSchema.parse(59.5)).toThrow('Score must be at least 60');
  });

  it('should reject score 100.5', () => {
    expect(() => ScoreSchema.parse(100.5)).toThrow('Score cannot exceed 100');
  });

  it('should reject score 82.3 (not 0.5 increment)', () => {
    expect(() => ScoreSchema.parse(82.3)).toThrow('Score must be in 0.5 increments');
  });
});
```

### 1.2 Award Level Calculation

```typescript
describe('calculateAwardLevel', () => {
  const scoringRanges = {
    platinum: [95, 100],
    high_gold: [90, 94.9],
    gold: [85, 89.9],
    silver: [80, 84.9],
    bronze: [70, 79.9],
  };

  it('should return platinum for 95', () => {
    expect(calculateAwardLevel(95, scoringRanges)).toBe('platinum');
  });

  it('should return high_gold for 92', () => {
    expect(calculateAwardLevel(92, scoringRanges)).toBe('high_gold');
  });

  it('should return gold for 87', () => {
    expect(calculateAwardLevel(87, scoringRanges)).toBe('gold');
  });

  it('should return silver for 82', () => {
    expect(calculateAwardLevel(82, scoringRanges)).toBe('silver');
  });

  it('should return bronze for 75', () => {
    expect(calculateAwardLevel(75, scoringRanges)).toBe('bronze');
  });

  it('should return participation for 65', () => {
    expect(calculateAwardLevel(65, scoringRanges)).toBe('participation');
  });

  it('should handle edge case 94.9 as high_gold', () => {
    expect(calculateAwardLevel(94.9, scoringRanges)).toBe('high_gold');
  });

  it('should handle edge case 95 as platinum', () => {
    expect(calculateAwardLevel(95, scoringRanges)).toBe('platinum');
  });
});
```

### 1.3 State Machine Transitions

```typescript
describe('CompetitionStateMachine', () => {
  it('should allow pending -> active', () => {
    expect(canTransition('competition', 'pending', 'active')).toBe(true);
  });

  it('should allow active -> paused', () => {
    expect(canTransition('competition', 'active', 'paused')).toBe(true);
  });

  it('should allow paused -> active', () => {
    expect(canTransition('competition', 'paused', 'active')).toBe(true);
  });

  it('should allow active -> completed', () => {
    expect(canTransition('competition', 'active', 'completed')).toBe(true);
  });

  it('should NOT allow pending -> paused', () => {
    expect(canTransition('competition', 'pending', 'paused')).toBe(false);
  });

  it('should NOT allow completed -> active', () => {
    expect(canTransition('competition', 'completed', 'active')).toBe(false);
  });
});
```

### 1.4 Schedule Delay Calculation

```typescript
describe('calculateScheduleDelay', () => {
  it('should return 0 when on schedule', () => {
    const scheduled = new Date('2025-01-15T10:00:00');
    const actual = new Date('2025-01-15T10:00:00');
    expect(calculateScheduleDelay(scheduled, actual)).toBe(0);
  });

  it('should return positive minutes when behind', () => {
    const scheduled = new Date('2025-01-15T10:00:00');
    const actual = new Date('2025-01-15T10:05:00');
    expect(calculateScheduleDelay(scheduled, actual)).toBe(5);
  });

  it('should return negative minutes when ahead', () => {
    const scheduled = new Date('2025-01-15T10:00:00');
    const actual = new Date('2025-01-15T09:55:00');
    expect(calculateScheduleDelay(scheduled, actual)).toBe(-5);
  });
});
```

### 1.5 MP3 Duration Extraction

```typescript
describe('extractMP3Duration', () => {
  it('should extract duration from valid MP3', async () => {
    const mp3Buffer = await loadTestMP3('3-minute-song.mp3');
    const durationMs = await extractMP3Duration(mp3Buffer);
    expect(durationMs).toBeCloseTo(180000, -2); // Within 100ms
  });

  it('should throw error for invalid MP3', async () => {
    const invalidBuffer = new ArrayBuffer(100);
    await expect(extractMP3Duration(invalidBuffer)).rejects.toThrow();
  });

  it('should handle very short MP3 (< 10 seconds)', async () => {
    const mp3Buffer = await loadTestMP3('5-second-clip.mp3');
    const durationMs = await extractMP3Duration(mp3Buffer);
    expect(durationMs).toBeCloseTo(5000, -2);
  });
});
```

---

## 2. Integration Tests

### 2.1 Score Submission Flow

```typescript
describe('Score Submission Integration', () => {
  let competition: Competition;
  let entry: CompetitionEntry;
  let judge: Judge;

  beforeEach(async () => {
    competition = await createTestCompetition({ status: 'active' });
    entry = await createTestEntry(competition, { liveStatus: 'scoring' });
    judge = await createTestJudge(competition);
  });

  it('should submit score and update entry', async () => {
    const result = await trpc.liveCompetition.submitScore({
      competitionId: competition.id,
      entryId: entry.id,
      judgeId: judge.id,
      score: 85,
    });

    expect(result.success).toBe(true);
    expect(result.score).toBe(85);
    expect(result.awardLevel).toBe('gold');

    // Verify database
    const savedScore = await prisma.scores.findUnique({
      where: { id: result.scoreId },
    });
    expect(savedScore?.total_score).toBe(85);
  });

  it('should reject score when routine not in scoring state', async () => {
    await prisma.competition_entries.update({
      where: { id: entry.id },
      data: { live_status: 'queued' },
    });

    await expect(
      trpc.liveCompetition.submitScore({
        competitionId: competition.id,
        entryId: entry.id,
        judgeId: judge.id,
        score: 85,
      })
    ).rejects.toThrow('INVALID_STATE');
  });

  it('should calculate average when all judges submit', async () => {
    const judges = await createTestJudges(competition, 3);

    await trpc.liveCompetition.submitScore({
      competitionId: competition.id,
      entryId: entry.id,
      judgeId: judges[0].id,
      score: 80,
    });

    await trpc.liveCompetition.submitScore({
      competitionId: competition.id,
      entryId: entry.id,
      judgeId: judges[1].id,
      score: 85,
    });

    const result = await trpc.liveCompetition.submitScore({
      competitionId: competition.id,
      entryId: entry.id,
      judgeId: judges[2].id,
      score: 90,
    });

    expect(result.allScoresIn).toBe(true);
    expect(result.averageScore).toBe(85); // (80 + 85 + 90) / 3
  });
});
```

### 2.2 Break Request Flow

```typescript
describe('Break Request Integration', () => {
  it('should create and approve break request', async () => {
    const competition = await createTestCompetition({ status: 'active' });
    const judge = await createTestJudge(competition);

    // Judge requests break
    const request = await trpc.liveCompetition.requestBreak({
      competitionId: competition.id,
      judgeId: judge.id,
      durationMinutes: 5,
    });

    expect(request.status).toBe('pending');

    // CD approves break
    const response = await trpc.liveCompetition.respondToBreakRequest({
      requestId: request.requestId,
      approved: true,
    });

    expect(response.status).toBe('approved');
    expect(response.scheduledBreakId).toBeDefined();

    // Verify schedule_breaks created
    const scheduleBreak = await prisma.schedule_breaks.findUnique({
      where: { id: response.scheduledBreakId },
    });
    expect(scheduleBreak?.duration_minutes).toBe(5);
    expect(scheduleBreak?.break_type).toBe('judge_requested');
  });

  it('should deny break with reason', async () => {
    const competition = await createTestCompetition({ status: 'active' });
    const judge = await createTestJudge(competition);

    const request = await trpc.liveCompetition.requestBreak({
      competitionId: competition.id,
      judgeId: judge.id,
      durationMinutes: 10,
    });

    const response = await trpc.liveCompetition.respondToBreakRequest({
      requestId: request.requestId,
      approved: false,
      denyReason: 'Too close to lunch break',
    });

    expect(response.status).toBe('denied');

    const dbRequest = await prisma.break_requests.findUnique({
      where: { id: request.requestId },
    });
    expect(dbRequest?.deny_reason).toBe('Too close to lunch break');
  });
});
```

### 2.3 Routine Reorder Flow

```typescript
describe('Routine Reorder Integration', () => {
  it('should reorder routine and preserve entry number', async () => {
    const competition = await createTestCompetition();
    const entries = await createTestEntries(competition, 5);

    // Entry at position 2 (entry number 102) moves to position 4
    const result = await trpc.liveCompetition.reorderRoutine({
      competitionId: competition.id,
      entryId: entries[1].id, // Position 2, entry #102
      newPosition: 4,
    });

    expect(result.entryNumber).toBe(102); // Entry number unchanged!
    expect(result.previousPosition).toBe(2);
    expect(result.newPosition).toBe(4);

    // Verify other entries shifted
    const updatedEntries = await prisma.competition_entries.findMany({
      where: { competition_id: competition.id },
      orderBy: { running_order: 'asc' },
    });

    expect(updatedEntries[0].entry_number).toBe(101); // Position 1
    expect(updatedEntries[1].entry_number).toBe(103); // Position 2 (shifted up)
    expect(updatedEntries[2].entry_number).toBe(104); // Position 3 (shifted up)
    expect(updatedEntries[3].entry_number).toBe(102); // Position 4 (moved here)
    expect(updatedEntries[4].entry_number).toBe(105); // Position 5
  });
});
```

### 2.4 Score Edit with Audit Trail

```typescript
describe('Score Edit Audit Trail', () => {
  it('should log score edit to audit table', async () => {
    const competition = await createTestCompetition({ status: 'active' });
    const entry = await createTestEntry(competition, { liveStatus: 'scoring' });
    const judge = await createTestJudge(competition);
    const cd = await getCompetitionDirector(competition);

    // Judge submits initial score
    const submitResult = await trpc.liveCompetition.submitScore({
      competitionId: competition.id,
      entryId: entry.id,
      judgeId: judge.id,
      score: 80,
    });

    // CD edits score
    const editResult = await trpc.liveCompetition.editScore(
      {
        competitionId: competition.id,
        scoreId: submitResult.scoreId,
        newScore: 85,
        reason: 'Correcting scoring error',
      },
      { user: cd }
    );

    expect(editResult.previousScore).toBe(80);
    expect(editResult.newScore).toBe(85);

    // Verify audit log
    const auditLog = await prisma.score_audit_log.findFirst({
      where: { score_id: submitResult.scoreId },
      orderBy: { edited_at: 'desc' },
    });

    expect(auditLog?.previous_score).toBe(80);
    expect(auditLog?.new_score).toBe(85);
    expect(auditLog?.edit_type).toBe('cd_edit');
    expect(auditLog?.edit_reason).toBe('Correcting scoring error');
    expect(auditLog?.edited_by).toBe(cd.id);
  });
});
```

---

## 3. E2E Tests

### 3.1 Full Competition Flow

```typescript
describe('E2E: Complete Competition Flow', () => {
  it('should run competition from start to finish', async () => {
    // Setup
    const competition = await createTestCompetition({ routineCount: 3 });
    const judges = await createTestJudges(competition, 3);

    // Step 1: Start competition
    await page.goto(`/dashboard/director-panel/live?competitionId=${competition.id}`);
    await page.click('[data-testid="start-competition-btn"]');
    await expect(page.locator('[data-testid="competition-state"]')).toHaveText('ACTIVE');

    // Step 2: First routine starts
    await expect(page.locator('[data-testid="current-routine"]')).toContainText('Entry #101');

    // Step 3: Judges score (simulate via API)
    for (const judge of judges) {
      await trpc.liveCompetition.submitScore({
        competitionId: competition.id,
        entryId: competition.entries[0].id,
        judgeId: judge.id,
        score: 85,
      });
    }

    // Step 4: Verify scores displayed
    await expect(page.locator('[data-testid="average-score"]')).toHaveText('85.0');

    // Step 5: Advance to next routine
    await page.click('[data-testid="next-routine-btn"]');
    await expect(page.locator('[data-testid="current-routine"]')).toContainText('Entry #102');

    // Step 6: Skip routine
    await page.click('[data-testid="skip-routine-btn"]');
    await page.click('[data-testid="confirm-skip-btn"]');
    await expect(page.locator('[data-testid="current-routine"]')).toContainText('Entry #103');

    // Step 7: Complete last routine
    for (const judge of judges) {
      await trpc.liveCompetition.submitScore({
        competitionId: competition.id,
        entryId: competition.entries[2].id,
        judgeId: judge.id,
        score: 90,
      });
    }

    // Step 8: End competition
    await page.click('[data-testid="end-competition-btn"]');
    await page.click('[data-testid="confirm-end-btn"]');
    await expect(page.locator('[data-testid="competition-state"]')).toHaveText('COMPLETED');

    // Verify final stats
    await expect(page.locator('[data-testid="completed-count"]')).toHaveText('2');
    await expect(page.locator('[data-testid="skipped-count"]')).toHaveText('1');
  });
});
```

### 3.2 Judge Tablet Flow

```typescript
describe('E2E: Judge Tablet Flow', () => {
  it('should login and score routine', async () => {
    const competition = await createTestCompetition({ status: 'active' });
    const entry = await setCurrentEntry(competition);
    const judge = await createTestJudge(competition, { pin: '123456' });

    // Navigate to judge page
    await page.goto('/judge');

    // Login
    await page.fill('[data-testid="judge-number-input"]', judge.judge_number.toString());
    await page.fill('[data-testid="pin-input"]', '123456');
    await page.click('[data-testid="login-btn"]');

    // Verify current routine shown
    await expect(page.locator('[data-testid="routine-title"]')).toContainText(entry.title);

    // Move slider to 85
    const slider = page.locator('[data-testid="score-slider"]');
    await slider.fill('85');

    // Verify award level updates
    await expect(page.locator('[data-testid="award-level"]')).toHaveText('GOLD');

    // Submit score
    await page.click('[data-testid="submit-score-btn"]');

    // Verify confirmation
    await expect(page.locator('[data-testid="score-submitted-msg"]')).toBeVisible();

    // Verify in database
    const score = await prisma.scores.findFirst({
      where: { entry_id: entry.id, judge_id: judge.id },
    });
    expect(score?.total_score).toBe(85);
  });
});
```

### 3.3 Backstage Kiosk Flow

```typescript
describe('E2E: Backstage Kiosk Flow', () => {
  it('should download MP3s and play routine', async () => {
    const competition = await createTestCompetition({ status: 'active', withMP3s: true });

    // Navigate to backstage (fullscreen)
    await page.goto(`/backstage?competitionId=${competition.id}`);

    // Verify kiosk mode (no navigation)
    await expect(page.locator('nav')).not.toBeVisible();

    // Verify download status
    await expect(page.locator('[data-testid="mp3-download-status"]')).toContainText('3/3 downloaded');

    // Verify current routine shown
    await expect(page.locator('[data-testid="now-playing"]')).toContainText('Entry #101');

    // Click play
    await page.click('[data-testid="play-btn"]');

    // Verify playback started (check progress bar moving)
    const initialPosition = await page.locator('[data-testid="playback-position"]').textContent();
    await page.waitForTimeout(1000);
    const newPosition = await page.locator('[data-testid="playback-position"]').textContent();
    expect(newPosition).not.toBe(initialPosition);

    // Verify next routines shown
    await expect(page.locator('[data-testid="up-next"]')).toContainText('Entry #102');
  });
});
```

### 3.4 Live Scoreboard Flow

```typescript
describe('E2E: Live Scoreboard Flow', () => {
  it('should display real-time score updates', async () => {
    const competition = await createTestCompetition({ status: 'active' });
    const entry = await setCurrentEntry(competition);
    const judges = await createTestJudges(competition, 3);

    // Open scoreboard
    await page.goto(`/scoreboard/${competition.id}`);

    // Verify current routine shown
    await expect(page.locator('[data-testid="current-performing"]')).toContainText(entry.title);

    // Submit scores via API (simulating judges)
    await trpc.liveCompetition.submitScore({
      competitionId: competition.id,
      entryId: entry.id,
      judgeId: judges[0].id,
      score: 88,
    });

    // Verify score appears (real-time via WebSocket)
    await expect(page.locator('[data-testid="judge-1-score"]')).toHaveText('88', { timeout: 5000 });

    // Submit more scores
    await trpc.liveCompetition.submitScore({
      competitionId: competition.id,
      entryId: entry.id,
      judgeId: judges[1].id,
      score: 90,
    });

    await trpc.liveCompetition.submitScore({
      competitionId: competition.id,
      entryId: entry.id,
      judgeId: judges[2].id,
      score: 92,
    });

    // Verify average updates
    await expect(page.locator('[data-testid="average-score"]')).toHaveText('90.0', { timeout: 5000 });
    await expect(page.locator('[data-testid="award-level"]')).toHaveText('HIGH GOLD', { timeout: 5000 });
  });
});
```

---

## 4. Offline Tests

### 4.1 Offline Score Caching

```typescript
describe('Offline: Score Caching', () => {
  it('should cache score locally when offline', async () => {
    const competition = await createTestCompetition({ status: 'active' });
    const entry = await setCurrentEntry(competition);
    const judge = await createTestJudge(competition, { pin: '123456' });

    // Login
    await page.goto('/judge');
    await loginAsJudge(page, judge);

    // Go offline
    await page.context().setOffline(true);

    // Submit score
    await page.locator('[data-testid="score-slider"]').fill('85');
    await page.click('[data-testid="submit-score-btn"]');

    // Verify offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

    // Verify score saved locally
    const cachedScores = await page.evaluate(() => {
      return indexedDB.open('gameday_cache').then(db => {
        return db.transaction('pending_scores').objectStore('pending_scores').getAll();
      });
    });
    expect(cachedScores).toHaveLength(1);
    expect(cachedScores[0].score).toBe(85);

    // Go online
    await page.context().setOffline(false);

    // Verify sync happens
    await expect(page.locator('[data-testid="sync-indicator"]')).toHaveText('Synced');

    // Verify in database
    const dbScore = await prisma.scores.findFirst({
      where: { entry_id: entry.id, judge_id: judge.id },
    });
    expect(dbScore?.total_score).toBe(85);
  });
});
```

### 4.2 MP3 Offline Playback

```typescript
describe('Offline: MP3 Playback', () => {
  it('should play downloaded MP3 when offline', async () => {
    const competition = await createTestCompetition({ status: 'active', withMP3s: true });

    // Load backstage and download MP3s
    await page.goto(`/backstage?competitionId=${competition.id}`);
    await page.waitForSelector('[data-testid="mp3-download-status"]:has-text("3/3 downloaded")');

    // Go offline
    await page.context().setOffline(true);

    // Verify offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

    // Play should still work
    await page.click('[data-testid="play-btn"]');

    // Verify playback works
    await expect(page.locator('[data-testid="playback-state"]')).toHaveText('PLAYING');

    // Progress should advance
    await page.waitForTimeout(2000);
    const position = await page.locator('[data-testid="playback-position"]').textContent();
    expect(parseInt(position!.split(':')[0])).toBeGreaterThan(0);
  });
});
```

---

## 5. Performance Tests

### 5.1 Score Sync Latency

```typescript
describe('Performance: Score Sync Latency', () => {
  it('should sync score within 250ms', async () => {
    const competition = await createTestCompetition({ status: 'active' });
    const entry = await setCurrentEntry(competition);
    const judge = await createTestJudge(competition);

    // Open CD panel
    const cdPage = await browser.newPage();
    await cdPage.goto(`/dashboard/director-panel/live?competitionId=${competition.id}`);

    // Measure time from submit to display
    const startTime = Date.now();

    // Submit score
    await trpc.liveCompetition.submitScore({
      competitionId: competition.id,
      entryId: entry.id,
      judgeId: judge.id,
      score: 85,
    });

    // Wait for score to appear on CD panel
    await cdPage.waitForSelector(`[data-testid="judge-${judge.judge_number}-score"]:has-text("85")`);

    const endTime = Date.now();
    const latency = endTime - startTime;

    expect(latency).toBeLessThan(250);
  });
});
```

### 5.2 MP3 Download Performance

```typescript
describe('Performance: MP3 Download', () => {
  it('should download 100 MP3s within 5 minutes on 10Mbps', async () => {
    const competition = await createTestCompetition({ routineCount: 100, withMP3s: true });

    // Throttle to 10Mbps
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      downloadThroughput: (10 * 1024 * 1024) / 8, // 10 Mbps in bytes/sec
      uploadThroughput: (10 * 1024 * 1024) / 8,
      latency: 20,
      offline: false,
    });

    const startTime = Date.now();

    await page.goto(`/backstage?competitionId=${competition.id}`);
    await page.click('[data-testid="download-all-btn"]');

    // Wait for completion
    await page.waitForSelector('[data-testid="mp3-download-status"]:has-text("100/100 downloaded")', {
      timeout: 5 * 60 * 1000, // 5 minute timeout
    });

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    expect(durationMs).toBeLessThan(5 * 60 * 1000); // Under 5 minutes
  });
});
```

### 5.3 Large Lineup Performance

```typescript
describe('Performance: Large Lineup', () => {
  it('should load 600 routines under 3 seconds', async () => {
    const competition = await createTestCompetition({ routineCount: 600 });

    const startTime = Date.now();

    await page.goto(`/dashboard/director-panel/live?competitionId=${competition.id}`);
    await page.waitForSelector('[data-testid="lineup-loaded"]');

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    expect(loadTime).toBeLessThan(3000);

    // Verify all routines rendered
    const routineCount = await page.locator('[data-testid="routine-row"]').count();
    expect(routineCount).toBe(600);
  });
});
```

---

## 6. Security Tests

### 6.1 Judge Authorization

```typescript
describe('Security: Judge Authorization', () => {
  it('should prevent judge from editing another judge score', async () => {
    const competition = await createTestCompetition({ status: 'active' });
    const entry = await setCurrentEntry(competition);
    const judge1 = await createTestJudge(competition);
    const judge2 = await createTestJudge(competition);

    // Judge 1 submits score
    const submitResult = await trpc.liveCompetition.submitScore({
      competitionId: competition.id,
      entryId: entry.id,
      judgeId: judge1.id,
      score: 80,
    });

    // Judge 2 tries to edit Judge 1's score
    await expect(
      trpc.liveCompetition.editScore(
        {
          competitionId: competition.id,
          scoreId: submitResult.scoreId,
          newScore: 90,
          reason: 'Malicious edit',
        },
        { user: judge2 }
      )
    ).rejects.toThrow('FORBIDDEN');
  });

  it('should prevent scoreboard from submitting scores', async () => {
    const competition = await createTestCompetition({ status: 'active' });
    const entry = await setCurrentEntry(competition);

    // Try to submit via public endpoint
    await expect(
      fetch('/api/live/submit-score', {
        method: 'POST',
        body: JSON.stringify({
          competitionId: competition.id,
          entryId: entry.id,
          score: 99,
        }),
      })
    ).rejects.toThrow('UNAUTHORIZED');
  });
});
```

### 6.2 Tenant Isolation

```typescript
describe('Security: Tenant Isolation', () => {
  it('should not allow cross-tenant access', async () => {
    const tenant1Competition = await createTestCompetition({ tenantId: 'tenant1' });
    const tenant2Judge = await createTestJudge({ tenantId: 'tenant2' });

    // Judge from tenant2 tries to access tenant1 competition
    await expect(
      trpc.liveCompetition.getLineup(
        { competitionId: tenant1Competition.id },
        { tenantId: 'tenant2' }
      )
    ).rejects.toThrow('NOT_FOUND');
  });
});
```

---

## 7. Edge Case Tests

### 7.1 Duplicate Score Prevention

```typescript
describe('Edge Case: Duplicate Score Prevention', () => {
  it('should prevent duplicate submission without idempotency key', async () => {
    const competition = await createTestCompetition({ status: 'active' });
    const entry = await setCurrentEntry(competition);
    const judge = await createTestJudge(competition);

    // First submission
    await trpc.liveCompetition.submitScore({
      competitionId: competition.id,
      entryId: entry.id,
      judgeId: judge.id,
      score: 85,
    });

    // Duplicate submission
    await expect(
      trpc.liveCompetition.submitScore({
        competitionId: competition.id,
        entryId: entry.id,
        judgeId: judge.id,
        score: 90, // Different score
      })
    ).rejects.toThrow('CONFLICT');
  });

  it('should allow resubmission with idempotency key', async () => {
    const competition = await createTestCompetition({ status: 'active' });
    const entry = await setCurrentEntry(competition);
    const judge = await createTestJudge(competition);
    const idempotencyKey = 'unique-key-123';

    // First submission
    const result1 = await trpc.liveCompetition.submitScore({
      competitionId: competition.id,
      entryId: entry.id,
      judgeId: judge.id,
      score: 85,
      idempotencyKey,
    });

    // Duplicate with same key (should succeed idempotently)
    const result2 = await trpc.liveCompetition.submitScore({
      competitionId: competition.id,
      entryId: entry.id,
      judgeId: judge.id,
      score: 85,
      idempotencyKey,
    });

    expect(result1.scoreId).toBe(result2.scoreId);
  });
});
```

### 7.2 Competition Across Midnight

```typescript
describe('Edge Case: Competition Across Midnight', () => {
  it('should handle day transition correctly', async () => {
    const competition = await createTestCompetition({
      status: 'active',
      startDate: '2025-01-15',
      endDate: '2025-01-16',
    });

    // Set state to Day 1, near end of day
    await setCompetitionState(competition, {
      dayNumber: 1,
      currentTime: '23:55:00',
    });

    // Complete last routine of Day 1
    await trpc.liveCompetition.advanceToNext({
      competitionId: competition.id,
    });

    // Verify day transition
    const state = await trpc.liveCompetition.getLiveState({
      competitionId: competition.id,
    });

    // Should either be Day 2 or show "End of Day 1" based on implementation
    expect(state.dayNumber).toBe(1); // Still Day 1 until explicit transition
    expect(state.currentEntry).toBeNull(); // No more Day 1 routines
  });
});
```

---

## 8. Test Data Fixtures

### 8.1 Competition Factory

```typescript
export async function createTestCompetition(options: {
  status?: 'pending' | 'active' | 'completed';
  routineCount?: number;
  judgeCount?: number;
  withMP3s?: boolean;
  tenantId?: string;
} = {}) {
  const {
    status = 'pending',
    routineCount = 3,
    judgeCount = 3,
    withMP3s = false,
    tenantId = 'test-tenant',
  } = options;

  const competition = await prisma.competitions.create({
    data: {
      name: `Test Competition ${Date.now()}`,
      year: 2025,
      tenant_id: tenantId,
      status,
      scoring_ranges: {
        platinum: [95, 100],
        high_gold: [90, 94.9],
        gold: [85, 89.9],
        silver: [80, 84.9],
        bronze: [70, 79.9],
      },
    },
  });

  // Create entries
  for (let i = 0; i < routineCount; i++) {
    await prisma.competition_entries.create({
      data: {
        competition_id: competition.id,
        tenant_id: tenantId,
        title: `Test Routine ${i + 1}`,
        entry_number: 100 + i + 1,
        running_order: i + 1,
        live_status: 'queued',
        music_file_url: withMP3s ? `https://storage.example.com/test-${i}.mp3` : null,
        mp3_duration_ms: withMP3s ? 180000 : null,
      },
    });
  }

  // Create judges
  for (let i = 0; i < judgeCount; i++) {
    await prisma.judges.create({
      data: {
        competition_id: competition.id,
        tenant_id: tenantId,
        name: `Judge ${i + 1}`,
        judge_number: i + 1,
        pin_code: `${100000 + i}`,
      },
    });
  }

  return competition;
}
```

---

*Test specifications complete with unit, integration, E2E, offline, performance, security, and edge case tests. Ready for implementation.*
