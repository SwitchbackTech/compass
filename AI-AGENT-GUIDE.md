# AI Agent Guide for Compass Calendar

**A comprehensive guide for AI coding agents working on the Compass Calendar project**

## 🚀 Quick Start (60 seconds)

```bash
# 1. Install dependencies (~3.5 minutes)
yarn install --frozen-lockfile --network-timeout 300000

# 2. Setup environment
cp packages/backend/.env.local.example packages/backend/.env

# 3. Start development (frontend only)
yarn dev:web
# Open http://localhost:9080

# 4. Run tests
yarn test:core && yarn test:web

# 5. Generate documentation
yarn docs:generate
```

## 📚 Essential Documentation

### Primary Guides

- **[README.md](./README.md)** - Project overview and "For AI Agents" section
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines with AI agent-specific sections
- **[AGENTS.md](./AGENTS.md)** - Detailed development instructions and conventions
- **[ai-tools/README.md](./ai-tools/README.md)** - AI tooling documentation

### Architecture Reference

- **Monorepo Structure**: 4 packages (web, backend, core, scripts)
- **Type System**: TypeScript + Zod schemas for validation
- **State Management**: Redux (frontend)
- **API**: Express REST API with Supertokens authentication
- **Database**: MongoDB

## 🛠️ AI Tools Available

### 1. API Documentation Generator

```bash
yarn docs:generate
```

**Output**: `ai-tools/api-documentation.md`
**Purpose**: Auto-extracts all backend API endpoints with authentication requirements

### 2. Type Reference Extractor

```bash
yarn ts-node ai-tools/extract-types.ts
```

**Output**: `ai-tools/type-reference.md`
**Purpose**: Documents all TypeScript types, interfaces, and Zod schemas

### 3. Code Health Auditor

```bash
yarn audit:code-health
```

**Output**: Console report
**Purpose**: Analyzes codebase for issues, complexity metrics, and improvement areas

### 4. Full AI Index

```bash
yarn ai:index
```

**Purpose**: Runs documentation generators (API docs + type reference)

### 5. Type Checker

```bash
yarn type-check
```

**Purpose**: Full TypeScript type validation across all packages

## 📖 Key Concepts

### Module Aliases (ALWAYS USE THESE)

```typescript
// ✅ Correct - Use aliases
import { foo } from '@compass/core'
import { bar } from '@web/common/utils'
import { baz } from '@core/types'

// ❌ Wrong - No relative paths
import { foo } from '../../../core/src'
```

**Available Aliases**:

- `@compass/backend` → `packages/backend/src`
- `@compass/core` → `packages/core/src`
- `@compass/scripts` → `packages/scripts/src`
- `@web/*` → `packages/web/src/*`
- `@core/*` → `packages/core/src/*`

### Validation Pattern (ALWAYS USE ZOD)

```typescript
import { z } from "zod";

// 1. Define schema
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
});

// 2. Export inferred type
export type User = z.infer<typeof UserSchema>;

// 3. Use for validation
const user = UserSchema.parse(data);
```

### Testing Pattern (USE TESTING LIBRARY)

```typescript
// ✅ Correct - Semantic queries and user interactions
const button = screen.getByRole('button', { name: /save/i });
await user.click(button);

// ❌ Wrong - Implementation details
const button = container.querySelector('.save-btn');
```

## 🏗️ Architecture Overview

### Backend (`@compass/backend`)

```
packages/backend/src/
├── auth/           # Google OAuth integration
├── calendar/       # Calendar list and selection
├── event/          # Event CRUD operations
├── sync/           # Google Calendar sync logic
├── user/           # User profile and metadata
├── priority/       # Task priority management
├── waitlist/       # Waitlist management
└── common/         # Shared utilities, middleware
```

**Key Files**:

- `*routes.config.ts` - Route definitions
- `controllers/*.controller.ts` - Request handlers
- `services/*.service.ts` - Business logic
- `dao/*.dao.ts` - Database operations

### Frontend (`@compass/web`)

