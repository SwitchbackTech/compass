import {
  ID_CONTEXT_MENU_ITEMS,
  ID_EVENT_FORM,
} from "../../constants/web.constants";

export const isContextMenuOpen = () => {
  const contextMenuItems = document.getElementById(ID_CONTEXT_MENU_ITEMS);
  return !!contextMenuItems;
};

// A nested floating layer (actions menu, time picker, recurrence selects,
// confirmation dialogs) handles its own Escape; another Escape consumer
// acting at the same time would fight it. Two carve-outs for layers that are
// always present rather than transiently floating: overlays that stay
// mounted while hidden (the keyboard-shortcuts dialog — display:none in
// Day's tree, aria-hidden in Week's), and the sidebar's inline month picker,
// whose react-datepicker month grid is a permanently-visible role="listbox".
export const isFloatingLayerOpen = () =>
  Array.from(
    document.querySelectorAll(
      '[role="menu"], [role="listbox"], [role="dialog"]',
    ),
  ).some(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0 &&
      !element.closest('[data-testid="Month picker"]'),
  );

const EVENT_FORM_SELECTOR = `form[name="${ID_EVENT_FORM}"]`;

// The grid draft card and the sidebar-docked form live in separate component
// trees, so "typing on the focused card focuses the form's title" hops via
// the DOM instead of a shared ref.
export const focusEventFormTitle = () => {
  document
    .querySelector<HTMLInputElement>(
      `form[name="${ID_EVENT_FORM}"] input[name="Event Title"]`,
    )
    ?.focus();
};

const getKeyboardTarget = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
): HTMLElement | null => {
  const target = keyboardEvent.target as HTMLElement | null;

  return target instanceof HTMLElement ? target : null;
};

export const isComboboxInteraction = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
) => {
  const target = getKeyboardTarget(keyboardEvent);
  if (!target) {
    return false;
  }

  const role = target.getAttribute("role");

  if (role === "combobox" || role === "listbox" || role === "option") {
    return true;
  }

  const container =
    target.closest?.("[role='combobox']") ??
    target.closest?.("[role='listbox']") ??
    target.closest?.(".freq-select__control") ??
    target.closest?.(".freq-select__menu") ??
    target.closest?.(".freq-select__option");

  return Boolean(container);
};

// Prefer the contenteditable attribute (and ancestors) over
// `HTMLElement.isContentEditable`: jsdom often leaves that getter undefined
// even when TipTap has set contenteditable="true" on the focused node.
const isContentEditableElement = (target: HTMLElement) =>
  Boolean(
    target.isContentEditable ||
      target.closest("[contenteditable='true'], [contenteditable='']"),
  );

export const isEditableKeyboardTarget = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
) => {
  if (isComboboxInteraction(keyboardEvent)) return true;

  const target = getKeyboardTarget(keyboardEvent);
  if (!target) return false;

  if (isContentEditableElement(target)) return true;

  const tagName = target.tagName.toLowerCase();

  return tagName === "input" || tagName === "textarea" || tagName === "select";
};

/**
 * Targets where Enter has a native meaning and the event-form Enter-to-save
 * hotkey must stand down: multiline editing (TipTap contenteditable /
 * textarea), buttons (toolbar + Save/Cancel), and focused links.
 * Single-line inputs are intentionally excluded so title/location Enter
 * still submits.
 */
export const shouldDeferEnterToTarget = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
) => {
  const target = getKeyboardTarget(keyboardEvent);
  if (!target) return false;

  if (isContentEditableElement(target)) return true;

  const tagName = target.tagName.toLowerCase();
  if (tagName === "textarea" || tagName === "button") return true;
  if (tagName === "a" && target.hasAttribute("href")) return true;
  if (target.getAttribute("role") === "button") return true;

  return false;
};

export const isEventFormKeyboardTarget = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
) => {
  const target = getKeyboardTarget(keyboardEvent);
  if (!target) {
    return false;
  }

  const formContainer = target.closest(EVENT_FORM_SELECTOR);

  return Boolean(formContainer);
};

export const isDeleteTextEditingTarget = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
) => isEditableKeyboardTarget(keyboardEvent);
