# Day Drag Form Lifecycle Design

## Problem

After a saved event is successfully moved in Day view, its event form can reopen and leave a `gridClick` draft in Redux. That draft survives route navigation, so Week view consumes it as a request to open the form.

## Required behavior

- A drag that changes an event saves the moved event immediately.
- A successful moved drag leaves no event form open and no active event draft.
- This behavior is the same whether or not the form was open before the drag.
- A pointer press and release that does not move the event remains a click and opens the event form.
- Existing pending-event and resize behavior remains unchanged except that a successful resize follows the same no-reopen rule as other saved-event motion.

## Design

Handle the lifecycle at the Day interaction commit boundary. For any saved-event motion result with `hasMoved: true`, close the floating form, discard the Redux draft, and submit the event update. Do not branch on `hadFormOpenBeforeInteraction` after motion has committed.

Retain the existing `hasMoved: false` path, which opens the clicked event for editing. Retain motion activation behavior that closes a form while the pointer is moving, preventing the form from obscuring the interaction.

This source-level fix is preferred over route-specific cleanup because the requirement is that a successful drag must not reopen the form anywhere, not only after navigation to Week view. It also avoids adding view-ownership metadata to draft state for a single lifecycle rule.

## Testing

Update the Day interaction coordinator regression coverage to prove:

1. A moved drag with an initially open form dispatches the event update and leaves the form closed with no active draft.
2. A moved drag with no initially open form continues to update without opening a form.
3. A no-movement pointer interaction still opens the event form.

Run the focused Day interaction tests first, then the affected web test suite, React quality checks, type-check, and lint before publishing the PR.
