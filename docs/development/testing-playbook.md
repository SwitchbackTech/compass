# Testing Playbook

Use the smallest test surface that can fail for the change you are making, then widen only if the change crosses boundaries.

## Main Commands

From repo root:

```bash
bun run test:core
bun run test:web
bun run test:backend
bun run test:scripts
bun run type-check
```

Avoid defaulting to `bun run test` unless you really need the full suite.

## CI Unit Test Workflow

Source of truth:

- `.github/workflows/test-unit.yml`
- `.github/workflows/test-e2e.yml`

Unit workflow (`test-unit.yml`):

- triggers on `push`
- runs a matrix across `core`, `web`, `backend`, and `scripts`
- uses `fail-fast: false`, so one failing lane does not cancel the others
- runs `bun run test:<project>` in each lane after dependency install
- runs every lane with `TZ: Etc/UTC` set

Local parity commands:

```bash
bun run test:core
bun run test:web
bun run test:backend
bun run test:scripts
```

E2E workflow (`test-e2e.yml`) is separate and runs on pull requests to `main` via `bun run test:e2e`.

## Current Test Strategy

- `bun run test:core` uses `bun test` with a small compatibility preload for the core BSON mock setup.
- `bun run test:web` runs `bun test --cwd packages/web` directly. Web tests should be isolated enough to run in one Bun process without batching.
- `bun run test:backend` and `bun run test:scripts` intentionally retain the existing Jest harness while their hoist-heavy module-mocking patterns are migrated.

## Retained Jest Layout

Source:

- `jest.config.js`

Projects:

- `core`
- `web`
- `backend`
- `scripts`

Each project has its own setup files and module alias mapping.

## What To Run By Change Type

### Shared type or schema change

Run:

```bash
bun run test:core && bun run test:web && bun run test:backend
bun run type-check
```

### Web-only UI or behavior change

Run:

```bash
bun run test:web
```

Add `bun run test:core` if the change touched shared utilities.

### Backend route or service change

Run:

```bash
bun run test:backend
```

Add `bun run test:core` if a shared type or mapper changed.

### CLI or migration change

Run:

```bash
bun run test:scripts
```

## Web Test Style

Preferred style:

- React Testing Library
- semantic queries by role/name/text
- `user-event` for real interactions

Avoid:

- CSS selectors
- implementation-detail assertions
- unnecessary module-wide mocks

Isolation rules:

- Do not use top-level `mock.module` for shared production modules unless the test imports the subject through a local factory and the mock cannot affect later files. Prefer provider wrappers, real stores, explicit dependency factories, or `spyOn` with teardown.
- Avoid mocking shared UI primitives such as `TooltipWrapper`, `@floating-ui/react`, or session hooks in broad component tests. A mock that only helps one file can change unrelated tests later in the same Bun process.
- If a test replaces globals (`fetch`, `document.getElementById`, storage, timers, console methods), restore the original value in teardown.
- Prefer `renderWithStore`, `createStoreWrapper`, or a focused provider harness over mocking `@web/store` or `store.hooks`.
- `bun test --cwd packages/web` is the acceptance check for web test isolation. A focused test can pass while still leaking into the direct suite.
- `mock.module` is process-global, not per-file: the preload's `afterAll(() => mock.restore())` (`packages/web/src/__tests__/web.preload.ts`) runs once at the very end of the whole run, so a `mock.module(...)` in one test file replaces that module for every file that imports it afterward — an order-dependent failure. Only mock a module if it has a single importer with no dedicated test of its own; if it has a dedicated test elsewhere, mocking it here will break that test instead.
- To focus an element on mount in this jsdom setup, use React's `autoFocus` prop or a stable callback ref (`ref={useCallback(n => n?.focus(), [])}`) — both fire in the commit phase. A `useEffect(() => ref.current?.focus())` does **not** make the element `document.activeElement` in tests. `autoFocus` trips biome's `lint/a11y/noAutofocus` (error) and a JSX-attribute `biome-ignore` comment breaks the formatter, so prefer the callback ref.
- `FloatingFocusManager` fights virtual-focus combobox palettes: for a component that keeps real focus in one input while using `useListNavigation({ virtual: true })` + `aria-activedescendant` (a command-palette style pattern), `FloatingFocusManager` asynchronously grabs focus to the panel container and steals it back from the input. Drop it — `useDismiss` still handles Escape/outside-press without it. It belongs on anchored forms with a real reference element instead (e.g. `FloatingEventForm`).

### Web Jest Harness Defaults (MSW + Globals)

