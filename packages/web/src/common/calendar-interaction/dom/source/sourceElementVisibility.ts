import { type SourceElementOverlayMode } from "../../CalendarInteractionAdapter";

interface HiddenSourceElement {
  element: HTMLElement;
  overlayMode: "hide-source";
  visibility: string;
}

interface DimmedSourceElement {
  element: HTMLElement;
  opacity: string;
  overlayMode: "dim-source";
  pointerEvents: string;
}

export type PreparedSourceElement = HiddenSourceElement | DimmedSourceElement;

const SOURCE_ELEMENT_INTERACTION_ATTRIBUTE = "data-calendar-interaction-source";

export const prepareSourceElementForInteraction = (
  element: HTMLElement,
  overlayMode: SourceElementOverlayMode = "hide-source",
): PreparedSourceElement => {
  element.setAttribute(SOURCE_ELEMENT_INTERACTION_ATTRIBUTE, "true");

  if (overlayMode === "dim-source") {
    const source = {
      element,
      opacity: element.style.opacity,
      overlayMode,
      pointerEvents: element.style.pointerEvents,
    };

    element.style.opacity = "0.5";
    element.style.pointerEvents = "none";

    return source;
  }

  const source = {
    element,
    overlayMode,
    visibility: element.style.visibility,
  };

  element.style.visibility = "hidden";

  return source;
};

export const restoreSourceElement = (source: PreparedSourceElement) => {
  source.element.removeAttribute(SOURCE_ELEMENT_INTERACTION_ATTRIBUTE);

  if (source.overlayMode === "dim-source") {
    source.element.style.opacity = source.opacity;
    source.element.style.pointerEvents = source.pointerEvents;

    return;
  }

  source.element.style.visibility = source.visibility;
};
