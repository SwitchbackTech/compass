# Compass Calendar Development Instructions

Primary instructions for AI agents and developers in the Compass monorepo.

## Quick Start

1. `yarn install --immutable` (Do not cancel; `httpTimeout` is set in `.yarnrc.yml`)
2. `cp packages/backend/.env.local.example packages/backend/.env.local`
3. `yarn dev:web` (frontend on http://localhost:9080/)

## Table of Contents

- [Compass Calendar Development Instructions](#compass-calendar-development-instructions)
  - [Quick Start](#quick-start)
  - [Table of Contents](#table-of-contents)
  - [Principles](#principles)
  - [Module Aliases](#module-aliases)
  - [Working Effectively](#working-effectively)
    - [Initial Setup](#initial-setup)
    - [Development Servers](#development-servers)
    - [Testing](#testing)
      - [Writing Tests in `@compass/web`](#writing-tests-in-compassweb)
      - [Running Tests](#running-tests)
    - [Building](#building)
    - [Linting](#linting)
  - [Validation](#validation)
  - [Project Structure](#project-structure)
    - [Packages Overview](#packages-overview)
    - [Documentation](#documentation)
    - [Key Files \& Directories](#key-files--directories)
  - [Common Tasks \& Timing](#common-tasks--timing)
    - [Repository Operations](#repository-operations)
    - [Development Workflow](#development-workflow)
  - [Cursor Cloud specific instructions](#cursor-cloud-specific-instructions)
    - [Styling](#styling)
    - [CI/CD Integration](#cicd-integration)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Network Limitations](#network-limitations)
    - [Workarounds](#workarounds)
  - [Package Scripts Reference](#package-scripts-reference)
    - [Root Level Commands](#root-level-commands)
  - [Naming Conventions](#naming-conventions)
  - [Branch Naming \& Commit Message Conventions](#branch-naming--commit-message-conventions)
    - [Semantic Branch Naming](#semantic-branch-naming)
    - [Semantic Commit Messages](#semantic-commit-messages)
    - [Pre-commit Validation](#pre-commit-validation)

## Principles

1. **Simplicity**. Prefer the simplest solution to a problem over the more complex solutions.
2. **Avoid Dependencies**. Prefer built-ins and stable, minimal dependencies. This project will be around for decades, so we want to avoid dependencies that will become obsolete.

## Module Aliases

Use these aliases instead of relative paths:

- **Backend, scripts, core** (see root `package.json` `_moduleAliases`):
  - `@compass/backend` → `packages/backend/src`
  - `@compass/core` → `packages/core/src`
  - `@compass/scripts` → `packages/scripts/src`
- **Web** (see `packages/web/tsconfig.json` paths):
  - `@web/*` → `packages/web/src/*`
  - `@core/*` → `packages/core/src/*`

Example: `import { foo } from '@compass/core'` not `import { foo } from '../../../core'`

## Working Effectively

### Initial Setup

- Install dependencies: `yarn install --immutable` (`httpTimeout` is set in `.yarnrc.yml`)
  - Takes ~3.5 minutes. Set timeout to 10+ minutes.
- Copy environment template: `cp packages/backend/.env.local.example packages/backend/.env.local`

### Development Servers

- **Web Development**:
  - yarn dev:web - Takes ~10 seconds to build. Serves on http://localhost:9080/
  - Frontend works standalone without backend services
- **Backend Development**:
  - `yarn dev:backend` - Fails without proper .env.local configuration

### Testing

Run `yarn test:core`, `yarn test:web`, and `yarn test:backend` after making changes. Use `yarn test:scripts` for scripts package tests. Avoid `yarn test` (full suite) in restricted network environments—MongoDB binary download may fail.

#### Writing Tests in `@compass/web`

- Write tests the way a user would use the application by using the DOM and user interactions with `@testing-library/user-event` rather than internal implementation details of React components.
- Do NOT use `data-` attributes or CSS selectors to locate elements. Use semantic locators and roles instead.
- When writing tests, avoid mocking as much as possible.
- Where mocking is inevitable, use spies to sub out specific module functions before attempting to mock the whole module.
- **DO NOT** attempt to test login functionality without proper backend setup.

#### Running Tests

- **Core tests**: `yarn test:core`
- **Web tests**: `yarn test:web`
- **Backend tests**: `yarn test:backend`
- **Scripts tests**: `yarn test:scripts`
- **Full test suite**: `yarn test`

### Building

- **Web Build**: `yarn cli build web --environment staging --clientId "test-client-id"`
- **Node Build**: `yarn cli build nodePckgs --environment staging`

### Linting

- Run `./node_modules/.bin/eslint <changed app files>` before finishing. Treat eslint as required validation for changed implementation files, not an optional follow-up.
- `yarn prettier . --write`

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

### Documentation

Additional documentation lives in the `docs/` directory (e.g. API docs, workflow examples). Update these documents as you make changes when relevant.

### Key Files & Directories

```text
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

## Common Tasks & Timing

### Repository Operations

- `yarn install` - 3.5 minutes
- `yarn test:core` - ~2 seconds (all pass)
- `yarn test:web` - ~15 seconds (all pass)
- `yarn test:backend` - ~15 seconds (all pass)
- `yarn test:scripts` - scripts package tests
- `yarn dev:web` - ~10 seconds to start
- `yarn cli --help` - ~3 seconds (shows available commands)

### Development Workflow

1. **Start Development**: `yarn dev:web` (frontend only, always works)
2. **Run Tests**: `yarn test:core && yarn test:web` (add `&& yarn test:backend` when credentials available)
3. **Run Eslint On Changed Implementation Files**: `./node_modules/.bin/eslint <changed app files>`
4. **Check Code Style**: `yarn prettier . --write`
5. **Manual Validation**: Open <http://localhost:9080/> and verify login page loads

## Cursor Cloud specific instructions

- Prefer running scoped checks for changed areas: `yarn test:core`, `yarn test:web`, `yarn test:backend`, or `yarn test:scripts` as applicable.
- Run `./node_modules/.bin/eslint <changed app files>` before handing off work.
- Do not run `yarn test` in restricted environments unless explicitly required.
- For UI-affecting changes in `packages/web`, validate with `yarn dev:web` and confirm behavior in the web dev server.
- If backend work is required, ensure `packages/backend/.env.local` exists by copying `packages/backend/.env.local.example`.
- Keep test runs reproducible by recording exact commands and outcomes in your handoff notes.

### Styling

- Use tailwind for styling.
- Use the semantic colors defined in `packages/web/src/index.css` using the `@theme` directive.
- Do NOT use raw tailwind colors like `bg-blue-300` or `text-gray-100`. Use the semantic colors like `bg-bg-primary` or `text-text-light` instead.

### CI/CD Integration

- GitHub Actions unit tests run in `.github/workflows/test-unit.yml` as a matrix (`core`, `web`, `backend`, `scripts`) using `yarn test <project>` on `push`.
- End-to-end tests run separately in `.github/workflows/test-e2e.yml` on pull requests to `main`.

## Troubleshooting

### Common Issues

- **Test failures**: Run `yarn test:core`, `yarn test:web`, `yarn test:backend`, and `yarn test:scripts` individually to narrow the scope of the failure
- **Backend won't start**: Missing environment variables in `packages/backend/.env.local`, use web-only development (`yarn dev:web`)
- Environment: Copy from `packages/backend/.env.local.example` to `packages/backend/.env.local` (there is no `.env.example`).
- Webpack dev server warns about a missing `.env.local` file; this is harmless—it falls back to `process.env`.
- Husky pre-push hook runs `yarn prettier . --write`, which can modify files. Ensure working tree is clean or committed before pushing.

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
- `yarn test:backend` - Run backend package tests only
- `yarn test:scripts` - Run scripts package tests only

## Naming Conventions

- Use `is` prefix for boolean variables. For example, `isLoading`, `isError`, `isSuccess`
- Do not use barrel (`index.ts`) files. Use named exports instead.
- When creating constants, use uppercase and underscores. Example: `SIGNIN_INCREMENTAL`
- When adding a new function to an existing file, order the function alphabetically.

## Branch Naming & Commit Message Conventions

### Semantic Branch Naming

**ALWAYS** create branches following this pattern:

- `type/action[-issue-number]` (e.g., `feature/add-form`, `bug/fix-auth`, `bug/fix-auth-123`)

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
