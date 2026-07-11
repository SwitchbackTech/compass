import { type SourceElementDraftEventMode } from "../../CalendarInteractionAdapter";

interface HiddenSourceElement {
  draftEventMode: "hide-source";
  element: HTMLElement;
  visibility: string;
}

interface DimmedSourceElement {
  draftEventMode: "dim-source";
  element: HTMLElement;
  opacity: string;
  pointerEvents: string;
}

export type PreparedSourceElement = HiddenSourceElement | DimmedSourceElement;

const SOURCE_ELEMENT_INTERACTION_ATTRIBUTE = "data-calendar-interaction-source";

export const prepareSourceElementForInteraction = (
  element: HTMLElement,
  draftEventMode: SourceElementDraftEventMode = "hide-source",
): PreparedSourceElement => {
  element.setAttribute(SOURCE_ELEMENT_INTERACTION_ATTRIBUTE, "true");

  if (draftEventMode === "dim-source") {
    const source = {
      draftEventMode,
      element,
      opacity: element.style.opacity,
      pointerEvents: element.style.pointerEvents,
    };

    element.style.opacity = "0.5";
    element.style.pointerEvents = "none";

    return source;
  }

  const source = {
    draftEventMode,
    element,
    visibility: element.style.visibility,
  };

  element.style.visibility = "hidden";

  return source;
};

export const restoreSourceElement = (source: PreparedSourceElement) => {
  source.element.removeAttribute(SOURCE_ELEMENT_INTERACTION_ATTRIBUTE);

  if (source.draftEventMode === "dim-source") {
    source.element.style.opacity = source.opacity;
    source.element.style.pointerEvents = source.pointerEvents;

    return;
  }

  source.element.style.visibility = source.visibility;
};
