import { type FocusEvent, type MouseEvent } from "react";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { mock } from "bun:test";

type AgendaPointerEvent = MouseEvent<Element> | FocusEvent<Element>;

const createAgendaEvent = (currentTarget: Element): AgendaPointerEvent =>
  ({
    preventDefault: mock(),
    stopPropagation: mock(),
    currentTarget,
  }) as unknown as AgendaPointerEvent;

export const createAgendaTarget = ({
  eventClass,
  eventId,
}: {
  eventClass?: string;
  eventId?: string;
} = {}) => {
  const element = document.createElement("button");

  if (!eventClass) {
    return { element, event: createAgendaEvent(element), reference: null };
  }

  const reference = document.createElement("div");
  reference.className = eventClass;

  if (eventId) {
    reference.setAttribute(DATA_EVENT_ELEMENT_ID, eventId);
  }

  reference.appendChild(element);

  return { element, event: createAgendaEvent(element), reference };
};
