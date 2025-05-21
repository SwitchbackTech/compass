# AGENTS

## Project Overview

### Project Structure

Repo type: monorepo with Yarn workspaces, where each `packages/*` directory is an independent package.

## Conventions

Follow the conventions explained on this page: <https://docs.compasscalendar.com/docs/contribute/convention-guide>

## Setup

- Use Node LTS
- Use Yarn for package management
- Install all dependencies: `yarn`

## Testing

- Run the full test suite before submitting a PR. The command is `yarn test`.
- New tests should be co-located next to the code they are testing (not in a separate `tests` directory)
