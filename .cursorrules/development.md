---
description: Development workflow - setup commands, dev servers, testing, formatting, and environment requirements
alwaysApply: false
---

# Development Workflow

This rule defines development commands, setup, and workflow for the Compass codebase.

## Initial Setup

### Install Dependencies

```bash
yarn install --frozen-lockfile --network-timeout 300000
```

- Takes ~3.5 minutes
- NEVER CANCEL the installation
- Set timeout to 10+ minutes

### Environment Configuration

```bash
cp packages/backend/.env.local.example packages/backend/.env
```

Edit `packages/backend/.env` with your credentials.

## Development Servers

### Web (Recommended for Frontend Work)

```bash
yarn dev:web
```

- Starts on http://localhost:9080/
- Takes ~10 seconds to start
- Frontend works standalone without backend services

### Backend (Requires Full Setup)

```bash
yarn dev:backend
```

- Requires Google OAuth credentials
- Requires Supertokens account
- Requires MongoDB connection
- See environment requirements below

## Common Commands

### Testing

```bash
yarn test:core      # Run core tests (~2 seconds)
yarn test:web       # Run web tests (~15 seconds)
yarn test:backend   # Run backend tests (~15 seconds)
```

### Code Formatting

```bash
yarn prettier . --write  # Format all code (~15 seconds)
```

### CLI Tools

```bash
yarn cli --help     # Shows all available CLI commands
```

## Environment Requirements

### Required Environment Variables (backend/.env)

```bash
BASEURL=http://localhost:3000/api
GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
GOOGLE_CLIENT_SECRET=your_google_oauth_secret_here
SUPERTOKENS_URI=your_supertokens_instance_url_here
SUPERTOKENS_KEY=your_supertokens_api_key_here
MONGO_URI=your_mongodb_connection_string_here
PORT=3000
NODE_ENV=development
TZ=Etc/UTC
```

### External Services

The backend requires:

- Google Cloud Project with OAuth 2.0 credentials
- Supertokens account for user session management
- MongoDB database (cloud or local)

## Pre-commit Hooks

The repository includes Husky hooks that automatically:

- Run `yarn lint-staged` on pre-commit (formats code with Prettier)
- Run `yarn prettier . --write` on pre-push (ensures consistent formatting)

Your commits will pass these checks automatically.

## Important Notes

- The backend requires external service credentials to run
- Frontend works standalone without backend services
- Always use UTC timezone for consistency (`TZ=Etc/UTC`)
- ESLint and Prettier configurations are already set up
- The project uses React 18+ with the new JSX transform

## File Structure

```
packages/
├── backend/src/
│   ├── auth/           # Google OAuth integration
│   ├── calendar/       # Google Calendar API
│   ├── event/          # Event CRUD operations
│   ├── sync/           # Calendar synchronization
│   ├── user/           # User management
│   └── common/         # Shared backend utilities
├── web/src/
│   ├── views/          # React components and pages
│   ├── store/          # Redux state management
│   ├── common/         # Frontend utilities
│   └── assets/         # Images and static files
├── core/src/
│   ├── types/          # TypeScript type definitions
│   ├── constants/      # Shared constants
│   ├── util/           # Utility functions
│   └── mappers/        # Data transformation logic
└── scripts/src/        # CLI tools
```

## Summary

- Install with `yarn install --frozen-lockfile --network-timeout 300000`
- Start frontend: `yarn dev:web` (recommended)
- Run tests: `yarn test:web`, `yarn test:backend`, `yarn test:core`
- Format code: `yarn prettier . --write`
- Pre-commit hooks run automatically