```
packages/web/src/
├── views/          # React components by feature
│   ├── Calendar/   # Calendar view (day/week)
│   ├── Forms/      # Event forms
│   ├── Now/        # Focus mode
│   └── Root.tsx    # Router configuration
├── store/          # Redux state management
│   ├── calendar/   # Calendar state
│   ├── draft/      # Draft event state
│   ├── schema/     # Schema state
│   ├── settings/   # User settings
│   ├── sidebar/    # Sidebar state
│   ├── task/       # Task state
│   └── view/       # View state
├── common/         # Shared utilities
└── hooks/          # Custom React hooks
```

**Key Patterns**:

- Use Tailwind semantic colors: `bg-bg-primary` not `bg-blue-300`
- No barrel files (`index.ts`) - use named exports
- Redux for global state, local state for component-specific

### Core (`@compass/core`)

```
packages/core/src/
├── types/          # TypeScript type definitions
├── constants/      # Shared constants
├── util/           # Utility functions
│   ├── date/       # Date/time utilities (dayjs)
│   └── event/      # Event utilities
├── mappers/        # Data transformation
└── validators/     # Validation schemas
```

**Key Files**:

- `types/**/*.types.ts` - Type definitions with Zod schemas
- `util/date/` - Date handling with dayjs and custom plugins
- `mappers/` - Transform between Compass and Google Calendar formats

### Scripts (`@compass/scripts`)

```
packages/scripts/src/
├── commands/       # CLI commands (build, seed, delete)
├── common/         # Shared CLI utilities
└── cli.ts          # Command-line interface entry point
```

## 🔐 Authentication & Authorization

### Supertokens Session Management

- **Session validation**: `verifySession()` middleware
- **Google OAuth**: `requireGoogleConnectionSession` middleware
- **Dev-only**: `authMiddleware.verifyIsDev` middleware

### API Endpoint Patterns

```typescript
// Public endpoint (no auth)
this.app.route("/api/waitlist").post(controller.method);

// Authenticated endpoint
this.app.route("/api/user/profile").all(verifySession()).get(controller.method);

// Requires Google Calendar connection
this.app
  .route("/api/event")
  .all(verifySession())
  .post(requireGoogleConnectionSession, controller.create);
```

## 🧪 Testing Strategy

### Test Commands

```bash
yarn test:core      # Core package tests (~2 seconds, 134 tests)
yarn test:web       # Web package tests (~15 seconds)
yarn test:backend   # Backend tests (~15 seconds)
yarn test:scripts   # Scripts tests
yarn test           # Full suite (avoid in restricted networks)
yarn test:e2e       # Playwright E2E tests
```

### Writing Tests

1. **Frontend**: Use Testing Library, semantic queries, user-event
2. **Backend**: Use Jest, mock external services
3. **Core**: Pure function tests, edge cases
4. **E2E**: Playwright for critical user flows

## 📝 Git Workflow

### Branch Naming

```bash
feature/add-calendar-sync
bug/fix-auth-timeout
docs/update-api-docs
refactor/simplify-event-logic
```

### Commit Messages (Conventional Commits)

```bash
feat(web): add calendar event creation modal
fix(backend): resolve authentication timeout
docs(readme): update AI agent instructions
refactor(core): simplify date utility functions
test(web): add tests for login flow
```

## 🎯 Common Tasks

### Adding a New API Endpoint

1. Define types in `packages/core/src/types/`
2. Create Zod schema for validation
3. Add route in `packages/backend/src/*/routes.config.ts`
4. Implement controller in `controllers/*.controller.ts`
5. Add service logic in `services/*.service.ts`
6. Add DAO if database access needed
7. Add JSDoc comments with `@auth`, `@body`, `@returns`, `@throws`
8. Write tests
9. Run `yarn docs:generate` to update API docs

### Adding a New React Component

1. Create component in `packages/web/src/views/[feature]/`
2. Use semantic Tailwind colors from `@theme` directive
3. Add TypeScript types (no `any`)
4. Write tests using Testing Library
5. Use Redux for global state, props for local
6. Follow naming conventions (`is` prefix for booleans)

