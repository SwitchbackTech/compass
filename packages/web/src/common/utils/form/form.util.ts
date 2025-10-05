import {
  ID_CONTEXT_MENU_ITEMS,
  ID_EVENT_FORM,
  ID_SOMEDAY_EVENT_FORM,
} from "../../constants/web.constants";

export const isEventFormOpen = () =>
  document.getElementsByName(ID_EVENT_FORM).length === 1 ||
  document.getElementsByName(ID_SOMEDAY_EVENT_FORM).length === 1;

export const isContextMenuOpen = () => {
  const contextMenuItems = document.getElementById(ID_CONTEXT_MENU_ITEMS);
  return !!contextMenuItems;
};

export const isComboboxInteraction = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
) => {
  const target = keyboardEvent.target as HTMLElement | null;

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
