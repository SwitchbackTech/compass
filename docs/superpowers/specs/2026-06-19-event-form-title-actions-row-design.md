# Event Form Title Actions Row

## Problem

The regular and Someday event forms render their actions menu separately from
the title. This separates controls that should share the first form row.

## Design

Add a small shared `TitleActionsRow` component for the two event forms. It
renders the title as the first child and the actions menu as the second child.
The row uses flex layout, allows the title to consume the remaining width, and
keeps the actions menu aligned at the right edge.

Both `EventForm` and `SomedayEventForm` wrap their existing title and
action-menu components with the shared row. Descriptions remain standalone.
Existing event behavior, callbacks, menu contents, field styling, and keyboard
handling remain unchanged.

## Testing

Add focused regression coverage proving that the shared row preserves the
title-first DOM order and right-side actions layout. Cover both regular and
Someday form integration so either form cannot accidentally restore the
standalone menu row. Run the focused web tests, type checking, lint, and the
React diff audit.

## Scope

This change only repairs the title/actions layout. It does not redesign other
form rows or alter menu and description behavior.
