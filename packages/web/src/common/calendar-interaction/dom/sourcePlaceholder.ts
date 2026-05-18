export interface SourcePlaceholder {
  element: HTMLElement;
  visibility: string;
}

export const markSourcePlaceholder = (
  element: HTMLElement,
): SourcePlaceholder => {
  const placeholder = {
    element,
    visibility: element.style.visibility,
  };

  element.setAttribute("data-calendar-interaction-placeholder", "true");
  element.style.visibility = "hidden";

  return placeholder;
};

export const restoreSourcePlaceholder = (placeholder: SourcePlaceholder) => {
  placeholder.element.removeAttribute("data-calendar-interaction-placeholder");
  placeholder.element.style.visibility = placeholder.visibility;
};
