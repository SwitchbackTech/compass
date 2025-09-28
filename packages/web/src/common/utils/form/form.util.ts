import {
  ID_EVENT_FORM,
  ID_SOMEDAY_EVENT_FORM,
} from "../../constants/web.constants";

export const isEventFormOpen = () =>
  document.getElementsByName(ID_EVENT_FORM).length === 1 ||
  document.getElementsByName(ID_SOMEDAY_EVENT_FORM).length === 1;
