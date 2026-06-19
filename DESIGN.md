---
name: Compass Calendar
description: A daily planner for minimalists. Organize your day and lock in.
colors:
  accent-primary: "#57c1ff"
  bg-primary: "#0d1017"
  bg-secondary: "#11151c"
  fg-primary: "#bfbdb5"
  fg-primary-dark: "#abb6bf8c"
  border-primary: "#46505c33"
  border-secondary: "#bfbdb5"
  event-selected: "#abb9c4"
  menu-bg: "#fafafa"
  panel-text: "#fafafa"
  text-lighter: "#ffffff"
  text-dark: "#0d1017"
  text-dark-placeholder: "#6b7178e6"
  status-success: "#81d963"
  status-error: "#d95959"
  status-warning: "#ff9142"
  status-info: "#57c1ff"
  tag-work: "#aed3e0"
  tag-relations: "#86d0bb"
  tag-self: "#9fb0bf"
  tag-unassigned: "#8293a1"
  gradient-accent-end: "#aed3e0"
typography:
  display:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  title:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  script:
    fontFamily: "Caveat, cursive"
    fontSize: "1.6rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  sm: "2px"
  default: "4px"
  md: "6px"
spacing:
  xs: "4px"
  s: "8px"
  m: "16px"
  l: "24px"
  xl: "32px"
components:
  button-priority:
    backgroundColor: "{colors.tag-unassigned}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
  button-priority-hover:
    backgroundColor: "{colors.bg-primary}"
    textColor: "{colors.accent-primary}"
  input-default:
    backgroundColor: "{colors.menu-bg}"
    textColor: "{colors.text-dark}"
    height: "34px"
    padding: "0 8px"
  input-hover:
    backgroundColor: "{colors.border-primary}"
---

# Design System: Compass Calendar

## 1. Overview

**Creative North Star: "The Dark Calendar Canvas, One Accent"**

Compass is a near-black blue canvas where the only truly saturated color is a single sky-blue accent (`#57c1ff`). Everything structural, the grid lines, panels, borders, and most text, lives in a narrow blue-gray band against a deep `#0d1017` background. Color enters the screen only where it carries meaning: the accent marks selection and primary actions, and a small set of muted priority colors (work, relations, self, unassigned) tints the event blocks themselves. The interface is dim and low-contrast at rest so the user's events and current task are the brightest things on screen.

This is a planning tool for people who want the calendar to get out of the way. Density is welcome where it serves the task (a full week of events, a packed sidebar), but chrome is kept quiet: no borders until you interact, no decorative fills, no second accent competing for attention. The one deliberately human note is handwriting: the Caveat script font is a personal touch at the margin of an otherwise precise instrument.

What this system rejects: the cluttered toolbars and nested menus of Google/Outlook Calendar; the neutral-gray card grids and stock radii of a generic shadcn or SaaS dashboard; playful candy colors and mascots; and heavy navy-and-gray corporate density. Compass owns its dark, blue-accented identity rather than reaching for any of those defaults.

**Key Characteristics:**

- Deep blue-black surface (`#0d1017`), built up by tonal layering, not boxes.
- Exactly one bright accent (`#57c1ff`); meaning, not decoration.
- Muted priority colors are the only other saturation, and only on events.
- Quiet, borderless controls that reveal themselves on hover/focus.
- One UI typeface (Rubik), with Caveat handwriting as a single human accent.

## 2. Colors

A monochrome blue-gray system on a near-black base, punctuated by one sky-blue accent and a muted priority palette reserved for event content.

### Primary

- **Sky Accent** (`#57c1ff`, `hsl(202 100 67)`): The single saturated color. Used for the current selection, primary actions, links, info status, and the first tag color. It is the brightest, most attention-pulling element on any screen; that scarcity is the point.

### Secondary

- **Soft Cyan** (`#aed3e0`, `hsl(196 45 78)`): The light end of the accent gradient (`accent-primary → soft-cyan`) and the Work priority tint. A calmer companion to the sky accent, never used as a competing focal point.

### Tertiary (priority palette, events only)

- **Relations Teal** (`#86d0bb`, `hsl(163 44 67)`): The Relations priority color on event blocks.
- **Self Blue-Gray** (`#9fb0bf`, `hsl(205 36 62)`): The Self priority color.
- **Unassigned Slate** (`#8293a1`, `hsl(207 14 57)`): The default/unassigned priority color.

### Neutral

