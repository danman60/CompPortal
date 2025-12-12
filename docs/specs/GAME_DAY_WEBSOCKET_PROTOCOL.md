# Game Day WebSocket Protocol

**Status:** COMPLETE - Ready for Implementation
**Last Updated:** December 11, 2025

---

## 1. Overview

WebSocket-based real-time sync for Game Day with 250ms latency target.

### Connection URL

```
wss://[domain]/api/live/ws?competitionId={id}&role={role}&token={token}
```

### Roles

| Role | Description | Can Send | Can Receive |
|------|-------------|----------|-------------|
| `cd` | Competition Director | All events | All events |
| `judge` | Judge tablet | Score events, break requests | All events |
| `backstage` | Backstage tech | Playback events | All events |
| `scoreboard` | Public display | None (read-only) | Public events |

---

## 2. Message Format

### Base Message Structure

```typescript
interface WebSocketMessage {
  // Message metadata
  id: string;              // UUID for deduplication
  type: string;            // Event type
  timestamp: number;       // Unix timestamp in ms
  sequenceNumber: number;  // Monotonic sequence for ordering

  // Context
  competitionId: string;
  tenantId: string;

  // Sender info
  senderId: string;        // User/device ID
  senderRole: 'cd' | 'judge' | 'backstage' | 'scoreboard';

  // Payload
  payload: Record<string, unknown>;
}
```

### Example Message

```json
{
  "id": "msg_abc123",
  "type": "score:submitted",
  "timestamp": 1733929200000,
  "sequenceNumber": 42,
  "competitionId": "comp_xyz",
  "tenantId": "tenant_123",
  "senderId": "judge_1",
  "senderRole": "judge",
  "payload": {
    "entryId": "entry_456",
    "judgeId": "judge_1",
    "score": 82.5,
    "awardLevel": "high_gold"
  }
}
```

---

## 3. Event Types

### 3.1 Competition Events

#### `competition:started`
CD starts the competition.

```typescript
{
  type: 'competition:started',
  payload: {
    startedAt: string;       // ISO timestamp
    dayNumber: number;
    sessionNumber: number;
    totalRoutines: number;
    firstEntryId: string;
  }
}
```

#### `competition:paused`
CD pauses the competition.

```typescript
{
  type: 'competition:paused',
  payload: {
    pausedAt: string;
    reason?: string;
    currentEntryId: string;
    playbackPositionMs: number;
  }
}
```

#### `competition:resumed`
CD resumes from pause.

```typescript
{
  type: 'competition:resumed',
  payload: {
    resumedAt: string;
    pauseDurationMs: number;
    currentEntryId: string;
  }
}
```

#### `competition:ended`
CD ends the competition.

```typescript
{
  type: 'competition:ended',
  payload: {
    endedAt: string;
    totalCompleted: number;
    totalSkipped: number;
    totalScratched: number;
  }
}
```

### 3.2 Routine Events

#### `routine:started`
A routine begins performing.

```typescript
{
  type: 'routine:started',
  payload: {
    entryId: string;
    entryNumber: number;
    title: string;
    studioName: string;
    category: string;
    durationMs: number;
    startedAt: string;
  }
}
```

#### `routine:scoring`
Routine performance ended, scoring phase.

```typescript
{
  type: 'routine:scoring',
  payload: {
    entryId: string;
    entryNumber: number;
    startedScoringAt: string;
  }
}
```

#### `routine:completed`
All scores in, routine complete.

```typescript
{
  type: 'routine:completed',
  payload: {
    entryId: string;
    entryNumber: number;
    averageScore: number;
    awardLevel: string;
    scoresCount: number;
    completedAt: string;
  }
}
```

#### `routine:skipped`
CD skips a routine.

```typescript
{
  type: 'routine:skipped',
  payload: {
    entryId: string;
    entryNumber: number;
    skippedBy: string;
    skippedAt: string;
  }
}
```

#### `routine:scratched`
CD scratches a routine.

```typescript
{
  type: 'routine:scratched',
  payload: {
    entryId: string;
    entryNumber: number;
    reason?: string;
    scratchedBy: string;
    scratchedAt: string;
  }
}
```

#### `routine:reordered`
CD reorders routine in lineup.

```typescript
{
  type: 'routine:reordered',
  payload: {
    entryId: string;
    entryNumber: number;
    previousPosition: number;
    newPosition: number;
    reorderedBy: string;
  }
}
```

### 3.3 Score Events

#### `score:submitted`
Judge submits a score.

```typescript
{
  type: 'score:submitted',
  payload: {
    entryId: string;
    judgeId: string;
    judgeName: string;
    judgeNumber: number;
    score: number;
    awardLevel: string;
    submittedAt: string;
  }
}
```

#### `score:edited`
CD edits a submitted score.

```typescript
{
  type: 'score:edited',
  payload: {
    entryId: string;
    judgeId: string;
    previousScore: number;
    newScore: number;
    reason: string;
    editedBy: string;
    editedAt: string;
  }
}
```

#### `score:visibility_changed`
CD toggles score visibility.