Primary setup files:

- `packages/web/src/__tests__/web.test.start.ts`
- `packages/web/src/__tests__/__mocks__/server/mock.handlers.ts`

Current defaults worth knowing:

- MSW runs in strict mode: `server.listen({ onUnhandledRequest: "error" })`
- unhandled HTTP requests fail the test (instead of silently passing)
- IndexedDB is provided by `fake-indexeddb/auto`
- `structuredClone` is polyfilled for test environments that do not provide it
- SuperTokens session existence is reset to `true` in `beforeEach`

Important built-in handlers include:

- `GET http://localhost/version.json` (used by `useVersionCheck`)
- event and user profile/metadata routes under `ENV_WEB.API_BASEURL`
- `POST /session/refresh` with both token headers and token cookies

When a component/hook introduces a new request, add a handler in the test (or shared handlers) rather than disabling strict mode.

Example per-test override:

```tsx
import { rest } from "msw";
import { server } from "@web/__tests__/__mocks__/server/mock.server";

server.use(
  rest.get("http://localhost/version.json", (_req, res, ctx) => {
    return res(ctx.json({ version: "1.2.3" }));
  }),
);
```

### Warning-Free React Updates

When a test drives React state updates outside simple one-off interactions, wrap the update sequence in `act` imported from `react`.

```tsx
import { act } from "react";
```

Use this pattern for:

- grouped `user-event` interactions that trigger multiple updates
- manual callback triggers (for example `matchMedia` change handlers)
- awaiting async values returned from spies before asserting final UI state

Example:

```tsx
await act(async () => {
  await user.type(screen.getByLabelText(/email/i), "invalid");
  await user.tab();
});
```

### Testing Responsive Layout State (`useResponsiveLayout`)

Files:

- `packages/web/src/components/AuthenticatedLayout/useResponsiveLayout.ts`
- `packages/web/src/views/Day/components/ShortcutsSidebar/ShortcutsSidebar.tsx`
- `packages/web/src/views/Day/view/DayViewContent.tsx`

Reliable setup pattern:

- mock `window.matchMedia` with `addEventListener`/`removeEventListener` support (mount state comes from the mocked `matches`, breakpoint crossings from `change` events)
- expose a small test helper to trigger media-query changes and wrap the trigger in `act`
- assert against the view store (`selectIsSidebarOpen(useViewStore.getState())`) — the hook writes to the store rather than returning state

Assertions to prefer:

- query the sidebar by landmark role and label (`role="complementary"`, `name: "Shortcuts sidebar"`)
- when asserting presence in JSDOM for desktop-only markup (`hidden xl:flex`), use role queries that allow hidden elements where needed
- verify both pathways for toggle behavior:
  - user interaction (header toggle button)
  - keyboard interaction (`[` shortcut via view shortcut hooks)

### Seeding Event Data And Client State

