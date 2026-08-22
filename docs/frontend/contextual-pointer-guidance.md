# Contextual Pointer Guidance Plan

## Goal

Compass deliberately blocks pointer actions, but a blocked click should still
answer the user's immediate question: **how do I perform the action I just
tried?** The hint should name the equivalent keyboard action and show its keys,
rather than sending every user to the `?` shortcut legend.

Examples:

- Clicking an event: “Open this event with `W2`, then `Enter`.” The event token
  is the same stable, visible-event assignment used by event jump.
- Clicking the sidebar close control: “Press `]` to close the sidebar.”
- Clicking the Today control: “Press `T` to go to today.”
- Clicking a control without a keyboard equivalent: explain that the action is
  not available yet and record the gap; do not advertise `?` as a substitute.

The result should reduce dead-click confusion while teaching shortcuts in the
context where users are motivated to remember them.

## Product principles

1. **Teach the attempted action.** Copy uses the target's current state and
   intent (“close sidebar”, not merely “toggle sidebar”).
2. **Keep the keyboard path executable.** Never show a shortcut that cannot be
   used from the current focus, view, modal, permission, or read-only state.
3. **Derive, do not duplicate.** Hint keys and labels come from the same action
   descriptors that drive runtime bindings and the shortcut registry.
4. **Prefer the shortest safe path.** Show one action when possible and a short
   sequence only when necessary. The `?` legend remains a reference, not the
   default response to a blocked click.
5. **Describe state, not pointer geometry.** Resolve the nearest semantic action
   in the composed event path; never infer intent from coordinates or CSS.
6. **Stay useful after repetition.** Repeated clicks may shorten presentation,
   but must retain the contextual keys. “Keyboard only” by itself recreates the
   dead end this work is intended to remove.
7. **Preserve accessibility.** The message is a polite live-region update,
   keycaps have a readable text equivalent, and no focus is moved on a blocked
   click.

## Proposed architecture

### 1. Define action descriptors

Add a typed contextual-action catalog near the shortcut registry. Each entry
has:

- a stable action ID;
- state-aware imperative copy, such as `Close sidebar` or `Open event`;
- display keys derived from the runtime binding;
- an optional availability predicate;
- optional dynamic context, used only for actions such as a specific event;
- analytics-safe metadata (action ID and surface, never event title/content).

Move bindings that are currently written only at handler sites into shared
constants as they are adopted. The shortcut overlay, runtime handler, command
palette, tooltip, and pointer hint must all read the same descriptor. Add a
registry invariant test that every pointer-teachable action has keys and that
its keys agree with the displayed shortcut.

### 2. Annotate semantic targets

Introduce a small component/helper that adds a single semantic attribute, for
example `data-pointer-action="sidebar.close"`, to the element representing an
action. Allow a JSON-free secondary value only where dynamic identity is
required (an event ID); do not put user-facing copy or key strings in DOM
attributes.

Annotate the interactive element, not incidental icons or text. Event cards,
buttons wrapped in tooltips, menu items, banners, and grid regions can then be
resolved consistently through `event.composedPath()`. A child click inherits
the nearest annotated ancestor. Nested actions (for example, Join inside an Up
Next card) resolve to the innermost action.

### 3. Carry click context through suppression

Change the pointer-block callback from a pulse with no payload to a typed
blocked-attempt record:

```ts
type BlockedPointerAttempt = {
  actionId: ContextualActionId | "unknown";
  context?: { eventId: string };
  surface?: PointerSurface;
  nonce: number;
};
```

Resolve this record on the first blocked `pointerdown`, before propagation is
stopped. Keep the existing protections that let keyboard activation, synthetic
clicks, and keyboard context menus pass. Gesture tails (`mousedown`, `click`,
`dblclick`, and `contextmenu`) must not replace the first intent or show another
message.

The store should hold only the latest ephemeral attempt. It must not persist
event IDs, copy, or click history.

### 4. Render a contextual hint

Replace `PointerHint`'s generic full/brief branches with a resolver that accepts
the attempted action and current app state. Render sentence fragments plus the
existing shortcut keycap components so platform-specific modifiers remain
correct and the message is readable by assistive technology.

Presentation rules:

- A new attempt replaces the visible hint and restarts its timer.
- Repeating the same attempt may use a shorter sentence, but retains its keys.
- A different target always gets full contextual copy, even after the session's
  reminder threshold.
- When the Shortcut Showcase owns the app, keep its existing instruction; the
  showcase is already the active teaching context.
- If the target is unknown, use a neutral fallback (“This action needs a
  keyboard shortcut”) and optionally offer `?` as secondary help. Track unknown
  action IDs/surfaces so the team can close coverage gaps.
- If the action is unavailable, say why when useful (“This calendar is
  read-only”) rather than teaching keys that will do nothing.

### 5. Make event clicks directly actionable

An event click is different from a static control: the user selected a specific
object. Requiring `S`, discovering its generated label, entering that label,
and then pressing `Enter` is too indirect for a contextual hint.

Event cards expose their event ID to the pointer-attempt resolver. A blocked
event click asks the mounted view's event-jump owner for fresh assignments,
activates jump mode, and publishes the clicked event's token to the hint. This
makes the token sequence executable **without first pressing `S`** when no
higher-priority app layer owns input:

- Week view accepts the assigned day-prefix/index token (for example `W2`).
- Day view accepts the numeric token (for example `2`).
- Enter opens the focused event form, so the hint is “Press `W2`, then `Enter`
  to open this event.”
