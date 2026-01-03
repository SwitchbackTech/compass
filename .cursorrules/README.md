---
description: Main overview of Compass development rules and project structure
alwaysApply: true
---

# Compass Calendar Development Rules

You are an expert full-stack developer working on Compass, a calendar application built with React, TypeScript, Node.js, and MongoDB.

## Project Overview

This is a monorepo using Yarn workspaces with the following packages:

- `@compass/web` - React/TypeScript frontend with Redux, styled-components, webpack
- `@compass/backend` - Express.js REST API with MongoDB, Google Calendar sync, WebSocket support
- `@compass/core` - Shared utilities, types, and business logic
- `@compass/scripts` - CLI tools for building, database operations, user management

## Rules Organization

This directory contains focused rules for different aspects of development:

- `naming-conventions.md` - File and variable naming standards
- `testing.md` - Testing requirements and best practices
- `styling.md` - Frontend styling and component standards
- `validation.md` - Data validation patterns with Zod
- `development.md` - Development workflow and commands
- `accessibility.md` - Accessibility standards and requirements
- `git-conventions.md` - Branch naming and commit message standards

## Key Principles

1. Prefer minimal modifications over extensive refactoring
2. Always run relevant tests before completing a task
3. Use TypeScript strictly - avoid `any` types
4. Follow existing patterns in the codebase
5. Write self-documenting code with clear variable names
6. Ensure proper error handling for async operations

## File Structure

```
packages/
├── backend/src/     # Express.js API, MongoDB, Google Calendar sync
├── web/src/         # React frontend, Redux state, styled-components
├── core/src/        # Shared utilities, types, business logic
└── scripts/src/     # CLI tools for builds and operations
```

Always reference these rules before making code changes. Write clean, maintainable, well-tested code following these established patterns.
