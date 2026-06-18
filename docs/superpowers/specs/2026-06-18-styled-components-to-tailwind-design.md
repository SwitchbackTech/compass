# Styled Components to Tailwind Migration Design

## Objective

Replace every Compass web use of `styled-components` with Tailwind CSS v4 while preserving the current visual design, interaction behavior, accessibility, and responsive layout. The finished repository must not depend on, configure, import, document, or test through `styled-components`.

The migration must also leave theme-dependent styling behind semantic CSS custom properties so a future light theme can change token values without rewriting component classes.

## Current State

The web package currently combines two styling systems:

- Tailwind v4 utilities and semantic tokens in `packages/web/src/index.css`
- `styled-components` across 60 source and test files, including shared primitives, forms, date pickers, menus, loaders, icons, Planner Sidebar surfaces, calendar grids, Week view, provider setup, and tests

`packages/web/src/common/styles/theme.ts` is also used directly by non-styled TypeScript code for calculated colors, third-party component style objects, interaction overlays, and geometry constants. Removing the React theme provider does not require removing this plain TypeScript token adapter in the same step.

## Chosen Approach

Use a hybrid Tailwind architecture:

1. Put one-off layout and state styling directly in JSX as Tailwind utilities.
2. Define stable reusable component recipes as `c-*` utilities in `packages/web/src/index.css`.
3. Use nested selectors inside `c-*` utilities for third-party DOM that Compass does not render directly, such as `react-datepicker` internals.
4. Pass runtime-only values through typed inline CSS custom properties, then consume them from static Tailwind classes or `c-*` utilities.
5. Keep all theme-dependent values behind semantic CSS custom properties.

This avoids replacing `styled-components` with a large global component stylesheet while also avoiding unreadable repeated class strings for complex widgets.

## Class Naming Rules

Use `c-*` only for named, reusable Compass component recipes or complex selector scopes. Examples include `c-date-picker`, `c-context-menu-item`, and the existing `c-focus-ring`.

Use regular Tailwind utilities for local layout, spacing, typography, and state. Do not prefix every Tailwind utility with `c-`; the prefix identifies Compass-owned abstractions rather than Tailwind itself.

When a recipe has variants, prefer data attributes or CSS custom properties over generating class names dynamically. All class names must remain statically discoverable by Tailwind unless explicitly safelisted.

## Theme Architecture

`packages/web/src/index.css` remains the CSS source of truth for visual tokens. Components use semantic utilities such as `bg-bg-primary`, `text-text-light`, and `border-grid-line-primary`, never raw palette colors when a semantic token exists.

The default dark token values remain unchanged. Token declarations will be structured so a future selector such as `[data-theme="light"]` can override the same custom properties. Adding a light theme or theme switcher is outside this migration.

Runtime event colors, measured positions, visible-date counts, and similar values cannot be represented by a finite semantic palette. Components will expose those values as custom properties such as `--event-color` or `--visible-date-count`; static classes will reference the custom properties.

`theme.ts` may remain as a plain typed object while non-CSS algorithms and third-party style APIs require JavaScript values. It must no longer import or implement `DefaultTheme`, and React must no longer require `ThemeProvider`. A later project may consolidate remaining JavaScript consumers onto exported token constants, but that is not required to remove `styled-components`.

## Component Migration Strategy

Migrate in dependency order:

1. Shared primitives and icons: `Flex`, `Text`, `Input`, `Textarea`, `Button`, `IconButton`, `Divider`, `Focusable`, spinners, and icon wrappers.
2. Shared composite UI: context menus, loaders, date picker, and Not Found.
3. Forms: event form, recurrence controls, time/date controls, actions menu, and Someday form.
4. Planner Sidebar surfaces, including month picker and Someday event rows.
5. Shared calendar grid and Week view surfaces, including all-day rows, timed grids, headers, reminders, and edge indicators.
6. Provider and test cleanup after no rendered component depends on the styled theme context.

Keep existing public component props when they express behavior. Styling-only props should become local class decisions, data attributes, or CSS custom properties. Avoid new barrel files. React components remain in their own files where a wrapper has behavior or a reusable API; trivial styled wrappers should collapse into their call site.

## Fidelity Requirements

The migration is not a redesign. Preserve:

- element semantics and accessible names
- keyboard focus behavior and focus appearance
- hover, active, disabled, pending, selected, and drag states
- widths, heights, spacing, typography, borders, shadows, gradients, and stacking
- animation timing and reduced-motion behavior
- responsive and container-query behavior
- calendar event positioning, clipping, scrolling, and interaction hit areas
- third-party widget appearance and portal behavior

Equivalent generated CSS is acceptable; DOM changes are acceptable only when they preserve semantics, event propagation, focus management, measurement, and layout.

## Testing Strategy

Use existing behavior tests as characterization coverage and add focused regression tests before changing styling behavior that is not currently protected. Tests should assert user-observable behavior, semantic state, or computed style through the existing Tailwind test stylesheet rather than coupling broadly to full class strings.

For each migration slice:

1. Run the smallest relevant web tests before changing the slice.
2. Add a failing characterization or regression test where a dynamic visual state lacks coverage.
3. Migrate the slice.
4. Run its focused tests and type checking.

At the end, add or retain a repository guard that detects `styled-components` imports, manifest dependencies, Babel configuration, and obsolete documentation references. Then run:

- `bun run test`
- `bun run test:e2e`
- `bun type-check`
- `bun lint`
- React Doctor on the changed React files
- `bun build:web`
- `bun build:backend`

The full test commands may require local port access for MongoDB Memory Server and Playwright. Existing unrelated local worktrees must not be deleted; Jest discovery must instead be run in a way that excludes them or with those worktrees moved outside the repository by their owner.

## Dependency and Configuration Removal

After all runtime and test imports are gone:

- remove `ThemeProvider` from `CompassProvider` and test wrappers
- remove `packages/web/src/common/styles/default-theme.d.ts`
- remove the styled-components Babel plugin configuration
- uninstall `styled-components` and `@types/styled-components`
- remove `babel-plugin-styled-components` if it is no longer a transitive or direct requirement
- regenerate `bun.lock` through Bun rather than editing lockfile entries manually
- verify a repository-wide search has no project-owned styled-components references

## Documentation Changes

Update project-owned documentation and agent guidance, including `CONTEXT.md`, `docs/Frontend/frontend-runtime-flow.md`, and `.cursorrules`, to describe Tailwind v4 as the web styling system. Document:

- semantic theme tokens in `packages/web/src/index.css`
- when to create a `c-*` utility
- when to use local Tailwind utilities
- how runtime CSS custom properties are used
- the prohibition on raw colors when semantic tokens exist

Vendored skill reference material that discusses CSS-in-JS generically is not Compass product documentation and is outside this migration.

## Completion Criteria

The migration is complete only when all of the following are proven from the current worktree:

- no Compass runtime or test code imports `styled-components`
- no Compass manifest or build configuration depends on it
- project-owned documentation no longer describes or recommends it
- migrated UI behavior and visual states remain covered and pass
- full unit/package tests and Playwright e2e tests pass locally
- type checking, lint, React Doctor, web build, and backend build pass
- semantic CSS variables cover theme-dependent values, allowing future theme overrides without component rewrites
