# Compass Calendar

A simple app that helps you manage your time.

## Why Try Compass?

It'll help you get things done:

- **Plan faster**: Organize your Month → Week → Day in minutes.
- **Keyboard-first**: Shortcuts and command palette for lightning-fast planning.
- **No bloat**: A clean UI that does a few things well.

It'll be around for the long-term:

- **Bootstrapped**: VC-backed teams think in terms of months and funding rounds. We think in terms of decades and profit. We don't need to make $1B in 5 years or impress investors. As long as we keep users like you happy, we'll be fine.
- **Vision**: We have [an ambitious vision](https://alpaca-ty.notion.site/about-us) and a practical roadmap that'll keep us busy for a long time.

## Features

### The Unique Stuff

- **Day Mode**: See your tasks and events side-by-side
- **Someday Lists**: Organize future tasks without cluttering your schedule
- **One-Click Adjustments**: Move events forwards or back effortlessly

### The Essentials

- Recurring events
- Command palette
- Event tagging, resizing, duplicating, reordering
- Drag & drop
- Google Calendar sync
- User sessions

### The Limitations

Things we don't support (yet):

- Subcalendar sync (only primary calendar)
- Sharing, reminders, locations
- Mobile app

## Tech Stack

- **Frontend**: React, Zustand, TanStack, Tailwind
- **Backend**: Node, Express, MongoDB
- **Integrations**: Google Calendar API, Google OAuth2
- **Testing**: Bun, React Testing Library, Playwright

## Getting Started

### Option 1: Try Compass Online

[compasscalendar.com](https://www.compasscalendar.com?utm_source=github&utm_medium=referral&utm_campaign=readme) ← No signup required.

### Option 2: Run Compass Locally

```bash
# Quick start
bun install
cp compass.example.yaml compass.yaml # then replace the placeholder values
bun run dev:web      # Frontend on http://localhost:9080
bun run dev:backend  # Backend on http://localhost:3000

# Testing
bun run test:core && bun run test:web && bun run test:backend
bun run test:e2e
```

### Option 3: Self-host Compass

Run Compass on a server you control to keep everything on your infrastructure.

See [the self-hosting guide](./docs/self-hosting/README.md) for instructions.

## Resources

- **Docsite**: [docs.compasscalendar.com](https://docs.compasscalendar.com/docs)
- **Changelog**: [compasscalendar.com](https://changelog.compasscalendar.com)
- **Handbook**: [notion.site](https://alpaca-ty.notion.site/Compass-Handbook-26b237bde8f4805c9a56de6db3a7993d?utm_source=github&utm_medium=referral&utm_campaign=readme)
- **Twitter**: [@CompassCalendar](https://x.com/CompassCalendar)
- **LinkedIn**: [Compass Calendar](https://www.linkedin.com/company/compass-calendar)
