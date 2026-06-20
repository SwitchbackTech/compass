# Event Form Description Actions Row

## Problem

The regular and Someday event forms render their actions menu in a standalone
row above the form fields. The description is rendered later as a standalone
field. This separates controls that should share one row and leaves the actions
menu dots above the description.

## Design

Add a small shared `DescriptionActionsRow` component for the two event forms.
It renders the description as the first child and the actions menu as the
second child. The row uses flex layout, allows the description to consume the
remaining width, and keeps the actions menu aligned at the right edge.

Both `EventForm` and `SomedayEventForm` will remove their standalone action row
and wrap their existing description and action-menu components with the shared
row. Existing event behavior, callbacks, menu contents, field styling, and
keyboard handling remain unchanged.

## Testing

Add focused regression coverage proving that the shared row preserves the
description-first DOM order and right-side actions layout. Cover both regular
and Someday form integration so either form cannot accidentally restore the
standalone menu row. Run the focused web tests, type checking, lint, and the
React diff audit.

## Scope

This change only repairs the description/actions layout. It does not redesign
other form rows or alter menu and description behavior.
