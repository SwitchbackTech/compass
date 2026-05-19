export interface HiddenSourceElement {
  element: HTMLElement;
  visibility: string;
}

export const hideSourceElement = (
  element: HTMLElement,
): HiddenSourceElement => {
  const hiddenSource = {
    element,
    visibility: element.style.visibility,
  };

  element.setAttribute("data-calendar-interaction-placeholder", "true");
  element.style.visibility = "hidden";

  return hiddenSource;
};

export const restoreSourceElement = (hiddenSource: HiddenSourceElement) => {
  hiddenSource.element.removeAttribute("data-calendar-interaction-placeholder");
  hiddenSource.element.style.visibility = hiddenSource.visibility;
};