- **Canvas** (`#0d1017`, `hsl(222 28 7)`): The body background and the darkest surface. Also the text color on light/colored fills (`text-dark`).
- **Raised Canvas** (`#11151c`, `hsl(218 24 9)`): One step up in lightness; secondary surfaces and raised panels. Depth comes from this lightness step, not from boxes.
- **UI Text** (`#bfbdb5`, `hsl(47 7 73)`): The primary foreground; a faintly warm light gray for body and label text on dark surfaces. Also the secondary border color.
- **Muted Text** (`hsl(208 13 71 / 54.9%)`): Inactive/secondary text and the dimmed foreground. Translucent so it sits down into the surface.
- **Hairline** (`hsl(219 18 34 / 20%)`): Grid lines and primary borders. Barely-there separators that structure the grid without drawing attention.
- **Menu Surface** (`#fafafa`, `hsl(0 0 98)`): The one inverted surface; the light background used for the command palette / menu, where `text-dark` and `text-dark-placeholder` apply.

### Status

- **Success** (`#81d963`), **Error** (`#d95959`), **Warning** (`#ff9142`), **Info** (`#57c1ff`, the accent). State signals only.

### Named Rules

**The One Accent Rule.** Exactly one saturated accent (`#57c1ff`) on any screen, reserved for selection, primary action, and info. If a second saturated hue appears anywhere outside an event block or a status signal, it is wrong.

**The Color-Means-Something Rule.** Saturation is forbidden as decoration. The accent means "selected / primary / info"; priority colors mean "this event's category"; status colors mean "this state." Structural chrome stays in the blue-gray band.

## 3. Typography

**Body / UI Font:** Rubik (with `ui-sans-serif, system-ui, sans-serif` fallback)
**Script Accent Font:** Caveat (with `cursive` fallback)
**Mono:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas` (system stack; no custom mono shipped)

**Character:** One humanist sans (Rubik) carries the entire UI, headings through data, with weight and size doing the hierarchy work. The only departure is Caveat, a casual handwriting face used as a deliberate human accent on the Dedication, never for UI chrome.

### Hierarchy

The scale is a fixed rem ramp (product UI, not fluid display type). Steps: `xs 0.563rem`, `s 0.688rem`, `m 0.8125rem`, `l 1rem`, `xl 1.125rem`, `xxl 1.3rem`, `xxxl 1.6rem`, `4xl 1.7rem`, `5xl 2rem`. Weights: light 300, regular 400, medium 500, bold 700, extraBold 900.

- **Display** (Rubik, 700, `2rem`/5xl): The largest headings; view titles and prominent moments. Top of the ramp; used sparingly.
- **Title** (Rubik, 500, `1.3rem`/xxl): Section and panel headings.
- **Body** (Rubik, 400, `1rem`/l): Default reading and input text. Cap prose at 65–75ch.
- **Label** (Rubik, 500, `0.8125rem`/m): Dense UI labels, event titles, controls. The workhorse size for the calendar grid.
- **Micro** (Rubik, 400, `0.563–0.688rem`/xs–s): Timestamps, axis labels, secondary metadata.
- **Script** (Caveat, 400, `1.6rem`+): The Dedication only.

### Named Rules

**The One Voice Rule.** Rubik is the only UI typeface. Display fonts in labels, buttons, or data are forbidden. Caveat is the single sanctioned exception and only on the Dedication.

**The No All-Caps Body Rule.** Uppercase is reserved for short labels and badges (≤4 words). No sentences in all caps.

## 4. Elevation

Depth is conveyed two ways, in order of priority. **First, tonal layering:** surfaces stack by stepping lightness within the near-black blue band (`bg-primary #0d1017` → `bg-secondary #11151c` → translucent panel fills like `panel-bg hsl(219 8 46 / 20%)`). A higher surface is a slightly lighter blue, not a boxed-and-shadowed card. **Second, shadow reserved for state and floating layers:** drop shadows are not a resting decoration; they appear when an element leaves the plane, hover, focus, an active drag/resize Interaction Overlay, or a menu/overlay panel that floats above the grid. The default shadow is a soft `hsla(0 0 0 / 25%)`.

### Shadow Vocabulary

- **State lift** (`box-shadow` with `hsla(0 0 0 / 25%)`): Applied on hover/focus and during drag or resize to signal the element is now interactive or in motion.
- **Floating panel** (`panel-shadow hsl(221 9 37)`): Separates overlays, menus, and the command palette from the grid beneath.

### Named Rules

**The Layer-By-Light Rule.** Build depth by stepping surface lightness, not by drawing borders or dropping shadows on resting elements. A raised surface is a lighter blue.

