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
