import {
  Profiler,
  type PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useStore } from "react-redux";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import { selectIsEventPending } from "@web/ducks/events/selectors/pending.selectors";
import { type RootState } from "@web/store";
import { WeekInteractionController } from "./WeekInteractionController";

interface Props extends PropsWithChildren {
  controller?: WeekInteractionController;
}

export const WeekInteractionBoundary = ({ children, controller }: Props) => {
  if (controller) {
    return (
      <WeekInteractionBoundaryView controller={controller}>
        {children}
      </WeekInteractionBoundaryView>
    );
  }

  return (
    <ConnectedWeekInteractionBoundary>
      {children}
    </ConnectedWeekInteractionBoundary>
  );
};

const ConnectedWeekInteractionBoundary = ({ children }: PropsWithChildren) => {
  const store = useStore<RootState>();
  const defaultController = useMemo(
    () =>
      new WeekInteractionController({
        isEnabled: () =>
          typeof window !== "undefined" &&
          window.__weekInteractionV2ForceEnabled === true,
        isFormOpen: isEventFormOpen,
        isPendingEvent: (eventId) =>
          selectIsEventPending(store.getState(), eventId),
      }),
    [store],
  );

  useEffect(() => {
    const originalDispatch = store.dispatch;
    store.dispatch = ((action: Parameters<typeof originalDispatch>[0]) => {
      const metrics = window.__weekInteractionMetrics;
      if (metrics?.phase === "motion") {
        metrics.reduxDispatchesDuringMotion += 1;
        metrics.reduxActionTypesDuringMotion.push(
          typeof action === "object" && action && "type" in action
            ? String(action.type)
            : "unknown",
        );
      }

      return originalDispatch(action);
    }) as typeof store.dispatch;

    return () => {
      store.dispatch = originalDispatch;
    };
  }, [store]);

  return (
    <WeekInteractionBoundaryView controller={defaultController}>
      {children}
    </WeekInteractionBoundaryView>
  );
};

const WeekInteractionBoundaryView = ({
  children,
  controller,
}: PropsWithChildren<{ controller: WeekInteractionController }>) => {
  const boundaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const boundaryElement = boundaryRef.current;

    if (!boundaryElement) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const isOwned = controller.handlePointerDown(event);

      if (!isOwned) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };
    const handlePointerMove = (event: PointerEvent) => {
      const wasHandling = controller.isHandlingPointer(event);
      controller.handlePointerMove(event);
      if (!wasHandling && !controller.isHandlingPointer(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (!controller.isHandlingPointer(event)) {
        return;
      }

      controller.handlePointerUp(event);
      event.preventDefault();
      event.stopPropagation();
    };

    boundaryElement.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    window.addEventListener("pointermove", handlePointerMove, {
      capture: true,
    });
    window.addEventListener("pointerup", handlePointerUp, { capture: true });

    return () => {
      boundaryElement.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      window.removeEventListener("pointermove", handlePointerMove, {
        capture: true,
      });
      window.removeEventListener("pointerup", handlePointerUp, {
        capture: true,
      });
    };
  }, [controller]);

  return (
    <Profiler
      id="WeekInteractionBoundary"
      onRender={(_id, _phase, actualDuration) => {
        const metrics = window.__weekInteractionMetrics;
        if (metrics?.phase === "motion") {
          metrics.reactCommitsDuringMotion += 1;
          metrics.reactCommitDurationsDuringMotion.push(actualDuration);
        }
      }}
    >
      <div
        data-week-interaction-boundary="true"
        ref={boundaryRef}
        style={{ display: "contents" }}
      >
        {children}
      </div>
    </Profiler>
  );
};