```typescript
{
  type: 'score:visibility_changed',
  payload: {
    judgesCanSeeScores: boolean;
    changedBy: string;
    changedAt: string;
  }
}
```

### 3.4 Break Events

#### `break:requested`
Judge requests a break.

```typescript
{
  type: 'break:requested',
  payload: {
    requestId: string;
    judgeId: string;
    judgeName: string;
    durationMinutes: number;
    requestedAt: string;
  }
}
```

#### `break:approved`
CD approves break request.

```typescript
{
  type: 'break:approved',
  payload: {
    requestId: string;
    judgeId: string;
    durationMinutes: number;
    scheduledStartTime: string;
    approvedBy: string;
    approvedAt: string;
  }
}
```

#### `break:denied`
CD denies break request.

```typescript
{
  type: 'break:denied',
  payload: {
    requestId: string;
    judgeId: string;
    reason?: string;
    deniedBy: string;
    deniedAt: string;
  }
}
```

#### `break:started`
Break begins.

```typescript
{
  type: 'break:started',
  payload: {
    breakId: string;
    breakType: 'emergency' | 'scheduled' | 'judge_requested';
    durationMinutes: number;
    title: string;
    startedAt: string;
  }
}
```

#### `break:ended`
Break ends (time elapsed or CD ends early).

```typescript
{
  type: 'break:ended',
  payload: {
    breakId: string;
    actualDurationMinutes: number;
    endedEarly: boolean;
    endedAt: string;
  }
}
```

### 3.5 Playback Events

#### `playback:started`
MP3 playback begins.

```typescript
{
  type: 'playback:started',
  payload: {
    entryId: string;
    durationMs: number;
    startedAt: string;
  }
}
```

#### `playback:paused`
Playback paused.

```typescript
{
  type: 'playback:paused',
  payload: {
    entryId: string;
    positionMs: number;
    pausedAt: string;
  }
}
```

#### `playback:resumed`
Playback resumed.

```typescript
{
  type: 'playback:resumed',
  payload: {
    entryId: string;
    positionMs: number;
    resumedAt: string;
  }
}
```

#### `playback:position`
Position sync (every 500ms while playing).

```typescript
{
  type: 'playback:position',
  payload: {
    entryId: string;
    positionMs: number;
    durationMs: number;
    isPlaying: boolean;
  }
}
```

#### `playback:ended`
MP3 reached end.

```typescript
{
  type: 'playback:ended',
  payload: {
    entryId: string;
    endedAt: string;
  }
}
```

### 3.6 Connection Events

#### `presence:joined`
Device connected to room.

```typescript
{
  type: 'presence:joined',
  payload: {
    userId: string;
    role: string;
    deviceId: string;
    joinedAt: string;
  }
}
```

#### `presence:left`
Device disconnected.

```typescript
{
  type: 'presence:left',
  payload: {
    userId: string;
    role: string;
    deviceId: string;
    leftAt: string;
  }
}
```

#### `presence:list`
Current connected users (sent on connect).

```typescript
{
  type: 'presence:list',
  payload: {
    users: Array<{
      userId: string;
      role: string;
      deviceId: string;
      connectedAt: string;
    }>;
  }
}
```

### 3.7 Schedule Events

#### `schedule:delay_updated`
Schedule delay changed.

```typescript
{
  type: 'schedule:delay_updated',
  payload: {
    delayMinutes: number;
    previousDelayMinutes: number;
    updatedAt: string;
  }
}
```

---

## 4. Client Commands

Commands sent FROM client TO server.

### 4.1 Connection Commands

#### `join`
Join competition room (sent automatically on connect).

```typescript
{
  type: 'join',
  payload: {
    competitionId: string;
    role: string;
    token: string;
  }
}
```

#### `ping`
Heartbeat (every 30s).

```typescript
{
  type: 'ping',
  payload: {
    clientTime: number;
  }
}
```

### 4.2 Sync Commands

#### `sync:request_state`
Request full state (on reconnect).

```typescript
{
  type: 'sync:request_state',
  payload: {
    lastSequenceNumber: number;
  }
}
```

#### `sync:ack`
Acknowledge received message.

```typescript
{
  type: 'sync:ack',
  payload: {
    messageId: string;
    receivedAt: number;
  }
}
```

---

## 5. Server Responses

### 5.1 Connection Responses

#### `pong`
Heartbeat response.

```typescript
{
  type: 'pong',
  payload: {
    clientTime: number;
    serverTime: number;
    latencyMs: number;
  }
}
```

#### `sync:state`
Full state snapshot.

```typescript
{
  type: 'sync:state',
  payload: {
    competitionState: string;
    currentEntry: {...};
    playbackState: {...};
    scheduleDelay: number;
    judgesStatus: Array<{...}>;
    pendingBreakRequests: Array<{...}>;
    sequenceNumber: number;
  }
}
```

#### `sync:missed_events`
Events missed during disconnect.

```typescript
{
  type: 'sync:missed_events',
  payload: {
    events: WebSocketMessage[];
    fromSequence: number;
    toSequence: number;
  }
}
```

