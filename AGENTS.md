# Compass Calendar Development Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Key Guidelines

1. When working in `packages/web`, follow React best practices and idiomatic patterns
2. When working in `packages/backend` or `packages/core`, follow Node.js best practices and idiomatic patterns

## Working Effectively

### Initial Setup

- Install dependencies: `yarn install --frozen-lockfile --network-timeout 300000`
  - Takes ~3.5 minutes. NEVER CANCEL. Set timeout to 10+ minutes.
- Copy environment template: `cp packages/backend/.env.example packages/backend/.env`

### Development Servers

- **CRITICAL**: The backend requires external service credentials (Google OAuth, Supertokens, MongoDB) to run properly
- **Web Development** (RECOMMENDED for coding):
  - `yarn dev:web` - Takes ~10 seconds to build. Serves on http://localhost:9080/
  - Frontend works standalone without backend services
- **Backend Development** (requires full setup):
  - `yarn dev:backend` - Fails without proper .env configuration
  - Needs: Google Cloud OAuth credentials, Supertokens account, MongoDB connection

### Testing

### Writing Tests in `@compass/web`

- Write tests the way a user would use the application by using the DOM and user interactions with `@testing-library/user-event` rather than internal implementation details of React components.
- Do NOT use `data-` attributes or CSS selectors to locate elements. Use semantic locators and roles instead.

#### Running Tests

- **Core tests**: `yarn test:core` - Takes ~2 seconds. NEVER CANCEL. Always tests pass.
- **Web tests**: `yarn test:web` - Takes ~15 seconds. NEVER CANCEL. All tests pass
- **Full test suite**: `yarn test` - Takes ~18 seconds but FAILS in restricted environments due to MongoDB binary download from fastdl.mongodb.org
  - Use individual package tests instead: `yarn test:core` and `yarn test:web`
- **DO NOT** attempt to test login functionality without proper backend setup
- **ALWAYS** run `yarn test:core` and `yarn test:web` and `yarn test:backend` after making changes

### Building

- **CLI Tool**: `yarn cli --help` - Takes ~3 seconds. Lists all available commands.
- **Web Build**: `yarn cli build web --environment staging --clientId "test-client-id"`
- **Node Build**: `yarn cli build nodePckgs --environment staging`
- Both builds require valid environment configuration

### Linting

- `yarn prettier . --write` - Takes ~15 seconds. NEVER CANCEL.

## Validation

- Use zod for all validation
- Define return types with zod schemas
- Export types generated from schemas

## Project Structure

This is a Typescript project with a monorepo structure.

### Packages Overview

- `@compass/backend` - Express.js REST API with MongoDB, Google Calendar sync, WebSocket support
- `@compass/web` - React/TypeScript frontend with Redux, styled-components, webpack bundling
- `@compass/core` - Shared utilities, types, and business logic
- `@compass/scripts` - CLI tools for building, database operations, user management

### Key Files & Directories

```
packages/backend/src/
├── auth/           # Google OAuth integration
├── calendar/       # Google Calendar API
├── event/          # Event CRUD operations
├── sync/           # Calendar synchronization
├── user/           # User management
└── common/         # Shared backend utilities

packages/web/src/
├── views/          # React components and pages
├── store/          # Redux state management
├── common/         # Frontend utilities
└── assets/         # Images and static files

packages/core/src/
├── types/          # TypeScript type definitions
├── constants/      # Shared constants
├── util/           # Utility functions
└── mappers/        # Data transformation logic
```

## Environment Requirements

### Required for Full Development

- Node.js (version specified in package.json engines)
- Yarn package manager (lockfile format)
- Google Cloud Project with OAuth 2.0 credentials
- Supertokens account for user session management
- MongoDB database (cloud or local)

### Optional Services

- Kit.com account for email integration
- NGrok account for local tunneling

### Critical Environment Variables (backend/.env)

```bash
# Required for backend to start
BASEURL=http://localhost:3000/api
GOOGLE_CLIENT_ID=YOUR_GOOGLE_OAUTH_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_OAUTH_SECRET
SUPERTOKENS_URI=YOUR_SUPERTOKENS_INSTANCE_URL
SUPERTOKENS_KEY=YOUR_SUPERTOKENS_API_KEY
MONGO_URI=YOUR_MONGODB_CONNECTION_STRING

# Required for web development
PORT=3000
NODE_ENV=development
TZ=Etc/UTC
```

