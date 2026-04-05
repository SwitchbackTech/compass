# Coding Conventions

Use [AGENTS.md](../../AGENTS.md) as the normative source for repo-wide coding rules, branch naming, commit format, testing defaults, and workflow expectations.

This document keeps only the local conventions that are useful to repeat inside `docs/`.

## Commits And PRs

- Use conventional commits in lower-case.
- Do not use emoji prefixes in commit messages.
- Keep branch naming and commit formatting aligned with `AGENTS.md`.

## Comments

- Do not use code comments as task tracking. Open an issue instead.
- Prefer self-explanatory code and tests over explanatory comments.
- Add comments only when they explain non-obvious behavior, constraints, or cross-file coupling.
- If a flow needs more than a short code comment, prefer a repo doc and link to it.

## Frontend: one component per file

- Put each React component in its own file. Do not define multiple components in the same module (for example, a screen-level component plus a small presentational subcomponent used only there).
- **Example:** If `DatePicker` uses a `MonthNavButton`, use `DatePicker.tsx` and `MonthNavButton.tsx` (typically in the same directory), instead of defining both in `DatePicker.tsx`.

## Cleanup

- Do not add dead code, speculative scaffolding, or half-implemented branches.
- If you find unused code that is clearly unrelated to your main change, remove it separately when practical.
- Leave touched code a little clearer than you found it: simpler control flow, better naming, or better tests.

## Dependencies And Package Scope

- Add runtime libraries to `dependencies` when they are imported by shipped app code (for example modules under `packages/web/src`, `packages/backend/src`, or `packages/core/src`).
- Add build/test/tooling libraries to `devDependencies` when they are only imported by build configs or test/tooling code (for example `webpack.config.mjs`, Jest/Babel/ESLint config, or CLI-only build helpers).
- Keep root `package.json` runtime dependencies minimal. Node package builds run `bun install --production --frozen-lockfile` in `build/node`, so runtime packages placed only in `devDependencies` will be missing from production artifacts.
- In `packages/web/package.json`, webpack loaders and plugins (for example `@svgr/webpack`, `css-loader`, `style-loader`, `html-webpack-plugin`, `mini-css-extract-plugin`) are build-time dependencies and should stay in `devDependencies`.
- After editing any manifest, run `bun install` from repo root to keep `bun.lock` in sync.

## Shared Contracts

- Prefer shared Zod-backed contracts in `packages/core` when web and backend both depend on them.
- Use module aliases instead of deep relative imports.
- Follow the established pattern of the area you are editing instead of forcing large stylistic migrations during unrelated work.
