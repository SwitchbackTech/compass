import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";

export const getEventIdFromElement = (element: HTMLElement) => {
  const _element = element.closest(`[${DATA_EVENT_ELEMENT_ID}]`);
  return _element ? _element.getAttribute(DATA_EVENT_ELEMENT_ID) : null;
};
