import { DATA_TASK_ELEMENT_ID } from "@web/common/constants/web.constants";

export const getTaskIdFromElement = (element: HTMLElement) => {
  const _element = element.closest(`[${DATA_TASK_ELEMENT_ID}]`);
  return _element ? _element.getAttribute(DATA_TASK_ELEMENT_ID) : null;
};