**The Shadow-Is-State Rule.** A shadow at rest is a bug. Shadows appear only on hover, focus, active drag/resize, or for layers that genuinely float above the grid (menus, overlays, the command palette).

## 5. Components

Controls are quiet, borderless, and hover-revealing: they sit flush on their surface with no resting border and announce themselves through a background or color shift on interaction. Radii are small (2–6px). Transitions are short (≈0.3s).

### Buttons

- **Shape:** Small radius (`2px` for priority buttons, `4px` default).
- **Priority button:** Background is the priority color (darkened at rest); `text-dark` (`#0d1017`) label; `min-width` ~158px; `padding: 0 8px`. Disabled drops to `opacity: 0.5` and `pointer-events: none`.
- **Hover:** Background shifts to `bg-primary` and the label color brightens toward the priority color (`brighten()`); ~0.5s color transition. This hover-reveal is the signature button behavior.
- **Focus:** A `2px solid` dark border (`border-primary-dark`) appears on focus, the one place a border is added intentionally.

### Inputs / Fields

- **Style:** No border, no resting outline; `height: 34px`; `padding: 0 8px`; `l`/`1rem` font size; background set by context (light `menu-bg` in the palette, surface-matched elsewhere).
- **Placeholder:** `text-dark-placeholder` (`hsl(219 8 46 / 90.2%)`) on light fields.
- **Hover:** Background shifts to `border-primary`; the field reveals itself rather than carrying a permanent box.
- **Focus:** `outline: none` globally; focus is conveyed by context (selection state, surrounding chrome), consistent with the quiet-control philosophy.

### Tags / Priority Chips

- **Style:** Filled with the muted priority color (Work soft-cyan, Relations teal, Self blue-gray, Unassigned slate); `text-dark` label.
- **State:** Hover brightens the fill via `brighten()`. Used to categorize events; never as decorative accents elsewhere.

### Navigation / Planner Sidebar

- **Style:** A translucent panel (`panel-bg`) layered over the canvas by lightness, holding navigation, account context, and Someday Events. Text is `panel-text` (`#fafafa`). Custom thin scrollbars are transparent until hover (`compass-scroll`).

### Calendar Grid (signature surface)

- **Grid lines:** `grid-line-primary` hairlines (`hsl(219 18 34 / 20%)`) structure the Timed Grid without visual weight.
- **Events:** Priority-colored blocks are the brightest content on the canvas. A selected event uses `event-selected` (`#abb9c4`). During drag/resize, an Interaction Overlay carries a state shadow while the source element either dims (`dim-source`) or hides (`hide-source`).

### Command Palette

- **Style:** A floating light surface (`menu-bg #fafafa`) with `text-dark`, lifted above the dark canvas by a panel shadow. Keyboard-first; the primary navigation path.

### Handwritten  Dedication (signature)

- **Style:** Caveat script (`"Caveat", cursive`) at display size. The single human, informal touch in an otherwise precise system; a note-to-self pinned to the week.

## 6. Do's and Don'ts

### Do

- **Do** keep exactly one saturated accent (`#57c1ff`) per screen, for selection, primary action, and info only.
- **Do** build depth by stepping surface lightness (`#0d1017` → `#11151c` → translucent panels), per the Layer-By-Light Rule.
- **Do** leave controls borderless at rest and reveal them via background/color shift on hover and focus.
- **Do** reserve priority colors (Work/Relations/Self/Unassigned) for event blocks and tags, not chrome.
- **Do** carry all UI in Rubik, using weight (400/500/700) and the fixed rem scale for hierarchy.
- **Do** confine Caveat handwriting to the Dedication.
- **Do** hold body/label text to WCAG AA contrast against the dark surfaces; bump muted blue-grays toward `fg-primary` when contrast is close.

### Don't

- **Don't** rebuild the cluttered toolbars, nested menus, or busy chrome of Google/Outlook Calendar.
- **Don't** fall into the generic shadcn look: neutral-gray cards, stock radii and shadows, the interchangeable component-library surface. Compass is dark and blue-accented on purpose.
- **Don't** ship a generic SaaS dashboard: card grids, hero-metric templates, or gradient accents standing in for design.
- **Don't** introduce playful/consumer-cute candy colors, mascots, or heavy illustration; or enterprise navy-and-gray corporate density.
- **Don't** add a second saturated accent, or use the accent decoratively where it carries no meaning.
- **Don't** put a shadow on a resting element; shadows are state (hover/focus/drag) or floating layers only.
- **Don't** use display or handwriting fonts for UI labels, buttons, or data.
- **Don't** add resting borders to inputs or buttons; the focus border is the one intentional exception.
