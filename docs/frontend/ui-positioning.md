# UI Positioning Conventions

How Compass positions floating and anchored UI. Follow this when adding tooltips,
popovers, menus, or any element that floats next to an anchor.

## Default: `@floating-ui/react`

Use [`@floating-ui/react`](https://floating-ui.com/docs/react) (already a dependency) for
all anchored/floating UI. **Do not hand-roll positioning** with `getBoundingClientRect` +
`position: absolute/fixed` math — floating-ui already handles flipping, shifting,
collision, and auto-updates, and hand-rolled versions drift out of sync.

Use it for:

- Tooltips
- Popovers
- Select menus, comboboxes, dropdown menus
- Context menus (anchor to a virtual element at the cursor)
- Floating forms / anchored panels

The codebase is already fully on floating-ui — study these before writing new positioning:

- Tooltips: `packages/web/src/components/Tooltip/useTooltip.ts`, `Tooltip.tsx`
- Context menus (virtual-element-at-cursor): `packages/web/src/components/ContextMenu/`
- View switcher select: `packages/web/src/components/SelectView/SelectView.tsx`
- Sophisticated floating forms (conditional offset/flip/shift/hide):
  `packages/web/src/views/Forms/hooks/useEventForm.ts`
- List-navigable menus: `packages/web/src/views/Forms/ActionsMenu/ActionsMenu.tsx`
- Command palette (`FloatingOverlay`/`FloatingPortal`): `packages/web/src/components/CommandPalette/CommandPalette.tsx`

Shared conventions:

- Render floating content through `FloatingPortal` for correct stacking.
- Wrap forms/menus that own focus in `FloatingFocusManager`.
- Take z-index from `packages/web/src/common/constants/web.constants.ts`
  (`Z_INDEX_TOOLTIP`, `Z_INDEX_FLOATING_MENU`, `Z_INDEX_FLOATING_FORM`, `Z_INDEX_MODAL`),
  not ad-hoc values.

## Exceptions — libraries that own their positioning

Do **not** wrap these in floating-ui; they ship their own popper:

- `react-datepicker` (date pickers, month pickers)
- `react-select` (recurrence/time selects)
- `react-toastify` (toasts)

## Centered modals/dialogs

Modals and dialogs are centered overlays, not anchored UI — they do not need floating-ui.
Use the existing `OverlayPanel` pattern (`packages/web/src/components/OverlayPanel/`).

## Testing

Components that rely on floating-ui refs/styles need the shared test setup — see the
"Floating UI-Dependent Tests" section in
[Testing Playbook](../development/testing-playbook.md). Do not mock `@floating-ui/react`
in broad component tests; a mock that helps one file can break unrelated tests in the same
Bun process.