### Modifying Date Logic

1. Use dayjs from `@core/util/date/dayjs`
2. Prefer custom plugin methods over manual manipulation
3. Always handle timezones explicitly
4. Add JSDoc with examples
5. Write comprehensive tests for edge cases

## ⚡ Performance Tips

- Use `yarn ai:index` to build documentation once, reference it
- Run targeted tests (`yarn test:core`) instead of full suite
- Use `yarn type-check` before committing
- Frontend works standalone - no backend needed for UI work

## 🔧 Troubleshooting

### Common Issues

**Tests failing?**

```bash
# Run packages individually
yarn test:core
yarn test:web
yarn test:backend
```

**Backend won't start?**

- Missing env variables in `packages/backend/.env`
- Use web-only mode: `yarn dev:web`

**Type errors?**

```bash
yarn type-check
```

**Code style issues?**

```bash
yarn prettier . --write
```

### Network Limitations

- MongoDB binary downloads may fail in restricted networks
- Use individual test commands instead of full suite
- Frontend tests work without backend

## 📊 Code Quality Standards

### Pre-Commit Checklist

1. ✅ Code follows module alias conventions
2. ✅ All new code has tests
3. ✅ Types are defined with Zod schemas
4. ✅ JSDoc comments added for public APIs
5. ✅ `yarn prettier . --write` passes
6. ✅ `yarn type-check` passes
7. ✅ Relevant tests pass

### Code Review Standards

1. Changes are surgical and minimal
2. No introduction of `any` types
3. Error handling is comprehensive
4. Documentation is updated
5. No unrelated changes included

## 🌟 Best Practices

### DO ✅

- Use module aliases for imports
- Use Zod for all validation
- Write tests using semantic queries
- Add JSDoc to public APIs
- Follow conventional commit format
- Keep changes focused and minimal
- Run `yarn audit:code-health` before PRs

### DON'T ❌

- Use relative imports
- Use `any` types (use `unknown` instead)
- Use `data-*` attributes in tests
- Use raw Tailwind colors (use semantic)
- Create barrel files (`index.ts`)
- Use `console.log` (use logger)
- Modify unrelated code

## 🔗 Resources

### External References

- **OpenAI Harness Engineering**: [https://openai.com/index/harness-engineering/](https://openai.com/index/harness-engineering/)
- **Loop Methodology**: [https://ghuntley.com/loop/](https://ghuntley.com/loop/)
- **Testing Library**: [https://testing-library.com/docs/react-testing-library/intro/](https://testing-library.com/docs/react-testing-library/intro/)
- **Zod Documentation**: [https://zod.dev/](https://zod.dev/)

### Internal Documentation

- **AI Workflow Examples**: [ai-tools/workflow-examples.md](./ai-tools/workflow-examples.md)
- **Generated API Docs**: [ai-tools/api-documentation.md](./ai-tools/api-documentation.md)
- **Type Reference**: [ai-tools/type-reference.md](./ai-tools/type-reference.md)

## 🆘 Getting Help

1. **Check existing documentation** - README, AGENTS.md, CONTRIBUTING.md
2. **Run AI tools** - `yarn ai:index` for up-to-date docs
3. **Review workflow examples** - See `ai-tools/workflow-examples.md`
4. **Check GitHub issues** - Look for similar problems
5. **Create an issue** - Provide context and steps to reproduce

## 📈 Success Metrics

An AI agent is successful when:

- ✅ Changes are minimal and surgical
- ✅ All tests pass (core, web, backend)
- ✅ Type checking passes
- ✅ Code follows conventions
- ✅ Documentation is updated
- ✅ No regressions introduced
- ✅ Code is readable and maintainable

---

**Remember**: The goal is to make safe, incremental improvements while maintaining high code quality and following established patterns. When in doubt, check the documentation, run the AI tools, and keep changes small and focused.
