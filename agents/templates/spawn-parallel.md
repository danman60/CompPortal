# Parallel Agent Spawning Template

Use this template when agents can work independently in parallel.

## Pattern

```typescript
// Spawn multiple agents in parallel
const results = await Promise.all([
  Task({
    subagent_type: "general-purpose",
    description: "backend-agent: [brief description]",
    prompt: await Read({ file_path: 'D:\\ClaudeCode\\CompPortal\\agents\\backend-agent.md' }) + `

      ## Feature: [Feature Name]

      [Specific requirements for backend agent]

      Files to create:
      - src/server/routers/[router-name].ts
      - [other backend files]

      Implement:
      - [API endpoint 1]
      - [API endpoint 2]
      - [Business logic]

      Quality gates:
      - npm run build must pass
      - Router registered in _app.ts
      - Zod validation for all inputs
    `
  }),

  Task({
    subagent_type: "general-purpose",
    description: "frontend-agent: [brief description]",
    prompt: await Read({ file_path: 'D:\\ClaudeCode\\CompPortal\\agents\\frontend-agent.md' }) + `

      ## Feature: [Feature Name]

      [Specific requirements for frontend agent]

      Files to create:
      - src/components/[ComponentName].tsx
      - src/app/dashboard/[route]/page.tsx

      UI Requirements:
      - Glassmorphic design: bg-white/10 backdrop-blur-md
      - Emoji icons: [emoji] for [purpose]
      - [Layout requirements]

      Use tRPC:
      - trpc.[router].[query].useQuery()
      - trpc.[router].[mutation].useMutation()
    `
  }),

  Task({
    subagent_type: "general-purpose",
    description: "testing-agent: [brief description]",
    prompt: await Read({ file_path: 'D:\\ClaudeCode\\CompPortal\\agents\\testing-agent.md' }) + `

      ## Feature: [Feature Name]

      Test: [User journey to test]
      Production URL: https://comp-portal-one.vercel.app
      Test Credentials: [if needed]
    `
  })
])

console.log("✅ All agents completed in parallel")
```

## When to Use

- ✅ Backend and Frontend can build simultaneously
- ✅ No dependencies between agents
- ✅ Complex feature requiring multiple specialists
- ✅ Want to maximize speed (3-5x faster than sequential)

## Example Usage

```typescript
// Building Competition Settings feature
const results = await Promise.all([
  Task({ /* backend-agent: Settings API */ }),
  Task({ /* frontend-agent: Settings Form */ }),
  Task({ /* testing-agent: Test settings workflow */ })
])
```

## Benefits

- **Speed**: 3-5x faster than sequential execution
- **Parallelization**: Maximum utilization of resources
- **Independence**: Agents don't block each other