### 5.2 Error Responses

#### `error`
Error response.

```typescript
{
  type: 'error',
  payload: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }
}
```

Error codes:
- `UNAUTHORIZED` - Invalid or expired token
- `FORBIDDEN` - Role cannot perform action
- `NOT_FOUND` - Resource not found
- `INVALID_STATE` - Action not allowed in current state
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## 6. Connection Management

### 6.1 Authentication

```typescript
// On connect, send authentication
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'join',
    payload: {
      competitionId: 'comp_xyz',
      role: 'judge',
      token: 'jwt_token_here'
    }
  }));
};
```

### 6.2 Heartbeat

```typescript
// Send ping every 30 seconds
setInterval(() => {
  ws.send(JSON.stringify({
    type: 'ping',
    payload: { clientTime: Date.now() }
  }));
}, 30000);
```

### 6.3 Reconnection Strategy

```typescript
const reconnect = (attempt: number) => {
  const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
  setTimeout(() => {
    connect();
  }, delay);
};

ws.onclose = () => {
  reconnect(attemptCount++);
};
```

### 6.4 State Recovery on Reconnect

```typescript
ws.onopen = () => {
  // Request missed events since disconnect
  ws.send(JSON.stringify({
    type: 'sync:request_state',
    payload: {
      lastSequenceNumber: lastReceivedSequence
    }
  }));
};
```

---

## 7. Message Ordering

### 7.1 Sequence Numbers

- Server assigns monotonically increasing sequence number to each message
- Client tracks `lastReceivedSequence`
- On reconnect, request events since `lastReceivedSequence`
- Discard messages with sequence <= lastReceived

### 7.2 Out-of-Order Handling

```typescript
const messageBuffer: Map<number, WebSocketMessage> = new Map();
let expectedSequence = 0;

const processMessage = (msg: WebSocketMessage) => {
  if (msg.sequenceNumber === expectedSequence) {
    // Process immediately
    handleMessage(msg);
    expectedSequence++;

    // Process any buffered messages
    while (messageBuffer.has(expectedSequence)) {
      handleMessage(messageBuffer.get(expectedSequence)!);
      messageBuffer.delete(expectedSequence);
      expectedSequence++;
    }
  } else if (msg.sequenceNumber > expectedSequence) {
    // Buffer for later
    messageBuffer.set(msg.sequenceNumber, msg);
  }
  // Discard if < expectedSequence (duplicate)
};
```

---

## 8. Role Permissions

### 8.1 CD Permissions

Can send:
- All competition events
- All routine events
- Score editing events
- Break response events
- Playback control (optional)

### 8.2 Judge Permissions

Can send:
- `score:submitted` (own scores only)
- `break:requested`
- `presence:*`

Cannot send:
- Score edits
- Competition control
- Routine control

### 8.3 Backstage Permissions

Can send:
- All playback events
- `presence:*`

Cannot send:
- Score events
- Competition control
- Break events

### 8.4 Scoreboard Permissions

Can send:
- `presence:*`
- `ping`

Cannot send:
- Any other events

---

## 9. Rate Limiting

| Event Type | Limit |
|------------|-------|
| `playback:position` | 2/second |
| `score:submitted` | 1/second per judge |
| `break:requested` | 1/minute per judge |
| `ping` | 1/10 seconds |
| Other events | 10/second |

---

## 10. Offline Handling

### 10.1 Queue Outgoing Messages

```typescript
const messageQueue: WebSocketMessage[] = [];

const send = (msg: WebSocketMessage) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  } else {
    messageQueue.push(msg);
    saveToIndexedDB('pendingMessages', messageQueue);
  }
};
```

### 10.2 Flush Queue on Reconnect

```typescript
ws.onopen = async () => {
  const pending = await loadFromIndexedDB('pendingMessages');
  for (const msg of pending) {
    ws.send(JSON.stringify(msg));
  }
  await clearFromIndexedDB('pendingMessages');
};
```

---

## 11. Implementation Notes

### 11.1 Server Setup (Next.js)

```typescript
// pages/api/live/ws.ts
import { WebSocketServer } from 'ws';

export default function handler(req, res) {
  if (!res.socket.server.wss) {
    const wss = new WebSocketServer({ noServer: true });
    res.socket.server.wss = wss;

    res.socket.server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });
  }
  res.end();
}
```

### 11.2 Room Management

```typescript
// Competition rooms
const rooms = new Map<string, Set<WebSocket>>();

const joinRoom = (competitionId: string, ws: WebSocket) => {
  if (!rooms.has(competitionId)) {
    rooms.set(competitionId, new Set());
  }
  rooms.get(competitionId)!.add(ws);
};

const broadcast = (competitionId: string, msg: WebSocketMessage, exclude?: WebSocket) => {
  const room = rooms.get(competitionId);
  if (room) {
    room.forEach((ws) => {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    });
  }
};
```

---

*WebSocket protocol is complete with all event types, message formats, authentication, reconnection, and offline handling. Ready for implementation.*
