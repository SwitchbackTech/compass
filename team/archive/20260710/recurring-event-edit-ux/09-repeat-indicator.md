# Slice 9: Add the Repeat Indicator

## Goal

Show a subtle repeat icon on recurring event cards when space permits, consistently in day and week views.

## Placement

Implement in the shared components:

- `CalendarTimedEventCard.tsx`
- `CalendarAllDayEventCard.tsx`

This automatically covers day and week and avoids duplicated view-specific rendering.

## Recurring predicate

An event is recurring when either is present:

- `event.recurrence?.eventId`
- a non-empty `event.recurrence?.rule`

Use an existing core/web event predicate if one already expresses this exact intent. Otherwise add a small local predicate near the shared cards; do not create a broad event utility for one call site.

## Display rules

- Never show on placeholders.
- Show on saved and active-draft recurring events when dimensions allow.
- Timed cards: place at bottom-left, clear of the title, time label, and resize handles.
- All-day cards: use the compact trailing/bottom placement that preserves title ellipsis and horizontal resize handles.
- Define named minimum width/height constants and cover their boundary behavior.
- Reserve layout space only while the icon is visible.

Use the repository's existing icon set and semantic Tailwind colors. Avoid a new dependency or raw color value.

## Accessibility

The icon is decorative and should be `aria-hidden`. Add “Recurring event” to the card's accessible label or description so the information is not visual-only. Do not use the icon as a focus target or tooltip trigger.

Suggested accessible names:

- `Recurring event: Team sync, 9:00 AM to 10:00 AM`
- `Recurring all-day event: Vacation`

Preserve existing event-card keyboard behavior.

## Tests

- Recurring timed and all-day events render the icon.
- Standalone events and placeholders do not.
- Small/narrow cards suppress it at defined thresholds.
- Day and week consumers receive behavior through shared cards.
- Accessible names communicate recurrence without inspecting SVG markup.
- Title/time content remains present and correctly truncated.

## Acceptance criteria

- The repeat indicator appears in both calendar views without consumer changes.
- It never overlaps labels or resize controls at supported sizes.
- Recurrence is exposed to screen readers.
- Tests use role/name/text queries rather than CSS or `data-*` selectors.
- Styling uses canonical Tailwind utilities and semantic colors.

## Non-goals

- Making the icon interactive.
- Adding recurrence details or tooltips.
- Changing recurring-event colors.

