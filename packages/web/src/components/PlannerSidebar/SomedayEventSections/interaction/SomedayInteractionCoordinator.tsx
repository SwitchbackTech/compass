import {
  type FC,
  type PropsWithChildren,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
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
  const eventsById = useMemo(() => {
    return new Map(Object.entries(state.somedayEvents.events));
  }, [state.somedayEvents.events]);
  const runtimeRef = useRef<SomedayInteractionRuntime>({
    getSomedayEventById: () => null,
    getVisibleDays: () => [],
    onClickSomedayEvent: () => undefined,
    onCommitSomedayInteraction: () => undefined,
  });
  const visibleDayKeys = useMemo(
    () =>
      weekProps.component.weekDays.map((day) =>
        day.format(YEAR_MONTH_DAY_FORMAT),
      ),
    [weekProps.component.weekDays],
  );
  const adapter = useMemo(
    () =>
      createSomedayInteractionAdapter({
        getLayoutSources: () => layoutSourcesRef.current?.() ?? {},
        runtime: () => runtimeRef.current,
      }),
    [],
  );
  const lastNavigationSource = weekProps.util.getLastNavigationSource();
  // Keyed on the first *visible* day: within-week window paging shifts the
  // rendered columns without changing startOfView, and the drag layout must
  // rebuild for those navigations too.
  const renderedFirstDayMs =
    weekProps.component.weekDays[0]?.valueOf() ?? Number.NaN;

  layoutSourcesRef.current = getLayoutSources;

  useLayoutEffect(() => {
    if (
      lastNavigationSource !== "drag-to-edge" ||
      !Number.isFinite(renderedFirstDayMs)
    ) {
      return;
    }

    adapter.rebuildLayoutAfterNavigation();
  }, [adapter, lastNavigationSource, renderedFirstDayMs]);

  runtimeRef.current = {
    getSomedayEventById: (eventId) => eventsById.get(eventId) ?? null,
    getVisibleDays: () => visibleDayKeys,
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
