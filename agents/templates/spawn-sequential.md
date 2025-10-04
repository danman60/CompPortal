# Sequential Agent Spawning Template

Use this template when agents have dependencies (one must complete before another starts).

## Pattern

```typescript
// Sequential spawning when dependencies exist

// 1. Database agent first (if schema changes needed)
const dbResult = await Task({
  subagent_type: "general-purpose",
  description: "database-agent: Add/modify database schema",
  prompt: await Read({ file_path: 'D:\\ClaudeCode\\CompPortal\\agents\\database-agent.md' }) + `

    ## Feature: [Feature Name]

    Add/modify database tables:
    - [Table 1] with columns: [...]
    - [Table 2] with columns: [...]

    Migration name: 20251004_[brief_description].sql

    Use Supabase MCP:
    - mcp__supabase__apply_migration({ name, query })
    - mcp__supabase__generate_typescript_types()
  `
})

console.log("✅ Database migration complete")

// 2. Backend agent second (uses new schema)
const backendResult = await Task({
  subagent_type: "general-purpose",
  description: "backend-agent: Build API using new schema",
  prompt: await Read({ file_path: 'D:\\ClaudeCode\\CompPortal\\agents\\backend-agent.md' }) + `

    ## Feature: [Feature Name]

    Use the new database schema from database-agent:
    ${dbResult}

    Files to create:
    - src/server/routers/[router-name].ts

    Implement:
    - [CRUD operations using new tables]
    - [Business logic]
  `
})

console.log("✅ Backend API complete")

// 3. Frontend agent last (uses backend API)
const frontendResult = await Task({
  subagent_type: "general-purpose",
  description: "frontend-agent: Build UI using new API",
  prompt: await Read({ file_path: 'D:\\ClaudeCode\\CompPortal\\agents\\frontend-agent.md' }) + `

    ## Feature: [Feature Name]

    Use the API endpoints from backend-agent:
    ${backendResult}

    Files to create:
    - src/components/[ComponentName].tsx
    - src/app/dashboard/[route]/page.tsx

    Use tRPC endpoints:
    - [List of endpoints from backend-agent]
  `
})

console.log("✅ Frontend UI complete")
```

## When to Use

- ✅ Frontend needs backend API to be ready first
- ✅ Backend needs database schema to be updated first
- ✅ Database migrations must complete before code changes
- ✅ Clear dependency chain: Database → Backend → Frontend

## Dependency Chains

### Full Stack Feature with Schema Changes
```
database-agent
    ↓ (schema ready)
backend-agent (uses schema)
    ↓ (API ready)
frontend-agent (uses API)
```

### Feature Without Schema Changes
```
backend-agent
    ↓ (API ready)
frontend-agent (uses API)
```

## Example Usage

```typescript
// Building a feature that needs a new database table

// 1. Database first
const dbResult = await Task({ /* database-agent */ })

// 2. Backend second (waits for schema)
const backendResult = await Task({ /* backend-agent with ${dbResult} */ })

// 3. Frontend last (waits for API)
const frontendResult = await Task({ /* frontend-agent with ${backendResult} */ })
```

## When NOT to Use

- ❌ Don't use sequential when agents are independent
- ❌ Don't wait for backend if frontend can start with mocked data
- ❌ Don't chain agents unnecessarily (use parallel instead)

## Comparison

| Pattern | Speed | Use When |
|---------|-------|----------|
| **Sequential** | Slower | Dependencies exist |
| **Parallel** | 3-5x faster | Independent work |
