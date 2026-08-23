# Contextual Pointer Guidance

Blocked pointer clicks teach the keyboard path for the clicked control instead
of a generic legend. Acceptance coverage lives in
[Shortcuts](../acceptance/shortcuts.md#scenario-13-the-mouse-is-permanently-inert).

## How it works

1. Interactive targets opt in with `data-pointer-action` (and
   `data-pointer-event-id` for a specific event).
2. Capture-phase suppression resolves the nearest annotated ancestor in
   `composedPath()` and stores that attempt on the pointer-block store.
3. `PointerHint` renders copy for the attempt. Sidebar open/close teach `]`.
   Event open teaches the current jump token plus Enter, or `S` if no token is
   available.
4. A primary event click also dispatches `compass:pointer-event-jump` so the
   mounted grid's event-jump owner can assign tokens and activate leaderless
   sequences. Right-clicks stay on the generic fallback so `M` still opens
   the context menu.

Unannotated controls keep the generic keyboard-only fallback.

## Adding a target

- Add a `POINTER_ACTIONS` id.
- Annotate the interactive element, not an inner icon.
- Teach that id in `PointerHint`.
- Keep the shown shortcut executable from the current view and lock state.