- `S` remains the discoverability/overlay toggle and continues to reveal every
  token. It is no longer a required sequence leader.

Before enabling leaderless sequences, build and test a collision table against
global shortcuts. A multi-key matcher should wait only while a prefix is
genuinely ambiguous, prefer an exact event token after the sequence timeout,
and replay or dispatch the unrelated global action when the sequence fails.
Digits must not be captured in editable fields. If a generated token cannot be
made unambiguous in the current keymap, the resolver should teach the safe
`S`-led path until the collision is removed rather than advertising a broken
shortcut.

## Coverage plan

Adopt targets in vertical slices so each shipped message has a working shortcut
and tests.

### Phase 1: Foundation and highest-friction clicks

- Add typed attempt payloads, composed-path resolution, contextual rendering,
  and the registry invariant tests.
- Cover both sidebar open/close controls with the state-specific `]` message.
- Cover saved timed and all-day event cards, including read-only events.
- Extract event assignments and enable safe leaderless event sequences.
- Keep the generic fallback only for unannotated targets during migration.

### Phase 2: Calendar navigation and creation

- Header view switchers: `D`, `W`, and `L`.
- Previous, next, and Today controls: `J`, `K`, and `T`, with view-aware copy.
- Empty timed/all-day grid regions: `C` and `A`. Because a clicked time slot
  conveys placement that the current create shortcut may not preserve, either
  add a keyboard placement sequence or explicitly teach `C` followed by the
  draft movement keys; do not claim exact equivalence prematurely.
- Date/month navigation and any responsive variants of the same controls.

### Phase 3: Event and notice actions

- Up Next open/join/dismiss actions: `N`, `V`, and the applicable dismissal
  path.
- Focused-event context menu, duplicate, delete, and edit-field actions.
- Toast/banner actions, including `F` plus the focused action's activation key.
- Event-form save/cancel and field navigation, while respecting editable-field
  shortcut variants such as `Mod+E`.

### Phase 4: Settings, auth, and secondary surfaces

- Command palette and shortcut/help entry points.
- Calendar/account visibility, color, connection, and settings controls.
- Theme, profile, signup, and authentication controls only after equivalent
  keyboard commands exist and can run in the relevant modal state.
- Menus, dialogs, date pickers, recurrence controls, and responsive-only
  affordances.

For every phase, inventory all rendered buttons, links, `role="button"`
elements, menu items, clickable grid regions, and pointer handlers. Classify
each as covered, intentionally pass-through, unavailable, or missing keyboard
parity. Missing parity is a product bug, not a reason to attach inaccurate
guidance.

## Testing strategy

### Unit and component tests

- Pointer suppression captures the nearest semantic action from a composed
  path and emits only once per gesture.
- Keyboard-created and synthetic clicks still pass through untouched.
- Each static descriptor agrees with the runtime keymap/shortcut registry.
- `PointerHint` renders state-specific copy/keycaps, replaces stale hints, keeps
  keys in the repeated form, and preserves Showcase behavior.
- Sidebar controls teach `]` for both open and close state.
- Timed and all-day cards resolve their own event token without exposing event
  content in the store or analytics.
- Unknown/unavailable targets use their explicit fallback and never claim a
  non-working shortcut.

### Event-sequence tests

- Direct tokens focus the intended event in Day and Week views without `S`.
- Assignments remain stable while scrolling and update when events/views change.
- Prefix collisions, invalid sequences, timeout behavior, Escape, app locks,
  editable fields, read-only events, and unmounted targets behave predictably.
- `S` still toggles the visual overlay and all existing focus/navigation
  shortcuts retain precedence.

### Integration and manual checks

- Run focused web tests, type checking, and linting.
- Exercise every adopted target with pointer input and then immediately perform
  the shown keyboard path.
- Verify narrow and wide layouts, light/dark themes, reduced motion, screen
  reader announcement, browser zoom, and rapid clicks on different targets.
- Add a development-only audit that reports interactive elements beneath the
  app shell without a contextual action annotation; use it to prevent coverage
  regression without shipping DOM scans in production.

## Measurement and rollout

Emit one event per first blocked `pointerdown` with `actionId`, `surface`,
whether guidance was contextual/fallback/unavailable, and whether the displayed
keyboard action is used within a short window. Do not send coordinates, event
IDs, event titles, calendar names, or typed sequence contents.

Track:

- fallback rate by surface;
- repeated blocked attempts on the same action;
- contextual-hint-to-shortcut conversion;
- time from hint to successful action;
- event-token collision/fallback rate.

Ship Phase 1 behind a small internal flag if the leaderless matcher changes
global key precedence. Graduate it when shortcut-regression tests are green and
fallback/repeated-click rates improve. Subsequent phases can ship independently
because unannotated targets retain the migration fallback.

## Definition of done

- Every pointer-blocked interactive target is inventoried and has either an
  executable contextual keyboard path or an explicit unavailable explanation.
- Event clicks receive a specific, currently valid event token and that token
  works without first entering overlay mode when collision-safe.
- Sidebar close/open clicks teach `]` with state-specific language.
- Hints, tooltip labels, the shortcut legend, and runtime bindings cannot drift
  silently.
- Repeated guidance remains actionable, assistive technology announces it
  politely, and no hint moves focus or exposes user data.
- Acceptance documentation and automated regressions cover the new behavior;
  product metrics show fewer repeated blocked clicks and less fallback usage.
