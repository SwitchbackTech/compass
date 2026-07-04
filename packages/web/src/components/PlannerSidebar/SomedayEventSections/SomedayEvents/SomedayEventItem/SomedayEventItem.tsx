import { type FC, useLayoutEffect, useRef } from "react";
import { type Schema_Event } from "@core/types/event.types";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import {
  type SomedayInteractionCategory,
  useSomedayEventRegistrationRef,
} from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { selectDatesInView, useViewStore } from "@web/events/stores/view.store";
import { SomedayEventContainer } from "../SomedayEventContainer/SomedayEventContainer";

const SOMEDAY_SORT_ANIMATION_MS = 180;
const SOMEDAY_SORT_ANIMATION_EASING = "cubic-bezier(0.2, 0, 0, 1)";

export interface Props {
  category: SomedayInteractionCategory;
  draftId: string;
  event: Schema_Event;
  index: number;
  isDrafting: boolean;
  animateEnter?: boolean;
}

const shouldReduceMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const restoreStyleAttribute = (
  element: HTMLElement,
  styleAttribute: string | null,
) => {
  if (styleAttribute === null) {
    element.removeAttribute("style");
    return;
  }

  element.setAttribute("style", styleAttribute);
};

const getStyleText = (baseStyleAttribute: string | null, styleText: string) => {
  if (!baseStyleAttribute) {
    return styleText;
  }

  return `${baseStyleAttribute}; ${styleText}`;
};

const useSomedayRowLayoutAnimation = () => {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const previousRectRef = useRef<DOMRect | null>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    const nextRect = element.getBoundingClientRect();
    const previousRect = previousRectRef.current;

    previousRectRef.current = nextRect;

    if (!previousRect || shouldReduceMotion()) {
      return;
    }

    const deltaX = previousRect.left - nextRect.left;
    const deltaY = previousRect.top - nextRect.top;

    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
      return;
    }

    const initialStyleAttribute = element.getAttribute("style");

    element.setAttribute(
      "style",
      getStyleText(
        initialStyleAttribute,
        `transition: none; transform: translate(${deltaX}px, ${deltaY}px); will-change: transform;`,
      ),
    );

    const frame = requestAnimationFrame(() => {
      element.setAttribute(
        "style",
        getStyleText(
          initialStyleAttribute,
          `transition: transform ${SOMEDAY_SORT_ANIMATION_MS}ms ${SOMEDAY_SORT_ANIMATION_EASING}; transform: translate(0, 0); will-change: transform;`,
        ),
      );
    });
    const cleanup = window.setTimeout(() => {
      if (elementRef.current !== element) {
        return;
      }

      restoreStyleAttribute(element, initialStyleAttribute);
    }, SOMEDAY_SORT_ANIMATION_MS);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(cleanup);
      restoreStyleAttribute(element, initialStyleAttribute);
    };
  });

  return elementRef;
};

export const SomedayEventItem: FC<Props> = ({
  category,
  draftId,
  event,
  isDrafting,
  index,
  animateEnter = false,
}) => {
  const isDraftingThisEvent =
    isDrafting && (draftId === event._id || !event._id);
  const enterAnimationRef = useRef(animateEnter);
  const layoutAnimationRef = useSomedayRowLayoutAnimation();
  const { actions, setters, state } = useSidebarContext();
  const { start, end } = useViewStore(selectDatesInView);
  const isDraggingThisEvent =
    state.isDragging && state.draft?._id === event._id;
  const interactionRef = useSomedayEventRegistrationRef({
    category,
    eventId: event._id,
    index,
    isEnabled: Boolean(event._id),
  });

  return (
    <div
      className={
        enterAnimationRef.current ? "animate-someday-cold-fade-in" : undefined
      }
      ref={layoutAnimationRef}
    >
      <SomedayEventContainer
        category={category}
        event={event}
        interactionRef={interactionRef}
        isDragging={isDraggingThisEvent}
        isDrafting={isDraftingThisEvent}
        duplicateEvent={actions.duplicateSomedayEvent}
        deleteEvent={actions.deleteSomedayEvent}
        onSubmit={(event) => actions.onSubmit(category, event)}
        setEvent={setters.setDraft}
        weekViewRange={{ startDate: start, endDate: end }}
      />
    </div>
  );
};
