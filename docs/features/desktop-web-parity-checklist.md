# Native macOS ↔ web parity checklist

Tracking issue: [#4331 Native web-parity dogfood gate](https://github.com/KeepSoftwareSimple/compass-calendar/issues/4331).

This checklist compares **apps/calendar-web** (reference UI) with **apps/calendar-macos** (native Swift). Status keys:

| Status | Meaning |
| --- | --- |
| ✅ | Matches web behavior and styling closely enough for dogfood |
| 🟡 | Partial: core behavior works, visual or edge-case gaps remain |
| ❌ | Missing or materially different |
| 🔧 | Shared contract exists; fix is mostly wiring or SwiftUI/AppKit polish |

**Sources of truth**

- Semantic **colors**: `apps/calendar-web/src/index.css` → `bun cli desktop:export` → `CompassKit/Generated/ThemeTokens.swift` (22 roles; guarded by `theme-css.test.ts` and `desktop:export --check`).
- **Shortcuts registry**: `packages/core/src/shortcuts/shortcuts.registry.ts`, `KEYMAP`, `APP_SHORTCUT_BINDINGS` → `CompassKit/Resources/shortcuts.json` + `ShortcutIds.swift`.
- **Layout math / fixtures**: exported JSON replayed in `CompassKitTests` / `CompassDataTests`.
- **Manual acceptance**: [Desktop acceptance](../acceptance/desktop.md), [Shortcuts](../acceptance/shortcuts.md).

---

## 1. Design tokens

### 1.1 Colors (themes, accent, event fills)

| Item | Web | macOS | Status | Notes |
| --- | --- | --- | --- | --- |
| Light Beach / Dark Abyss palettes | `[data-theme]` in `index.css` | `ThemeTokens.lightBeach` / `darkAbyss` | ✅ | Generated from same CSS |
| SwiftUI accessor coverage | Tailwind `color-*` for all 22 roles | `NativeWebTheme` exposes subset on `ThemeTokenColor+SwiftUI.swift` | 🟡 | Missing convenience colors: `surfaceRaised`, `textSubtle`, `borderStrong`, `accentHover`, `accentStrong`, `accentSecondaryHover`, `onAccent`, `info`, `shadowDefault` |
| Panel modal backdrop | `OverlayPanel` / `bg-background/85` | `panelBackdropColor` = `background` @ 85% opacity | 🟡 | Web uses `--overlay-backdrop` for dimming; panel tint is separate |
| Event default fill hex | `theme.util.ts` / deck | `EventCardView.swift` literals `#454442`, `#82A0B2` | 🟡 | Values align; not read from tokens |
| Event focus ring color | `--event-focus-color` + outline | `EventCardView` CALayer border from fill-aware helper | 🟡 | Same intent, different paint model |
| Holiday / gradient accents | CSS gradients on chips | Mostly solid fills | 🟡 | Audit per calendar color id |
| Block Party slot colors | Web game CSS | `BlockPartyColor.swift` hardcoded RGB | 🟡 | Intentional game palette; not semantic tokens |

### 1.2 Typography

| Item | Web | macOS | Status | Notes |
| --- | --- | --- | --- | --- |
| Font family | Rubik (`index.css` `@theme`) | `Resources/Fonts/Rubik-Variable.ttf`, `.rubik()` | ✅ | |
| Base size 14px | `text-sm` / body | `RootView` `.font(.rubik(14))` | ✅ | |
| Scale (10–20px utilities) | Tailwind `--font-size-*` | Per-view hardcoded point sizes | 🟡 | No shared typography export yet |
| VT323 / Caveat (special) | Web where used | Bundled fonts | 🟡 | Spot-check Life / onboarding |

### 1.3 Spacing, radii, borders

| Item | Web | macOS | Status | Notes |
| --- | --- | --- | --- | --- |
| Main content `pl-8` | 32px | `contentLeadingInset` 32 | ✅ | `RootView.swift` |
| Sidebar width / divider column | `SIDEBAR_DIVIDER_WIDTH` | `sidebarDividerWidth` 32 | ✅ | |
| Sidebar **leading** border full height | 1px `border-border`, no horizontal rules in body | `Rectangle` 1px on sidebar leading edge | ✅ | Tyler: avoid extra horizontal dividers inside sidebar |
| `--radius-default` / `rounded-xs` | `index.css` `@theme` | Mixed 4/8/12 in SwiftUI | 🟡 | Palette panel 12; save bar should be `rounded-xs` (~4) |
| Grid hour lines | `border` alpha 15% / 12% dark | `TimeGridStyleTests` | ✅ | |
| `--border-strong` | Strong dividers when needed | Rarely used in SwiftUI | 🟡 | |

### 1.4 Shadows

| Item | Web | macOS | Status | Notes |
| --- | --- | --- | --- | --- |
| `--shadow-default` on elevated buttons | `c-button-elevated` | Limited native elevation | 🟡 | Save bar / primary buttons |
| Command palette panel shadow | Floating overlay | Stroke only, no shadow | 🟡 | `CommandPaletteOverlay.swift` |

### 1.5 Focus rings

| Item | Web | macOS | Status | Notes |
| --- | --- | --- | --- | --- |
| Default interactive focus | `c-focus-ring`: 1px accent ring + 1px offset on `surface-panel` | Mixed: AppKit `.exterior`, custom strokes, `NoticeFocusRing` 2px no offset | 🟡 | Target: consistent accent border **without** fill color swap |
| Notice focus (`p`) | Focus moves into notice control | Banner `noticeFocusRing` on billing/demo/update | 🟡 | Web scans `[data-notice]`; native `NativeNotice` enum is smaller |
| Fields | `c-field` ring on focus | Per-control 1px stroke (e.g. description editor) | 🟡 | |
| Disabled system focus ring | N/A | Quick Add `focusRingType = .none` | 🟡 | Matches intentional web-like chrome |

**Token drift prevention:** Prefer extending `NativeWebTheme` from generated `ThemeTokens` rather than new literals. Optional follow-up: export radius/typography scales from CSS the same way as colors.

### 1.6 macOS unified title bar (intentional platform difference)

| Item | Web | macOS | Status | Notes |
| --- | --- | --- | --- | --- |
| Calendar nav + title + sidebar toggle | In-content header row (`CalendarHeader`, `h-12`) | Unified title bar beside traffic lights (`MacTitleBarChromeMetrics`) | ✅ | Tyler: reclaim vertical space; window drag on empty title-bar background |
| Parity screenshot grid region | Crop includes in-viewport header band | Regional grid crop starts at `mainContentTopInset` (52px); web crop skips 48px header | ✅ | `.github/scripts/compose-desktop-parity-shots.py` `grid_region_crop()` |

---

## 2. Surfaces

### 2.1 Week / day time grid

| Item | Status | Notes |
| --- | --- | --- |
| Deck layout / card frames | ✅ | Shared fixtures, `GridLayoutSnapshotTests` |
| All-day row above timed scroll | ✅ | `TimeGridView.renderAllDayColumns` |
| Now line position | ✅ | Shared now math |
| Now line **visual** (gradient + 1px rim) | 🟡 | macOS: accent gradient + 1px background rim (#4611); web shimmer timing still differs |
| Now-cue pulse on **`t`** (today) | 🟡 | Web 700ms label shimmer; macOS week header opacity pulse + day view switcher pulse |
| Click grid teaches shortcut | ✅ | Pointer hint overlay |
| Day labels | ✅ | Centered per column; number `clamp(18, 2.7cqw, 20.8)`, weekday `clamp(13, 2cqw, 16)` |
| Day column header focus | 🟡 | AppKit exterior ring vs web `c-focus-ring` |
| Shift+C all-day tip strip | 🟡 | Sidebar jump line animates; full web tip stack still partial |

### 2.2 Event chips

| Item | Status | Notes |
| --- | --- | --- |
| Timed / all-day card shell | ✅ | `EventCardView`, palette tests |
| Event jump chips (W1, SU2, ...) | ✅ | `DayJumpKeys` ports web `assignDayJumpKeys`: day prefix + per-day index on timed and all-day cards, narrowed to the typed day; digits after a day pick focus (400 ms wait for W1 vs W10); bare digits stay quick-time |
| Shift+M weekday column jump | 🟡 | `handleShiftDayJump`; weekend Shift+S→U/A added; digit jump after a day pick wired; still web-only: bare letters in jump mode (web takes M/T/W without Shift) and HHMM create on the picked column (Shift+T then 1230) |
| Sidebar edit ring | 🟡 | Inset focus layer vs web outline |
| Unsettled outline | ✅ | Dashed `text-muted/50` outline on sample events and organized events with awaiting or tentative guests |

### 2.3 Sidebar event form

| Item | Status | Notes |
| --- | --- | --- |
| Replaces sidebar body while open | ✅ | `EventFormView` in `RootView` |
| Date field **MM.DD.YY** closed display | 🟡 | `EventFormCompactDateField` + `EventFormDateFormat`; verify parity capture after merge |
| Datepicker open Enter/Space/ArrowDown | 🟡 | Audit `EventFormScheduleSection.swift` vs web |
| Time pickers | 🟡 | Visual parity pass needed |
| Location / Meet / guests grouping | ✅ | #4607 single `EventFormCard` + description card (web #4599) |
| Color row Mod+digit hint | 🟡 | Trailing ⌘ 6 keycaps like web `EventColorPicker`; web swaps to ← → · Enter while a swatch has focus, macOS has no swatch arrow keys yet. The demo capture also shows a guest row on macOS only: the demo fixture calendar can invite (UI tests need it), the real local calendar cannot |
| Save bar: accent fill, on-accent text, space-between, **⌘Enter** hint | 🟡 | macOS save bar matches accent + Mod+Enter keycap (#4610); sidebar shows web save-draft tip (#4614) |
| Mod+digit field jump + hold-Mod chips | ✅ | `ModHoldChipsOverlay`, layout snapshots; chips sit at the anchor's top-right corner like web `DigitHintChipOverlay` (top + 2px, flush right), so the month picker chip no longer hides the Lv badge's "v" |
| Hold-Mod day header keycaps (⇧SU, ⇧M, ...) | ✅ | Week headers swap the weekday for `WeekDayColumnHeaderControl` keycaps while Mod is held; bare letters in event-jump mode |
| Hold-Mod sidebar chips (month picker, Up next, calendar list) | ✅ | Anchors merge with nested ones, so the sidebar no longer hides the month picker and Up next chips; the calendar list digit sits on the list, not the sidebar corner. |
| Per-account page-jump targets | ✅ | One Mod+digit target per connected account heading after Up next, like web `buildCalendarPageJumpTargets`; a collapsed heading expands on jump; one "calendars" slot with no accounts |
| Sticky form actions row (icons + shortcuts) | 🟡 | Web `FormActionsRow.tsx`; macOS `EventFormToolbarView` SF Symbols, fewer keycaps |

### 2.4 Mini-calendar (month picker)

| Item | Status | Notes |
| --- | --- | --- |
| Keyboard `i`, arrows, Enter | ✅ | |
| Mod+Alt+Shift+J / K month jump | ✅ | |
| Selected range / today styling | ✅ | Week mode bolds the selected week row with ink on today; 28.8pt circles; today follows the calendar clock; Go to this month circle hides on the current month |
| Weekday header 10px muted | 🟡 | Rubik 10 in `SidebarMonthPicker.swift` |

### 2.5 Up Next / Now panel

| Item | Status | Notes |
| --- | --- | --- |
| Projection + join URL | ✅ | |
| `N` / `V` shortcuts | ✅ | Registry + router |
| Shortcut hint on card (N/V keycaps) | 🟡 | Hover/focus keycap on native Up Next (#4614) |
| Bottom banner vs web notice stack | 🟡 | Fewer notice types on native |

### 2.6 Account list / calendars sidebar

| Item | Status | Notes |
| --- | --- | --- |
| Calendar list + digit hide/show | ✅ | |
| Anonymous row | ✅ | |
| Sync status line + shortcut footer | ✅ | |

### 2.7 Settings

| Item | Status | Notes |
| --- | --- | --- |
| Accounts, default calendar, timezone, theme | ✅ | WP-29 |
| Launch at login, global Quick Add | ✅ | macOS-only (expected) |
| Visual match to web settings overlay | 🟡 | Section spacing, toggles |

### 2.8 Onboarding / welcome

| Item | Status | Notes |
| --- | --- | --- |
| Welcome modal steps | ✅ | |
| Connect / first-event prompts | 🟡 | |
| Pixel pirate / illustration colors | 🟡 | Hardcoded in `PixelPirateView.swift` |

### 2.9 Notices / toasts / banners

| Item | Status | Notes |
| --- | --- | --- |
| Billing past due | ✅ | |
| Demo events, update ready | ✅ | |
| Meeting nudge, connect prompts, first-event | ✅ | Sidebar meeting-page nudge (`M`), local-mode trial card (`S`, Esc), first-event card completes on first create |
| Connection + timezone banners | ✅ | Reconnect / Retry / Refresh / Learn more (`G`); timezone mismatch Switch / Keep; Auto zone follows the Mac each minute |
| Status toasts | 🟡 | `StatusToastOverlay` vs web toast stack |
| Focus latest notice **`p`** | ✅ | Connection banner, sample events, meeting nudge, trial card, update, past due |

### 2.10 Command palette

| Item | Status | Notes |
| --- | --- | --- |
| Placeholder copy | ✅ | Same string |
| Go-to-date from query | ✅ | Shared parsing fixtures |
| Navigation / create / events / recent | ✅ | |
| Fuzzy search + highlight | ✅ | `CommandPaletteSearchLogic` mirrors `filterSections`; muted label with bold matches |
| Row icons (Phosphor) | 🟡 | SF Symbol row icons on navigation/more rows (#4613); not Phosphor |
| Keycaps (`ShortcutKeys`) | ✅ | One `ShortcutHintChip` per key, like web `ShortcutKeys` |
| Selected row ring inset | ✅ | Accent inset ring + lighter fill (web `ring-inset`) |
| **Missing rows** vs web | ✅ | Web section order and rows (Common Actions, Appearance, Settings, More); disabled rows dim and skip; notifications row is web-only (macOS uses system settings) |
| Footer hint | ✅ | Keycap chips for navigate / select / close |

### 2.11 Command palette (desktop quick-add variant)

| Item | Status | Notes |
| --- | --- | --- |
| Separate placeholder when creating from hotkey | 🟡 | Web `DESKTOP_QUICK_ADD_PALETTE_PLACEHOLDER`; verify native quick-add panel |

### 2.12 Life view

| Item | Status | Notes |
| --- | --- | --- |
| Grid + sidebar | 🟡 | Founder visual QA noted on #4331 |

### 2.13 Window chrome

| Item | Status | Notes |
| --- | --- | --- |
| Traffic lights + header | ✅ | `WindowChromeLayoutTests` |
| View switcher keycaps | ✅ | `ViewSwitcherView` |

---

## 3. Keyboard parity

Legend: **Mod** = ⌘ on macOS. Web bindings from `APP_SHORTCUT_BINDINGS` / `KEYMAP`; macOS from `shortcuts.json` unless noted.

### 3.1 Navigate

| ID | Binding | Web | macOS | Status |
| --- | --- | --- | --- | --- |
| `nav-up-next` | N | ✅ | ✅ | ✅ |
| `nav-join-meeting` | V | ✅ | ✅ | ✅ |
| `nav-previous` | J | ✅ | ✅ | ✅ |
| `nav-next` | K | ✅ | ✅ | ✅ |
| `nav-shift-left` | Mod+Shift+← | ✅ | ✅ | ✅ |
| `nav-shift-right` | Mod+Shift+→ | ✅ | ✅ | ✅ |
| `nav-month-prev` | Mod+Alt+Shift+J | ✅ | ✅ | ✅ |
| `nav-month-next` | Mod+Alt+Shift+K | ✅ | ✅ | ✅ |
| `nav-picker-step` | Arrow keys in picker | ✅ | ✅ | 🟡 telemetry |
| `nav-today` | T (keyup) | ✅ | ✅ | ✅ |
| `nav-go-to-date` | Mod+G | ✅ | ✅ | ✅ |
| `nav-scroll-*` | PgUp/PgDn, Mod+↑/↓ | ✅ | ✅ | ✅ |
| `nav-day-view` | D | ✅ | ✅ | ✅ |
| `nav-week-view` | W | ✅ | ✅ | ✅ |
| `nav-life-view` | L | ✅ | ✅ | ✅ |
| Life prev/next/current | ←/→, H | ✅ | ✅ | ✅ |

### 3.2 Create

| ID | Binding | Status | Notes |
| --- | --- | --- | --- |
| `create-timed` | C (keyup) | ✅ | |
| `create-allday` | Shift+C | ✅ | Tip strip parity 🟡 |
| `create-place-timed` | Shift+arrows | ✅ | |
| `create-typed-time` | digits in draft | ✅ | |
| `create-place-discard` | Esc (secondary TZ) | ✅ | |

### 3.3 Focus

| ID | Binding | Status | Notes |
| --- | --- | --- | --- |
| `focus-sidebar` | I | ✅ | Month picker |
| `focus-event` | U | ✅ | `focusFirstCalendarEvent()` seeds nearest grid event |
| `focus-shift-hold` | F (+ digits) | 🟡 | Hold-F jump chips; not full web jump mode |
| `focus-week-day` | Shift+M… | 🟡 | Column select + first event; weekend S→U/A; digit hints after day pick ❌ |
| `focus-notice` | P | 🟡 | Subset of notices |
| `focus-calendar-digit` | 1–9 in list | ✅ | |
| `focus-page-jump` | Mod+digit (hold hints) | ✅ | |
| `focus-find-event` | Mod+K | ✅ | Palette search |

### 3.4 Edit / clipboard / menu

| ID | Status | Notes |
| --- | --- | --- |
| `edit-open` | ✅ | Enter / E sequence |
| `edit-save` | 🟡 | Mod+Enter works; save **button** teaches Enter only |
| `edit-delete` | ✅ | |
| `edit-duplicate` | ✅ | |
| `edit-copy` / `edit-paste` | ✅ | |
| `edit-hide` | ✅ | |
| `edit-menu` | ✅ | Context menu |
| Arrow move focus | ✅ | |
| Shift+Tab cycle edge | ✅ | |
| Undo/redo | ✅ | Palette rows + Cmd+Z |

### 3.5 Other

| ID | Binding | Status |
| --- | --- | --- |
| `other-palette` | Mod+K | ✅ |
| `other-shortcuts` | ? (Shift+/ menu) | ✅ |
| `other-settings` | Mod+, | ✅ |
| `other-sidebar` | ] | ✅ |
| `other-time-travel` | (TZ dialog) | ✅ |
| `other-subscribe` | B (trial) | ✅ |
| Edit sequence E→field | ✅ | Leader engine |
| Esc / Enter / Mod+Enter semantics | 🟡 | Per-surface audit in [shortcuts.md](../acceptance/shortcuts.md) |

### 3.6 Tab order & visible keycaps

| Item | Status |
| --- | --- |
| Tab order through form fields | 🟡 |
| Keycaps on view switcher, footer, welcome | ✅ |
| Keycaps on save bar, Up Next, palette rows | ❌ / 🟡 |
| Which-key overlay | ✅ |

---

## 4. Automated parity coverage

| Layer | Catches |
| --- | --- |
| `desktop:export --check` | Colors, shortcuts JSON, Swift ids, fixtures |
| `CompassKitTests` | Layout, keyboard registry, go-to-date, recurrence, HTML, Block Party |
| `CompassUI` unit | Time grid style, now cue timing, event card palette |
| `CompassUITests` | Launch, palette keyboard, form save, snapshots (macOS CI) |
| Web `theme-css.test.ts` | CSS ↔ TS color roles |

**Not automated today:** side-by-side screenshots web vs macOS (except recorded native snapshots), palette row inventory, MM.DD.YY, gradient now line.

---

## 5. Suggested fix sequence (PRs)

1. **Tokens + typography accessors** — full `NativeWebTheme` roles; stop inverted save bar; optional `NativeFocusRing` helper.
2. **Event form** — MM.DD.YY date chip, save bar layout, schedule section grouping.
3. **Command palette** — missing commands, fuzzy highlight, keycap chips, row chrome.
4. **Grid** — now line gradient/rim, now-cue timing/shimmer, all-day tip strip.
5. **Keyboard gaps** — `focus-event` (U), Shift+M week-day focus, palette undo/redo.
6. **Event form logistics card** — match web #4599: one FormCard for Location, Add Google Meet, Add guests; Description in the following FormCard (not nested mini-panels).

Each PR should link a child issue, include before/after screenshots (web Chromium + macOS snapshot or manual), label `agent-automerge`, and pass macOS workflow on GitHub runners.

---

## 6. Changelog

| Date | Change |
| --- | --- |
| 2026-10-19 | Initial audit checklist for #4331 dogfood gate |
| 2026-10-19 | §7 visual evidence table (web CI captures; macOS/compare pending runner) |
| 2026-10-19 | §7 updated from workflow run 39299882448 (macOS + compare artifacts) |
| 2026-10-19 | §5 queue: event form logistics grouping (web #4599); CI fixes on main (palette Range, e2e/parity shard) |
| 2026-10-19 | §7 from workflow run 39327804343 (#4607 branch): macOS capture + compare artifact; logistics card on event form |
| 2026-10-20 | Palette: web sections, rows, disabled state, keycap chips |
| 2026-10-20 | #4612 Sunday week + UTC on `main`; #4613 palette/sidebar/settings/onboarding batch; #4619 week grid gutter + pinned Sunday window |
| 2026-10-21 | Week grid: hold-Mod day header keycaps (⇧SU, ⇧M, ...) now render; the header control existed but the grid never used it (compare run 39597000570) |
| 2026-10-21 | Hold-Mod sidebar chips: month picker and Up next chips render, calendar list chip moved onto the list (compare run 39634795849) |
| 2026-10-21 | Per-account page-jump targets (web `calendar-account:` ids) |
| 2026-10-21 | Event jump chips use web day-prefix labels (W1, SU2) and digits after a day pick |

---

## 7. Visual parity evidence (1280×820, Light Beach, demo seed)

Automated captures: workflow `desktop-web-parity-screenshots.yml` (PR #4596). Compare artifact `desktop-parity-compare` pairs `web/` and `macos/` PNGs per surface.

| Surface | Web CI | macOS CI | Match | Diff notes (compare run 39331068008 on `main` post-#4607) |
| --- | --- | --- | --- | --- |
| Week grid | ✅ | ✅ | 🟡 | Capture uses macOS day view vs web week; demo events only on web shot; sidebar lacks web “Hold Mod jump targets” tip line |
| Mini-calendar | ✅ | ✅ | 🟡 | Selected-day ring OK; web shows selected-week wash + denser header type |
| Event form | ✅ | ✅ | 🟡 | Logistics card grouped (#4607); dates still locale steppers vs MM.DD.YY; save bar / Enter hint gaps |
| Command palette | ✅ | ✅ | 🟡 | Undo/redo rows on macOS; web still has Phosphor icons + more nav rows; native keycaps + inset ring improved |
| Settings | ✅ | ✅ | 🟡 | macOS sidebar shell vs web modal; accounts copy differs (anonymous seed) |
| Onboarding welcome | ✅ | ✅ | 🟡 | Copy aligned; footer keycap spacing differs |

**Keyboard / tips (non-screenshot):** Shift+weekday column jump wired; weekend Shift+S→U/A on macOS; digit jump after day pick wired (W1, SU2 chips); bare letters in jump mode still ❌ vs web `useShiftHoldEventHints`.

Re-run `desktop-web-parity-screenshots.yml` on `main` after each merged batch (#4612, #4613, …). Latest dispatch: workflow run 39348622389 (pre-#4612 merge baseline).
