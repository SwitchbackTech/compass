# Inline Event Form Styles

## Problem

The global `c-event-form`, `c-event-form-title`, and
`c-event-form-description` utilities each style only the regular and Someday
event forms. They hide straightforward Tailwind semantics in `index.css` and
make local form styling harder to read.

## Design

Delete the three global utilities and inline their Tailwind classes at both
form call sites. Preserve the current visual behavior, including the dynamic
form background and shadow tokens, title typography and hover state, and
description transitions and hover treatment.

Use semantic Tailwind colors where available. Keep arbitrary CSS-variable
values only where the existing design token has no direct utility. Replace the
description's calculated width with `w-full`, which matches its role as the
standalone description field.

Do not add shared class constants or another wrapper component. The explicit
local class strings are the purpose of this refactor. Preserve the existing
uncommitted removal of `role="form"` from `EventForm`.

## Testing

Update the form Tailwind source test first so it requires the three global
utilities to be absent and the relevant local classes to exist in both forms.
Run the focused source test, the full web suite, type checking, lint, and React
Doctor.

## Scope

This refactor changes style ownership only. It does not alter form behavior,
field order, actions, or event data handling.
