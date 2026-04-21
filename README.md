# Compass Calendar

**A daily planner for minimalists.**

All your tasks and events in one place. Organize your day, stay on track, and focus.

## Why Use Compass?

It'll help you focus and ship faster:

- **Plan faster**: Organize your Month → Week → Day → Now in minutes.
- **Keyboard-first**: Shortcuts and command palette for lightning-fast navigation.
- **Private & Offline**: Runs fully local in your browser, with optional Google Calendar sync.
- **No bloat**: No AI — just a clean, minimal interface to help you get things done.

Join thousands of minimalists who are staying organized and productive with Compass.

https://github.com/user-attachments/assets/ba7b91b9-1984-49f2-afc6-7fcda1100b31

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
- No sharing, locations, reminders, or mobile app

We're actively working on improvements – check out our [roadmap](https://github.com/orgs/SwitchbackTech/projects/4).

## Tech Stack

- **Frontend**: React, Redux, Tailwind CSS, TypeScript, Bun
- **Backend**: Node.js, Express, TypeScript, MongoDB
- **Integrations**: Google Calendar API, Google OAuth2, Socket.io
- **Testing**: Bun, React Testing Library, Playwright

## Getting Started

### Try It Online

Head over to [app.compasscalendar.com](https://app.compasscalendar.com?utm_source=github&utm_medium=referral&utm_campaign=readme). No signup required

### Self-host Compass

Run Compass on your own machine and keep your calendar data on your own infrastructure.

See [docs/self-hosting.md](./docs/self-hosting.md) for the manual self-hosting guide. A one-command installer is planned, but not available yet.

### Run Locally

Want to poke around as a developer?

[Read the technical docs](https://github.com/SwitchbackTech/compass/tree/main/docs): All the info you'd need to get started, including guides on how to install, test, build, deploy, and contribute.

### Development Workflow

```bash
# Quick start
bun install
cp packages/backend/.env.local.example packages/backend/.env.local
bun run dev:web  # Frontend on http://localhost:9080
bun run dev:backend # Backend on http://localhost:3000

# Testing
bun run test:core && bun run test:web && bun run test:backend
bun run test:e2e

# Type checking and linting
bun run type-check
bun run lint
```

## Contributing

We love contributions! Whether it's bug fixes, new features, or documentation improvements, your help makes Compass better for everyone.

Issues: Check open issues or create a new one.
Pull Requests: Fork the repo, make your changes, and submit a PR. Follow our [Contribution Guidelines](https://docs.compasscalendar.com/docs/contribute).
Discussions: Join the conversation on GitHub Discussions.

First-time contributors? Look for issues labeled `good first issue.`

## Community & Resources

- **Handbook**: [compasscalendar.notion.site](https://alpaca-ty.notion.site/Compass-Handbook-26b237bde8f4805c9a56de6db3a7993d?utm_source=github&utm_medium=referral&utm_campaign=readme)
- **Twitter**: [@CompassCalendar](https://x.com/CompassCalendar)
- **Youtube**: [Playlist](https://youtube.com/playlist?list=PLPQAVocXPdjmYaPM9MXzplcwgoXZ_yPiJ&si=jssXj_g9kln8Iz_w)
- **LinkedIn**: [Compass Calendar](https://www.linkedin.com/company/compass-calendar)

Star the repo for good luck.
