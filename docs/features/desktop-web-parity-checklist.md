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

---

## 2. Surfaces

### 2.1 Week / day time grid

| Item | Status | Notes |
| --- | --- | --- |
| Deck layout / card frames | ✅ | Shared fixtures, `GridLayoutSnapshotTests` |
| All-day row above timed scroll | ✅ | `TimeGridView.renderAllDayColumns` |
| Now line position | ✅ | Shared now math |
| Now line **visual** (gradient + 1px rim) | ❌ | Web: `accentGradient` + `c-now-line-rim`; macOS: solid 2px accent |
| Now-cue pulse on **`t`** (today) | 🟡 | Web 700ms pulse + label shimmer; macOS 700ms header flag, 350ms line animation, shimmer partial on day view |
| Click grid teaches shortcut | ✅ | Pointer hint overlay |
| Day column header focus | 🟡 | AppKit exterior ring vs web `c-focus-ring` |
| Shift+C all-day tip strip | 🟡 | Verify animation + copy vs web `useShiftHoldEventHints` all-day path |

### 2.2 Event chips

| Item | Status | Notes |
| --- | --- | --- |
| Timed / all-day card shell | ✅ | `EventCardView`, palette tests |
| Jump / hold-F digit hints | ✅ | `eventJumpHold`, chips overlay |
| Shift+M weekday column jump | ❌ | Web `useShiftHoldEventHints.ts`; macOS not wired (`focus-week-day`) |
| Sidebar edit ring | 🟡 | Inset focus layer vs web outline |

### 2.3 Sidebar event form

| Item | Status | Notes |
| --- | --- | --- |
| Replaces sidebar body while open | ✅ | `EventFormView` in `RootView` |
| Date field **MM.DD.YY** closed display | ❌ | Web `EventFormDateField.tsx`; macOS `DatePicker` locale format |
| Datepicker open Enter/Space/ArrowDown | 🟡 | Audit `EventFormScheduleSection.swift` vs web |
| Time pickers | 🟡 | Visual parity pass needed |
| Location / Meet / guests grouping | 🟡 | Sections exist; spacing/dividers vs web `FormCard` |
| Save bar: accent fill, on-accent text, space-between, **⌘Enter** hint | ❌ | Web `SaveSection.tsx` + `c-button-save-bar`; macOS inverted text/background + Enter chip only |
| Mod+digit field jump + hold-Mod chips | ✅ | `ModHoldChipsOverlay`, layout snapshots |
| Sticky form actions row (icons + shortcuts) | 🟡 | Web `FormActionsRow.tsx`; macOS `EventFormToolbarView` SF Symbols, fewer keycaps |

### 2.4 Mini-calendar (month picker)

| Item | Status | Notes |
| --- | --- | --- |
| Keyboard `i`, arrows, Enter | ✅ | |
| Cmd+Shift+, / . month jump | ✅ | |
| Selected range / today styling | 🟡 | Custom grid vs web react-datepicker theme |
| Weekday header 10px muted | 🟡 | Rubik 10 in `SidebarMonthPicker.swift` |

### 2.5 Up Next / Now panel

| Item | Status | Notes |
| --- | --- | --- |
| Projection + join URL | ✅ | |
| `N` / `V` shortcuts | ✅ | Registry + router |
| Shortcut hint on card (N/V keycaps) | ❌ | Web `UpNextCard.tsx` |
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
| Meeting nudge, connect prompts, first-event | ❌ | Web-only notices in many cases |
| Status toasts | 🟡 | `StatusToastOverlay` vs web toast stack |
| Focus latest notice **`p`** | 🟡 | Native subset of notices |

### 2.10 Command palette

| Item | Status | Notes |
| --- | --- | --- |
| Placeholder copy | ✅ | Same string |
| Go-to-date from query | ✅ | Shared parsing fixtures |
| Navigation / create / events / recent | ✅ | |
| Fuzzy search + highlight | ❌ | Web `HighlightedLabel` + `filterSections` |
| Row icons (Phosphor) | ❌ | Plain text rows |
| Keycaps (`ShortcutKeys`) | 🟡 | Plain shortcut strings, not `KeycapGlyphs` chips |
| Selected row ring inset | 🟡 | Web `ring-accent ring-inset`; macOS fill tint |
| **Missing rows** vs web | ❌ | Undo/redo, theme, timezone, notifications, booking, feedback, onboarding URL, meeting page, accounts shortcuts, demo events, shortcut tips hooks (`CommandPalette.tsx` vs `CommandPaletteCatalog.swift`) |
| Footer hint | 🟡 | Text arrows vs web keycaps |

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
| `nav-month-prev` | Mod+Shift+, | ✅ | ✅ | ✅ |
| `nav-month-next` | Mod+Shift+. | ✅ | ✅ | ✅ |
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
| `focus-event` | U | ❌ | Dispatched but `handleShortcut` no-op; web `onFocusCalendar` / seed focus |
| `focus-shift-hold` | F (+ digits) | 🟡 | Hold-F jump chips; not full web jump mode |
| `focus-week-day` | Shift+M… | ❌ | Web column state machine missing |
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
| Undo/redo | ✅ | Not in palette on macOS |

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

Each PR should link a child issue, include before/after screenshots (web Chromium + macOS snapshot or manual), label `agent-automerge`, and pass macOS workflow on GitHub runners.

---

## 6. Changelog

| Date | Change |
| --- | --- |
| 2026-10-19 | Initial audit checklist for #4331 dogfood gate |
