export type SourceElementInteractionTreatment = "hidden" | "placeholder";

export interface PreparedSourceElement {
  element: HTMLElement;
  opacity: string;
  pointerEvents: string;
  visibility: string;
}

export const prepareSourceElementForInteraction = (
  element: HTMLElement,
  treatment: SourceElementInteractionTreatment = "hidden",
): PreparedSourceElement => {
  const preparedSource = {
    element,
    opacity: element.style.opacity,
    pointerEvents: element.style.pointerEvents,
    visibility: element.style.visibility,
  };

  element.setAttribute("data-calendar-interaction-placeholder", "true");

  if (treatment === "placeholder") {
    element.style.opacity = "0.5";
    element.style.pointerEvents = "none";

    return preparedSource;
  }

  element.style.visibility = "hidden";

  return preparedSource;
};

export const restoreSourceElement = (source: PreparedSourceElement) => {
  source.element.removeAttribute("data-calendar-interaction-placeholder");
  source.element.style.opacity = source.opacity;
  source.element.style.pointerEvents = source.pointerEvents;
  source.element.style.visibility = source.visibility;
};
