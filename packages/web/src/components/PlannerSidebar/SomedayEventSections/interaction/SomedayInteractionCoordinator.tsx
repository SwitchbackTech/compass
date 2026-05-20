import {
  type FC,
  type PropsWithChildren,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { CalendarInteractionPointerCaptureBoundary } from "@web/common/calendar-interaction/react/CalendarInteractionPointerCaptureBoundary";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { type WeekLayoutCacheSources } from "@web/views/Week/interaction/adapter/geometry/weekLayoutCache";
import { createSomedayInteractionAdapter } from "./adapter/SomedayInteractionAdapter";
import { type SomedayInteractionRuntime } from "./adapter/SomedayInteractionAdapter.types";
import { markSomedayCommitAcknowledgement } from "./state/somedayCommitAcknowledgementState";

interface Props extends PropsWithChildren {
  getLayoutSources?: () => WeekLayoutCacheSources;
  weekProps: WeekProps;
}

export const SomedayInteractionCoordinator: FC<Props> = ({
  children,
  getLayoutSources,
  weekProps,
}) => {
  const { actions, state } = useSidebarContext();
  const layoutSourcesRef = useRef(getLayoutSources);
  const viewStartRef = useRef(weekProps.component.startOfView);
  const eventsById = useMemo(() => {
    return new Map(Object.entries(state.somedayEvents.events));
  }, [state.somedayEvents.events]);
  const runtimeRef = useRef<SomedayInteractionRuntime>({
    getSomedayEventById: () => null,
    onClickSomedayEvent: () => undefined,
    onCommitSomedayInteraction: () => undefined,
  });
  const adapter = useMemo(
    () =>
      createSomedayInteractionAdapter({
        getLayoutSources: () => layoutSourcesRef.current?.() ?? {},
        getViewStart: () => viewStartRef.current,
        runtime: () => runtimeRef.current,
      }),
    [],
  );
  const lastNavigationSource = weekProps.util.getLastNavigationSource();
  const renderedWeekStartMs = weekProps.component.startOfView.valueOf();

  layoutSourcesRef.current = getLayoutSources;
  viewStartRef.current = weekProps.component.startOfView;

  useLayoutEffect(() => {
    if (
      lastNavigationSource !== "drag-to-edge" ||
      !Number.isFinite(renderedWeekStartMs)
    ) {
      return;
    }

    adapter.rebuildLayoutAfterNavigation();
  }, [adapter, lastNavigationSource, renderedWeekStartMs]);

  runtimeRef.current = {
    getSomedayEventById: (eventId) => eventsById.get(eventId) ?? null,
    isSidebarDropAllowed: actions.isSomedaySidebarDropAllowed,
    onCancelInteraction: actions.cancelSomedayInteraction,
    onClickSomedayEvent: actions.onDraft,
    onCommitSomedayInteraction: (result) => {
      // Mark before dispatching so the freshly rendered GridEvent /
      // AllDayEvent picks up the acknowledgment on its first paint.
      if (result.type === "schedule") {
        markSomedayCommitAcknowledgement(result.eventId);
      }

      actions.commitSomedayInteraction(result);
    },
    onMotionActivation: (target) => {
      actions.startSomedayInteraction(target.event._id);
    },
    onPreviewSomedaySidebarDrop: (result) => {
      if (!result) {
        actions.previewSomedaySidebarDrop(null);
        return;
      }

      if (!actions.isSomedaySidebarDropAllowed(result)) {
        actions.previewBlockedSomedaySidebarDrop(result);
        return;
      }

      actions.previewSomedaySidebarDrop(result);
    },
    onRequestWeekNavigation: (direction) => {
      if (direction === "prev") {
        weekProps.util.decrementWeek("drag-to-edge");
        return;
      }

      weekProps.util.incrementWeek("drag-to-edge");
    },
  };

  return (
    <CalendarInteractionPointerCaptureBoundary adapter={adapter}>
      {children}
    </CalendarInteractionPointerCaptureBoundary>
  );
};
