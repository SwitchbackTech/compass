import {
  ID_CONTEXT_MENU_ITEMS,
  ID_EVENT_FORM,
} from "../../constants/web.constants";

export const isEventFormOpen = () =>
  document.getElementsByName(ID_EVENT_FORM).length === 1;

export const isContextMenuOpen = () => {
  const contextMenuItems = document.getElementById(ID_CONTEXT_MENU_ITEMS);
  return !!contextMenuItems;
};

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

export const isEditableKeyboardTarget = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
) => {
  if (isComboboxInteraction(keyboardEvent)) return true;

  const target = getKeyboardTarget(keyboardEvent);
  if (!target) return false;

  if (target.isContentEditable) return true;

  const tagName = target.tagName.toLowerCase();

  return tagName === "input" || tagName === "textarea" || tagName === "select";
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
