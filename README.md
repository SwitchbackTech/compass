# 🧭 Compass Calendar

**A minimalist task manager designed for engineers.**

All your tasks and events in one place. Organize your day, stay on track, and ship more code.

## Why Use Compass?

It'll help you focus and ship faster:

- **Plan faster**: Organize your Month → Week → Day → Now in minutes.
- **Keyboard-first**: Shortcuts and command palette for lightning-fast navigation.
- **Private & Offline**: Runs fully local in your browser, with optional Google Calendar sync.
- **No bloat**: No AI — just a clean, minimal interface to help you get things done.

Join thousands of engineers who are staying organized and productive with Compass.

https://github.com/user-attachments/assets/ba7b91b9-1984-49f2-afc6-7fcda1100b31

---

## Features

### The Unique Stuff

- **Day Mode**: See your tasks and events side-by-side
- **Now Mode**: Lock-in on a single task
- **Custom Note**: Display a personal note-to-self for motivation or reminders
- **Someday/Maybe List**: Organize future tasks without cluttering your schedule
- **One-Click Adjustments**: Move events forwards or back effortlessly

### The Essentials

- Recurring events
- Command palette
- Event tagging, resizing, duplicating, reordering
- Drag & drop
- 2-way sync with Google Calendar (hosted or local via Ngrok)
- Google OAuth authentication
- User session management with Supertokens
- Email capture via Kit

### Current Limitations

- Only supports primary Google Calendar (no sub-calendars)
- No sharing, locations, reminders, or mobile app (yet!)

We're actively working on improvements – check out our [roadmap](https://github.com/orgs/SwitchbackTech/projects/4).

## Getting Started

### Try It Online

Head over to [app.compasscalendar.com](https://app.compasscalendar.com?utm_source=github&utm_medium=referral&utm_campaign=readme)

No signup required — start planning instantly!

### Run Locally

Want to poke around or run it self-hosted?

[Read the technical docs](https://docs.compasscalendar.com?utm_source=github&utm_medium=referral&utm_campaign=readme): All the info you'd need to get started, including guides on how to install, test, build, deploy, and contribute.

## Tech Stack

- **Frontend**: React, Redux, Tailwind CSS, TypeScript, Webpack
- **Backend**: Node.js, Express, TypeScript, MongoDB
- **Integrations**: Google Calendar API, Google OAuth2, Socket.io
- **Testing**: Jest, React Testing Library
- **Other**: Yarn workspaces for monorepo management

## For AI Agents

Compass is designed to be AI-friendly with comprehensive tooling and documentation for automated development.

### Quick Reference for AI Agents

- **Primary Guide**: See [AGENTS.md](./AGENTS.md) for complete development instructions
- **Architecture**: Monorepo with 4 packages: `@compass/web` (React frontend), `@compass/backend` (Express API), `@compass/core` (shared utilities), `@compass/scripts` (CLI tools)
- **API Boundaries**: All backend routes in `packages/backend/src/*/routes.config.ts`, authenticated via Supertokens sessions
- **State Management**: Redux store in `packages/web/src/store/`, organized by domain (calendar, draft, schema, settings, sidebar, task, view)
- **Type System**: Zod schemas for validation, TypeScript for type safety - see `packages/core/src/types/`
- **Module Aliases**: Use `@compass/*`, `@web/*`, `@core/*` instead of relative paths
- **Testing**: Unit tests with Jest, E2E with Playwright - test commands: `yarn test:core`, `yarn test:web`, `yarn test:backend`
- **AI Tools**: See `ai-tools/` directory for endpoint docs, type extraction, code health audits, and workflow harnesses

### Key Entry Points

- **Backend API**: `packages/backend/src/app.ts` - Express server initialization
- **Frontend**: `packages/web/src/index.tsx` - React app entry point
- **Routing**: Backend routes in `*routes.config.ts`, frontend routes in `packages/web/src/views/Root.tsx`
- **Database**: MongoDB models in `packages/backend/src/*/dao/*.dao.ts`
- **Sync Logic**: Calendar sync in `packages/backend/src/sync/`

### Development Workflow

```bash
# Quick start
yarn install --frozen-lockfile --network-timeout 300000
cp packages/backend/.env.local.example packages/backend/.env
yarn dev:web  # Frontend on http://localhost:9080

# Testing
yarn test:core && yarn test:web && yarn test:backend

# Type checking and linting
yarn type-check
yarn prettier . --write

# AI tooling
yarn ai:index          # Semantic code search
yarn docs:generate     # Generate API docs
yarn audit:code-health # Code quality metrics
```

### AI-Specific Guidelines

1. **Read First**: Always check `AGENTS.md` and `CONTRIBUTING.md` before making changes
2. **Module Aliases**: Use aliased imports (`@compass/*`, `@web/*`) not relative paths
3. **Validation**: Use Zod schemas for all new types and validation
4. **Testing**: Write tests using Testing Library patterns (semantic queries, user interactions)
5. **Commits**: Follow semantic commit format: `type(scope): description`
6. **Safety**: Run `yarn audit:code-health` before submitting PRs

## Contributing

We love contributions! Whether it's bug fixes, new features, or documentation improvements, your help makes Compass better for everyone.

Issues: Check open issues or create a new one.
Pull Requests: Fork the repo, make your changes, and submit a PR. Follow our [Contribution Guidelines](https://docs.compasscalendar.com/docs/contribute).
Discussions: Join the conversation on GitHub Discussions.

First-time contributors? Look for issues labeled "good first issue"!

## Community & Resources

- **Handbook**: [compasscalendar.notion.site](https://compasscalendar.notion.site/Compass-Handbook-26b237bde8f4805c9a56de6db3a7993d/?utm_source=github&utm_medium=referral&utm_campaign=readme)
- **Twitter**: [@CompassCalendar](https://x.com/CompassCalendar)
- **Youtube**: [Playlist](https://youtube.com/playlist?list=PLPQAVocXPdjmYaPM9MXzplcwgoXZ_yPiJ&si=jssXj_g9kln8Iz_w)
- **LinkedIn**: [Compass Calendar](https://www.linkedin.com/company/compass-calendar)

Star the repo for good luck.
