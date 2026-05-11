---
name: Compass Calendar
description: A quiet, fast calendar and task system for focused daily planning.
colors:
  accent-primary: "#57c1ff"
  accent-soft: "#aed3e0"
  bg-primary: "#0d1017"
  bg-secondary: "#11151c"
  panel-bg: "#6c727f33"
  grid-line-primary: "#47526633"
  border-primary: "#47526633"
  border-primary-dark: "#00000080"
  text-light: "#bfbdb5"
  text-lighter: "#ffffff"
  text-light-inactive: "#abb6bf8c"
  text-dark: "#0d1017"
  text-dark-placeholder: "#6c727fe6"
  menu-bg: "#fafafa"
  panel-scrollbar-active: "#565b67"
  status-success: "#81d963"
  status-error: "#d95959"
  status-warning: "#ff9142"
  tag-work: "#aed3e0"
  tag-relations: "#86d0bb"
  tag-self: "#7ba4c1"
  tag-unspecified: "#8293a1"
typography:
  display:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.7rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "normal"
  title:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  xs: "2px"
  default: "4px"
  lg: "8px"
  xl: "12px"
  full: "999px"
spacing:
  xs: "4px"
  s: "8px"
  m: "16px"
  l: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.text-dark}"
    typography: "{typography.body}"
    rounded: "{rounded.default}"
    padding: "8px 32px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-light}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.text-lighter}"
    typography: "{typography.body}"
    rounded: "{rounded.default}"
    padding: "0 8px"
    height: "34px"
  panel:
    backgroundColor: "{colors.panel-bg}"
    textColor: "{colors.text-lighter}"
    rounded: "{rounded.default}"
    padding: "16px"
---

# Design System: Compass Calendar

## 1. Overview

**Creative North Star: "Quiet Instrument"**

Compass should feel like a precise instrument kept on a working desk: dark,
quiet, responsive, and always ready. The interface is intentionally restrained
because the user's attention belongs on the day, the week, and the next action,
not on the product calling attention to itself.

The system is dense enough for real planning, but it should never feel cramped
or corporate. Panels, calendar grids, command surfaces, and form controls should
favor quick scanning, low motion, and stable placement. The visual language
rejects bloated productivity suites, gamified habit apps, corporate SaaS
dashboards, and slow calendar clones packed with secondary features.

**Key Characteristics:**

- Dark, low-glare surfaces built for long planning sessions.
- One clear blue accent used for action, focus, and current selection.
- Compact type and small radii that keep the calendar feeling fast.
- Flat surfaces with tonal layering before shadows.
- Keyboard-first affordances with visible focus states.

## 2. Colors

The palette is a dark blue-black planning surface, muted warm-gray text, and a
single clear sky-blue accent for interaction.

### Primary

- **Instrument Blue**: The primary action and focus color. Use it for selected
  dates, add buttons, focus rings, current activity, and sparse confirmation
  moments.

### Secondary

- **Soft Signal Blue**: A lighter supporting blue used in gradients, priority
  tags, and quiet hover cues. It should support Instrument Blue, never compete
  with it.
- **Task Teal**: A restrained tag color for relation-focused work and low-volume
  categorization.
- **Task Slate**: Muted blue-gray priority colors for task and event categories.

### Tertiary

- **Status Green, Status Amber, Status Red**: Functional status colors only.
  Use them for success, warning, and error states, not decoration.

### Neutral

- **Midnight Canvas**: The main app background. It anchors the week and day
  views and should remain the dominant color.
- **Deep Panel**: Secondary background for overlays, menus, and focused panels.
- **Smoke Panel**: The translucent sidebar and panel layer. It separates
  planning tools without creating heavy cards.
- **Warm Ash Text**: Primary body and interface text on dark surfaces.
- **Chalk Text**: High-emphasis text for headings, active labels, and selected
  states.
- **Muted Blue-Gray**: Inactive text, placeholders, borders, grid lines, and
  scrollbars.

### Named Rules

**The One Signal Rule.** Instrument Blue is the only everyday accent. If a screen
needs more than one attention color, the hierarchy is unclear.

**The Dark Surface Rule.** The calendar lives on Midnight Canvas. New surfaces
should layer with Deep Panel or Smoke Panel, not introduce new background
families.

## 3. Typography

**Display Font:** Rubik, with system sans fallback
**Body Font:** Rubik, with system sans fallback
**Label/Mono Font:** System monospace only where code-like alignment is needed

**Character:** Rubik gives Compass a soft technical voice: approachable enough
for daily planning, compact enough for dense calendar work. The system uses
scale and weight sparingly so hierarchy stays calm.

### Hierarchy

- **Display** (600, 2rem, 1.1): Rarely used. Reserve for focused task text,
  major empty states, or small standalone gates.
- **Headline** (600, 1.7rem, 1.15): Section-level emphasis in focused views and
  important overlays.
- **Title** (500, 1.125rem, 1.25): Sidebar section titles, modal headings, and
  major form labels.
- **Body** (400, 1rem, 1.5): Primary readable text, form content, messages, and
  mobile-gate copy. Keep longer text to 65-75 characters per line.
