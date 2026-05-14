import {
  Profiler,
  type PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useStore } from "react-redux";
import { Categories_Event } from "@core/types/event.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import { selectIsEventPending } from "@web/ducks/events/selectors/pending.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import {
  createEventSlice,
  editEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { type RootState } from "@web/store";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { WeekInteractionController } from "./WeekInteractionController";

export type WeekInteractionCommitAdapter = {
  closeFormForInteraction?: () => void;
  openExistingEvent: (event: Schema_GridEvent) => void;
  submitMovedEvent: (
    event: Schema_GridEvent,
    meta: { hadFormOpenBeforeInteraction: boolean },
  ) => void;
};

interface Props extends PropsWithChildren {
  commitAdapter?: WeekInteractionCommitAdapter;
  controller?: WeekInteractionController;
}

const noopCommitAdapter: WeekInteractionCommitAdapter = {
  openExistingEvent: () => {},
  submitMovedEvent: () => {},
};

interface CreateCommitAdapterInput {
  closeForm: () => void;
  dispatchStart: (event: Schema_GridEvent) => void;
  requestUpdateScopeForDraft: (event: Schema_GridEvent) => void;
  setDraft: (event: Schema_GridEvent) => void;
  setIsFormOpen: (isOpen: boolean) => void;
  submit: (event: Schema_GridEvent) => void;
}

export const createWeekInteractionCommitAdapter = ({
  closeForm,
  dispatchStart,
  requestUpdateScopeForDraft,
  setDraft,
  setIsFormOpen,
  submit,
}: CreateCommitAdapterInput): WeekInteractionCommitAdapter => ({
  closeFormForInteraction: closeForm,
  openExistingEvent: dispatchStart,
  submitMovedEvent: (event, meta) => {
    if (meta.hadFormOpenBeforeInteraction) {
      setDraft(event);
      setIsFormOpen(true);
      return;
    }

    if (isRecurringEvent(event)) {
      requestUpdateScopeForDraft(event);
      return;
    }

    submit(event);
  },
});

export const WeekInteractionBoundary = ({
  children,
  commitAdapter,
  controller,
}: Props) => {
  if (controller) {
    return (
      <WeekInteractionBoundaryView
        commitAdapter={commitAdapter ?? noopCommitAdapter}
        controller={controller}
      >
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
  const { actions, confirmation, setters, state } = useDraftContext();
  const draftStateRef = useRef(state);

  useEffect(() => {
    draftStateRef.current = state;
  }, [state]);

  const defaultController = useMemo(
    () =>
      new WeekInteractionController({
        getFormEventId: () => draftStateRef.current.draft?._id ?? null,
        isEnabled: () =>
          typeof window !== "undefined" &&
          window.__weekInteractionV2ForceEnabled === true,
        isFormOpen: () => draftStateRef.current.isFormOpen || isEventFormOpen(),
        isPendingEvent: (eventId) =>
          selectIsEventPending(store.getState(), eventId),
      }),
    [store],
  );

  useEffect(() => {
    const originalDispatch = store.dispatch;
    store.dispatch = ((action: Parameters<typeof originalDispatch>[0]) => {
      const metrics = window.__weekInteractionMetrics;
      const actionType =
        typeof action === "object" && action && "type" in action
          ? String(action.type)
          : "unknown";
      if (metrics?.phase === "motion") {
        metrics.reduxDispatchesDuringMotion += 1;
        metrics.reduxActionTypesDuringMotion.push(actionType);
      }

      if (metrics && isEventSaveRequest(actionType)) {
        if (metrics.phase === "motion") {
          metrics.saveRequestsDuringMotion += 1;
        } else if (metrics.phase === "commit") {
          metrics.saveRequestsAfterPointerUp += 1;
        }
      }

      return originalDispatch(action);
    }) as typeof store.dispatch;

    return () => {
      store.dispatch = originalDispatch;
    };
  }, [store]);

  const commitAdapter = useMemo<WeekInteractionCommitAdapter>(
    () =>
      createWeekInteractionCommitAdapter({
        closeForm: actions.closeForm,
        dispatchStart: (event) => {
          store.dispatch(
            draftSlice.actions.start({
              activity: "gridClick",
              event,
              eventType: Categories_Event.TIMED,
            }),
          );
        },
        requestUpdateScopeForDraft: confirmation.requestUpdateScopeForDraft,
        setDraft: setters.setDraft,
        setIsFormOpen: setters.setIsFormOpen,
        submit: (event) => {
          void actions.submit(event);
        },
      }),
    [actions, confirmation.requestUpdateScopeForDraft, setters, store],
  );

  return (
    <WeekInteractionBoundaryView
      commitAdapter={commitAdapter}
      controller={defaultController}
    >
      {children}
    </WeekInteractionBoundaryView>
  );
};

const WeekInteractionBoundaryView = ({
  children,
  commitAdapter,
  controller,
}: PropsWithChildren<{
  commitAdapter: WeekInteractionCommitAdapter;
  controller: WeekInteractionController;
}>) => {
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
      const previousSession = controller.getSession();
      controller.handlePointerMove(event);
      const nextSession = controller.getSession();
      if (
        previousSession.phase === "pending" &&
        nextSession.phase === "motion" &&
        nextSession.formOpenAtPointerDown
      ) {
        commitAdapter.closeFormForInteraction?.();
      }
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

      const result = controller.handlePointerUp(event);
      if (result?.type === "click") {
        commitAdapter.openExistingEvent(result.event);
      } else if (
        result?.type === "allDayDragEnd" ||
        result?.type === "timedDragEnd" ||
        result?.type === "timedResizeEnd"
      ) {
        if (result.hasMoved) {
          commitAdapter.submitMovedEvent(result.event, {
            hadFormOpenBeforeInteraction: result.hadFormOpenBeforeInteraction,
          });
        } else {
          commitAdapter.openExistingEvent(result.event);
        }
      }
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
  }, [commitAdapter, controller]);

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

const isEventSaveRequest = (actionType: string) =>
  actionType === createEventSlice.actions.request.type ||
  actionType === editEventSlice.actions.request.type;

const isRecurringEvent = (event: Schema_GridEvent) => {
  const recurrence = event.recurrence;

  if (!recurrence) {
    return false;
  }

  return (
    typeof recurrence.eventId === "string" ||
    (Array.isArray(recurrence.rule) && recurrence.rule.length > 0)
  );
};