Persisted events live in TanStack Query; transient client state lives in
per-domain Zustand stores (see
[Frontend Runtime Flow](../frontend/frontend-runtime-flow.md#state-systems)).
Seed both explicitly rather than reaching into module internals:

- The render harnesses (`mock.render.tsx`'s `render`/`renderHook`, and
  `render-with-store.tsx`'s `createStoreWrapper`/`renderWithStore`/
  `renderHookWithStore`) take an `events` option that calls
  `seedEventQueries(queryClient, events)`
  (`@web/__tests__/utils/event-query-test-data.ts`).
- They take a `state` option (shape mirrors the old Redux `RootState`:
  `{ events: { draft }, view, settings, userMetadata }`), routed through
  `seedStoresFromState()` (`@web/__tests__/utils/state/seed-stores.ts`) into
  the real Zustand stores.
- Zustand stores are module singletons; isolation comes from
  `resetAllStores()`, registered in a global `afterEach` in `web.preload.ts`.
  A new store must be added to both the reset registry
  (`@web/__tests__/utils/state/reset-stores.ts`) and the seeder, or it leaks
  state across tests silently.

A gotcha that produces confusing failures far from its actual cause:

- **Pending-mutation seeding:** a pending event is derived from an in-flight
  mutation whose `mutationKey` is a full 3-segment
  `eventMutationKeys.operation("edit" | "create" | ...)`. A bare
  `["events", "mutation"]` key is not recognized. Convert payloads nest the
  id under `variables.event._id`; a reorder mutation marks no events pending
  by design.

### Route-Aware Component Tests

For components that depend on routing context (`Outlet`, nested routes, route transitions), prefer the shared memory-router helper:

- `packages/web/src/__tests__/utils/providers/MemoryRouter.tsx`

Pass `initialEntries` when asserting nested or non-root routes.

### Global And Console Cleanup

If a test overrides globals (for example `window.location` or `window.indexedDB`) or spies on `console.*`, always restore them in teardown (`afterEach`/`afterAll`) to prevent cross-test leakage and noisy output.

### Floating UI-Dependent Tests

If a test exercises components that rely on `@floating-ui/react` refs/styles (for example Day view context-menu interactions), import the shared setup:

- `@web/__tests__/floating-ui.setup`

This keeps tests on production code paths while avoiding brittle layout coupling in JSDOM.

### Jest Unbound-Method Rule In Tests

Test linting enforces `jest/unbound-method`. If you need to assert method calls on non-mock objects, spy on the method first so assertions are bound to a Jest mock/spy.

Useful anchors:

- `packages/web/src/__tests__`
- `packages/web/src/views/**/*.test.tsx`
- `packages/web/src/sse/**/*.test.tsx`

## Backend Test Style

Preferred style:

- controller/service behavior tests
- realistic request flows when possible
- mock only external services, not internal business logic

**Do not import `mongoService` (or other persistence implementations) directly in tests.** Use test drivers instead (e.g. `UserDriver`, `GoogleWatchDriver` in `packages/backend/src/__tests__/drivers/`). Drivers encapsulate persistence so that switching away from Mongo (or another store) in the future does not require changing test code.

CI runs every lane with `TZ: Etc/UTC` (see CI Unit Test Workflow above). If a backend test only fails locally, match that explicitly rather than relying on your machine's default timezone: `TZ=UTC ./node_modules/.bin/jest --selectProjects backend`.

Useful anchors:

- `packages/backend/src/__tests__`
- `packages/backend/src/__tests__/drivers/`
- `packages/backend/src/event/services/*.test.ts`
- `packages/backend/src/sync/**/*.test.ts`

## Core Test Style

Preferred style:

- pure function coverage
- edge cases and schema validation
- date and recurrence invariants

Useful anchors:

- `packages/core/src/util/**/*.test.ts`
- `packages/core/src/types/*.test.ts`
- `packages/core/src/validators/*.test.ts`

## E2E Notes

E2E tests live in `e2e`.

Use them for:

- critical user flows
- integration between auth, UI, and persistence
- regressions that unit tests cannot model cleanly

### Accessibility Testing

Compass targets WCAG 2.2 Level AA. Use native HTML first and the WAI-ARIA
Authoring Practices Guide when a complex widget needs ARIA roles, states, or
keyboard behavior. ARIA is implementation guidance, not a substitute for
meeting WCAG or testing the resulting experience.

Accessibility coverage is layered because no single tool can establish WCAG
conformance:

| Layer | What it protects | When it runs |
| --- | --- | --- |
| Biome accessibility rules | Invalid or risky JSX and ARIA patterns | Editor, `bun run lint`, and CI |
| React Testing Library | Roles, accessible names, state, focus, and keyboard behavior | Focused web tests and `bun run test:web` |
| Playwright with axe | Automatically detectable issues in realistic rendered states | `bun run test:a11y`, `bun run verify web`, and E2E CI |
| Targeted browser assertions | Regressions generic rules cannot reliably model, such as transient contrast or focus behavior | The relevant E2E regression test |
| Manual review | Keyboard usability, zoom/reflow, screen-reader experience, and other judgment-based WCAG criteria | Major UI changes and periodic audits |

#### How Axe Coverage Works

`AxeBuilder.analyze()` scans the rendered DOM once, in its current state. With
no `include`, it scans the page. An `include` limits the scan to that region.
It does not observe later changes or automatically discover closed dialogs,
collapsed menus, alternate routes, hover/focus styles, or validation states.
Reveal or activate those states before scanning them.

Do not add a bespoke axe test for every component or automatically scan the
arbitrary final state of every E2E test. Instead, keep a small accessibility
smoke suite covering representative pages and important states. Add a new
checkpoint when a change introduces:

- a major route or substantially different page layout
- a dialog, menu, popover, disclosure, or other initially hidden region
- a form validation or error state
- a complex widget with custom keyboard or ARIA behavior
- a UI state not already rendered by an existing accessibility test

Use one shared assertion helper for the standard axe configuration and failure
formatting. A checkpoint should normally scan the whole page. Limit the scan to
a region only when the test intentionally owns that region and document why.
Treat `violations` as failures and review `incomplete` results: incomplete means
axe could not make a reliable automated decision and requires human judgment.

#### Shared Helper

`e2e/utils/axe-assertion.ts` exports `expectNoAxeViolations(page, options?)`.
It runs one `AxeBuilder` scan tagged to Compass's WCAG target
(`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` - the full WCAG 2.2 AA
set; WCAG 2.2 only added AA-level success criteria, so there is no `wcag22a`
tag). That tag set was confirmed against the installed axe-core version, not
assumed:

```bash
grep -o 'wcag2[0-9a]*' node_modules/axe-core/axe.js | sort -u
```

Re-run that after bumping axe-core to confirm the tags are still current.

Options:

- `include`: CSS selector to scope the scan to a region (omit for whole-page).
- `checkpoint`: short label included in failure/log output.
- `knownIncomplete`: an array of `{ ruleId, reason }`. Any `incomplete` result
  whose rule id is listed here is reported as an explained, expected result
  for that checkpoint. This is not a blanket allowlist - it does nothing for
  other rules or other checkpoints. Everything in `incomplete` that isn't
  listed is still printed (never silently dropped), just not failed.

**Incomplete-result policy:** `violations` always fail the test. `incomplete`
never fails the test - axe itself couldn't decide, so treating it as a hard
failure would make the suite fail on things no one can fix from the report
alone. Every incomplete result is printed for review, either as "known" (with
its documented reason) or as an unexplained result to look at. The two
`knownIncomplete` entries in use today (both on the actions-menu checkpoint,
see `e2e/accessibility/app-a11y.spec.ts`) are `aria-valid-attr-value` and
`aria-hidden-focus`, both inherent to how `@floating-ui/react` portals menu
content and traps focus around it, not app markup - see the reasons recorded
at the call site. Unexplained `incomplete` results seen in this suite today
are `color-contrast` (axe cannot compute a background across an
absolutely-positioned overlap or a CSS gradient, and cannot reliably sample
single-character date-cell text) - these are exactly the states the
datepicker's targeted contrast test and manual review already cover.

#### Representative Checkpoints

`e2e/accessibility/app-a11y.spec.ts` covers:

- the week view (main authenticated calendar surface)
- the timed event form open (sidebar form, a hidden-until-activated region)
- the all-day event form open (a distinct field set from the timed form)
- the event actions menu open (a floating, portaled menu)
- the invalid-date validation error toast (an error state)

`e2e/accessibility/datepicker-a11y.spec.ts` covers the sidebar date navigation
region and keeps its own targeted per-date contrast regression (below).

#### When To Add A Targeted Regression Test

Keep focused browser assertions when the failure depends on a state or visual
composition that a general scan may not evaluate reliably. Examples include:

- hover, focus, selected, disabled, and error-state contrast
- text rendered over pseudo-elements, gradients, images, or overlays
- focus placement and focus return around dialogs
- arrow-key, Home/End, Escape, and roving-tabindex behavior
- live-region announcements
- reduced-motion, forced-colors, or high-contrast behavior

The datepicker contrast test in `e2e/accessibility` is this kind of regression
test: it checks every enabled date in default and hover states and accounts for
the selected-date pseudo-element. It complements the axe scan rather than
serving as a pattern to copy for every control.

#### Component Test Expectations

Accessibility behavior belongs in the component's normal behavior tests. Use
role and accessible-name queries and drive the UI as a user would:

```tsx
const nextMonth = screen.getByRole("button", { name: "Next month" });

await user.click(nextMonth);
await user.tab();
await user.keyboard("{ArrowRight}");
```

Test meaningful outcomes such as focus movement, updated `aria-expanded` or
`aria-selected` state, connected errors/descriptions, and keyboard operation.
A successful `getByRole` query is useful pressure toward semantic markup, but
it is not an accessibility audit by itself.

#### Manual Review

For a major UI change, verify the affected flow with:

- keyboard-only navigation, including visible focus and a logical focus order
- browser zoom and reflow at 200% and 400%
- VoiceOver on macOS for names, roles, state changes, and announcements
- reduced-motion and forced-colors/high-contrast settings when relevant
- a free browser audit such as Accessibility Insights for Web

Record the states reviewed in the PR - `.github/PULL_REQUEST_TEMPLATE.md` has a
short accessibility checklist for exactly the judgment calls automation can't
make (keyboard reach, dynamic content exercised, zoom/reflow, screen-reader
names, reduced-motion/forced-colors). Automated checks passing means no tested
automated violation was found; it does not mean the page conforms to every WCAG
success criterion.

#### Workflow For UI Changes

1. Prefer semantic HTML and shared semantic color tokens while implementing.
2. Add role/name and keyboard coverage to the affected component tests.
3. Reuse an existing axe checkpoint when it already renders the changed state;
   otherwise add the smallest representative checkpoint.
4. Add a targeted browser regression only for behavior the general scan does
   not protect.
5. Run `bun run test:web`, `bun run lint`, and `bun run verify web`.
6. For major UI changes, complete and document the relevant manual checks.

Browser-based accessibility checks are appropriate for CI and pre-push
verification. Keep commit hooks limited to fast static checks so normal commits
do not need to start a browser. There is no Husky/git-hook setup in this repo;
run `bun run verify web` yourself before pushing web/JSX/CSS changes, and rely
on `test-unit.yml` (lint, type-check) and `test-e2e.yml` (`bun run test:e2e`,
which includes `e2e/accessibility`) in CI as the enforcement backstop. Both
workflows trigger on any push/PR that isn't docs-only, so web changes are
always covered.

#### Biome Rule Levels

`biome.json`'s `linter.rules.a11y` splits into two groups. Rules with no
standing `biome-ignore` anywhere in the repo are `"error"`, so a new violation
fails `bun run lint` and CI immediately. Rules that have narrow, pointer-only
exceptions already in the codebase (`noNoninteractiveTabindex`,
`noRedundantRoles`, `noStaticElementInteractions`, `useAriaPropsSupportedByRole`,
`useSemanticElements` - grep for `biome-ignore lint/a11y/<rule>` to find them)
stay at `"warn"`: promoting a rule to `"error"` while it still has documented
exceptions would make "error" mean something less than zero exceptions. Before
promoting a currently-`"warn"` rule, confirm it has no existing
`biome-ignore` for that rule.

References:

- [WCAG 2 overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)
- [Accessibility Insights for Web](https://accessibilityinsights.io/docs/web/overview/)

### CI-Only Flakiness From Worker Contention

`test-e2e.yml` runs in a container-limited GitHub Actions runner. Two
Playwright workers there compete with each other and with the shared dev
server for CPU, so whichever spec happens to be mid-render/mid-save when
both workers spike can blow through its assertion timeout — a different
spec each time, unrelated to the diff under test. Signature: a form-save or
element-visibility timeout in a spec the PR did not touch, passing on retry
or on a rerun of just the failed job. `playwright.config.ts` now runs a
single worker in CI (`workers: process.env.CI ? 1 : 2`) specifically to
remove this contention; if it recurs, treat it as environmental before
assuming a spec regressed, and do not "fix" it by deleting the test.

A test that fails **deterministically** isn't automatically a real product
bug either — it can be the harness racing a CSS transition. One
`create-event-mouse` spec failed 100% of the time in reduced-day-count mode
(narrow viewport + sidebar open): `ensureSidebarOpen`
(`e2e/utils/event-test-utils.ts`) waited for the sidebar to become *visible*
but not for its `transition-[width]` to finish, so the test measured column
positions mid-animation and then dragged after the grid had reflowed to a
different column count. Fixed by `waitForMainGridWidthToSettle` (polls
`#mainGrid`'s measured width until two consecutive reads match), called from
the just-opened branch of `ensureSidebarOpen` — this benefits any spec that
opens the sidebar and then immediately depends on grid geometry. Verify
empirically (a throwaway debug spec dumping live `getBoundingClientRect()`s)
before concluding either way: "flaky = environment" and "deterministic = app
regression" are both assumptions, not defaults.

### CI-Only Flakiness From Branch Divergence

A web unit test that times out only on GitHub Actions and never locally
(even when replaying CI's exact file execution order or running
`--rerun-each=25`) is not always pure environmental flake. If the failing
test lives in shortcut or view-store code, first check whether the PR branch
is behind `main` on those exact files — merging/rebasing main in has
resolved this class of failure before, because divergent shortcut/store code
interacting with CI's file ordering was the real contributor, not the
environment. Only treat it as a genuine flake
(`gh run rerun <run-id> --failed`) once the branch is confirmed current and
the diff doesn't touch the failing area.

## Testing Realtime And Sync Changes

For SSE or sync work:

- test backend emitters/handlers where possible
- test web SSE hooks for listener registration and dispatch behavior
- test event listeners and operations if refetch or optimistic behavior changed

## Common Gaps To Watch

- optimistic event ids
- recurring event scope handling
- local-only versus authenticated repository behavior
- storage migration paths
- date parsing around all-day events and UTC formatting