- **Label** (500, 0.8125rem, 1.2): Calendar labels, menu items, compact controls,
  shortcuts, and task metadata.

### Named Rules

**The Calendar Density Rule.** Use small type intentionally in grids, menus, and
sidebar lists. Increase size only when the user is in a focus surface, not as a
default polish move.

**The No Decorative Type Rule.** Do not add display fonts or novelty lettering to
the product shell. Personal touches can exist in isolated moments, not in core
planning controls.

## 4. Elevation

Compass is flat by default and uses depth as a state cue. Most separation comes
from tonal layering, borders, translucency, and grid lines. Shadows are reserved
for floating menus, forms, previews, dialogs, and overlays that need to sit above
the calendar without hiding the user's place.

### Shadow Vocabulary

- **Floating Menu** (`0px 4px 6px rgba(0, 0, 0, 0.25)`): Context menus and
  dropdowns that need a light lift above dense surfaces.
- **Floating Form** (`0px 5px 5px rgba(0, 0, 0, 0.25)`): Event forms and edit
  surfaces that sit over calendar content.
- **Modal Lift**
  (`0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)`):
  Centered confirmation and status panels.
- **Soft Preview** (`shadow-lg`): Event previews, popovers, and temporary
  inspection surfaces.

### Named Rules

**The Flat Until Floating Rule.** Resting surfaces are flat. A shadow means the
surface is temporary, interactive, or above the calendar layer.

## 5. Components

### Buttons

- **Shape:** Small, practical corners (4px) for rectangular buttons; full circles
  for icon-only controls.
- **Primary:** Instrument Blue background with dark text for decisive actions.
  Minimum interactive height should be 44px where touch or isolated use is
  likely.
- **Hover / Focus:** Hover uses opacity, brightness, or a quiet background fill.
  Focus uses a clear 2px ring in Instrument Blue or a dark focus ring on light
  event surfaces.
- **Ghost:** Transparent at rest, Warm Ash Text, and tonal hover fills. Ghost
  controls are common in headers and dense planning surfaces.

### Chips

- **Style:** Use compact rounded rectangles or small circles for category and
  priority selection.
- **State:** Selected state fills with the category color; unselected state uses
  a border or muted background. Never use chips as decorative badges.

### Cards / Containers

- **Corner Style:** Default radius is 4px. Larger 8px or 12px radius is allowed
  only for modal, preview, or empty-state panels.
- **Background:** Use Midnight Canvas, Deep Panel, or Smoke Panel. Avoid generic
  card grids.
- **Shadow Strategy:** Follow the Flat Until Floating Rule.
- **Border:** Use faint blue-gray borders for separation. Borders should be full
  outlines or grid lines, not colored side stripes.
- **Internal Padding:** Dense surfaces use 8-16px. Isolated overlays use 24-32px.

### Inputs / Fields

- **Style:** Transparent or tonal backgrounds, no heavy borders, 4px radius.
- **Focus:** Use visible rings or tonal shifts. Inputs must remain keyboard
  obvious.
- **Error / Disabled:** Disabled controls reduce opacity and cursor affordance.
  Error states use Status Red only where the user can act on the problem.

### Navigation

- **Style:** View switching is compact and text-led, with shortcuts nearby where
  useful. Active view state may use Warm Ash Text on dark surfaces or inverted
  dark text on Warm Ash selection.
- **Hover / Active:** Use subtle tonal fills, not animated layout shifts.
- **Mobile:** The current product gates mobile rather than adapting the full
  calendar. Mobile messaging should remain direct and small, not a marketing
  page.

### Planner Sidebar

The Planner Sidebar is a planning workbench, not a card. It uses a fixed compact
width, Smoke Panel background, internal vertical rhythm, and quiet text. It
should stay stable while the main calendar changes.

### Calendar Grid

The calendar grid is the product's main instrument. Grid lines stay faint, event
blocks stay compact, and interaction states must be legible without changing the
overall layout.

## 6. Do's and Don'ts

### Do:

- **Do** keep new app surfaces grounded in Midnight Canvas, Deep Panel, and Smoke
  Panel.
- **Do** use Instrument Blue for current selection, focus, and primary action.
- **Do** preserve compact calendar density with stable dimensions and small
  type.
- **Do** make keyboard focus visible on every actionable control.
- **Do** use semantic Tailwind color tokens from `packages/web/src/index.css`.
- **Do** treat local-first and no-account flows as first-class states.

### Don't:

- **Don't** make Compass feel like a bloated productivity suite.
- **Don't** make Compass feel like a gamified habit app.
- **Don't** make Compass feel like a corporate SaaS dashboard.
- **Don't** make Compass feel like a slow calendar clone packed with secondary
  features.
- **Don't** add marketing-heavy product surfaces inside the app.
- **Don't** use decorative complexity, glassmorphism, generic card grids, hero
  metrics, or colored side-stripe borders.
- **Don't** add gradient text. Existing legacy helpers should not become a new
  pattern.
- **Don't** introduce raw colors for new styling when a semantic token exists.