## Common Tasks & Timing

### Repository Operations

- `yarn install` - 3.5 minutes (NEVER CANCEL, set 10+ minute timeout)
- `yarn test:core` - 2 seconds (all pass)
- `yarn test:web` - 15 seconds (all pass)
- `yarn test:backend` - 15 seconds (all pass)
- `yarn dev:web` - 10 seconds to start (always works)
- `yarn cli --help` - 3 seconds (shows available commands)

### Development Workflow

1. **Start Development**: `yarn dev:web` (frontend only, always works)
2. **Run Tests**: `yarn test:core && yarn test:web` (skips problematic backend tests)
3. **Check Code Style**: `yarn prettier . --write`
4. **Manual Validation**: Open http://localhost:9080/ and verify login page loads

### CI/CD Integration

- GitHub Actions runs `yarn install` and `yarn test`
- Tests fail in CI due to MongoDB network restrictions (known limitation)
- Linting and build validation happens in CI pipeline

## Troubleshooting

### Common Issues

- **MongoDB download failures**: Use `yarn test:core` and `yarn test:web` instead of `yarn test`
- **Backend won't start**: Missing environment variables, use web-only development
- **Build timeouts**: All build operations need 10+ minute timeouts
- **Test failures**: Expected in restricted network environments

### Network Limitations

- MongoDB binary downloads blocked in some environments
- Google Fonts and external resources may be blocked
- Backend services require internet connectivity for OAuth and database

### Workarounds

- Use individual test commands instead of full test suite
- Mock external services for backend development when credentials unavailable

## Package Scripts Reference

### Root Level Commands

- `yarn cli [command]` - Access CLI tools for build, seed, delete operations
- `yarn dev:web` - Start webpack dev server
- `yarn dev:backend` - Start backend server (requires full environment)
- `yarn test` - Run all tests (fails in restricted environments)
- `yarn test:core` - Run core package tests only
- `yarn test:web` - Run web package tests only

Always prioritize frontend development with `yarn dev:web` when backend services are unavailable.

## Naming Conventions

- Use `is` prefix for boolean variables. For example, `isLoading`, `isError`, `isSuccess`
- Do not use barrel (`index.ts`) files. Use named exports instead.

## Branch Naming & Commit Message Conventions

### Semantic Branch Naming

**ALWAYS** create branches following this pattern based on the GitHub issue:

- `type/action-issue-number` (e.g., `copilot/fix-spinner`, `feature/add-form`, `bug/fix-auth`)

**Branch Type Prefixes:**

- `feature/` - New features or enhancements
- `bug/` - Bug fixes
- `hotfix/` - Critical production fixes
- `refactor/` - Code refactoring without functional changes
- `docs/` - Documentation updates

**Action Keywords:**

- `add-` - Adding new functionality
- `fix-` - Fixing bugs or issues
- `update-` - Updating existing features
- `remove-` - Removing code or features
- `refactor-` - Restructuring code

**Examples:**

- `feature/add-form` - Adding a form
- `bug/fix-auth` - Fixing authentication issue

### Semantic Commit Messages

**ALWAYS**:

- use conventional commit format: `type(scope): description`
- use lower-case for the commit message

**Commit Types:**

- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Code style changes (formatting, semicolons, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks, dependency updates

**Scope Examples:**

- `web` - Frontend/React changes
- `backend` - Server/API changes
- `core` - Shared utilities/types
- `scripts` - CLI tools and build scripts
- `config` - Configuration files

**Message Format Rules:**

- Use present tense: "add feature" not "added feature"
- Keep description under 72 characters
- Include issue number when applicable
- Be specific and descriptive

**Examples:**

- `feat(web): add calendar event creation modal`
- `fix(backend): resolve authentication timeout issue`
- `docs(readme): update installation instructions`
- `refactor(core): simplify date utility functions`
- `test(web): add unit tests for login component`

### Pre-commit Validation

The repository includes Husky hooks that will:

- Run `yarn lint-staged` on pre-commit (formats code with Prettier)
- Run `yarn prettier . --write` on pre-push (ensures consistent formatting)

**ALWAYS** ensure your commits pass these checks before pushing.
