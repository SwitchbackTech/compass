import { ObjectId } from "bson";
import { useCallback } from "react";
import {
  Priorities,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import {
  Categories_Event,
  type Recurrence,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { StringV4Schema } from "@core/types/type.utils";
import { devAlert } from "@core/util/app.util";
import { DirtyParser } from "@web/common/parsers/dirty.parser";
import { EventInViewParser } from "@web/common/parsers/view.parser";
import { type PartialMouseEvent } from "@web/common/types/util.types";
import {
  type Schema_GridEvent,
  type Schema_WebEvent,
} from "@web/common/types/web.event.types";
import { assembleDefaultEvent } from "@web/common/utils/event/event.util";
import {
  type Payload_ConvertEvent,
  type Payload_EditEvent,
} from "@web/ducks/events/event.types";
import {
  selectDraft,
  selectDraftStatus,
} from "@web/ducks/events/selectors/draft.selectors";
import {
  selectIsAtWeeklyLimit,
  selectSomedayWeekCount,
} from "@web/ducks/events/selectors/someday.selectors";
import { selectPaginatedEventsBySectionType } from "@web/ducks/events/selectors/util.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { OnSubmitParser } from "@web/views/Week/components/Draft/hooks/actions/submit.parser";
import { useDraftEffects } from "@web/views/Week/components/Draft/hooks/effects/useDraftEffects";
import {
  type Setters_Draft,
  type State_Draft_Local,
  type Status_Drag,
} from "@web/views/Week/components/Draft/hooks/state/useDraftState";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  computeDragHasMoved,
  computeDragPosition,
} from "@web/views/Week/interaction/math/computeDragPosition";
import { computeResize } from "@web/views/Week/interaction/math/computeResize";

export const useDraftActions = (
  draftState: State_Draft_Local,
  setters: Setters_Draft,
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
) => {
  const dispatch = useAppDispatch();
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const somedayWeekCount = useAppSelector(selectSomedayWeekCount);
  const reduxDraft = useAppSelector(selectDraft);
  const pendingEventIds = useAppSelector(
    (state) => state.events.pendingEvents.eventIds,
  );
  const currentWeekEvents = useAppSelector((state) =>
    selectPaginatedEventsBySectionType(state, "week"),
  );

  const {
    activity,
    dateToResize,
    eventType: reduxDraftType,
    isDrafting,
  } = useAppSelector(selectDraftStatus)!;

  const {
    dateBeingChanged,
    draft,
    dragStatus,
    isDragging,
    isResizing,
    resizeStatus,
    isFormOpen,
    isFormOpenBeforeDragging,
  } = draftState;

  const {
    setIsDragging,
    setIsResizing,
    setDragStatus,
    setResizeStatus,
    setDateBeingChanged,
    setDraft,
    setIsFormOpen,
    setIsFormOpenBeforeDragging,
  } = setters;

  const startDragging = useCallback(() => {
    setIsDragging(true);
  }, [setIsDragging]);

  const startResizing = useCallback(() => {
    setIsResizing(true);
    setDateBeingChanged(dateToResize ?? null);
  }, [setIsResizing, setDateBeingChanged, dateToResize]);

  const stopDragging = useCallback(() => {
    setIsDragging(false);
    setDragStatus(null);
    setIsFormOpenBeforeDragging(null);
  }, [setIsDragging, setDragStatus, setIsFormOpenBeforeDragging]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    setResizeStatus(null);
    setDateBeingChanged("endDate");
  }, [setIsResizing, setResizeStatus, setDateBeingChanged]);

  const isSomeday = useCallback((): boolean => {
    return reduxDraft?.isSomeday ?? false;
  }, [reduxDraft?.isSomeday]);

  const isInstance = useCallback((): boolean => {
    return ObjectId.isValid(reduxDraft?.recurrence?.eventId ?? "");
  }, [reduxDraft?.recurrence?.eventId]);

  const isRecurrence = useCallback((): boolean => {
    const hasRRule = Array.isArray(reduxDraft?.recurrence?.rule);

    return hasRRule || isInstance();
  }, [reduxDraft?.recurrence?.rule, isInstance]);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
  }, [setIsFormOpen]);

  const reset = useCallback(() => {
    setDraft(null);
    setIsDragging(false);
    closeForm();
    setIsResizing(false);
    setDragStatus(null);
    setResizeStatus(null);
    setDateBeingChanged(null);
  }, [
    closeForm,
    setDateBeingChanged,
    setDraft,
    setDragStatus,
    setIsDragging,
    setIsResizing,
    setResizeStatus,
  ]);

  const discard = useCallback(() => {
    reset();

    if (reduxDraft || reduxDraftType) {
      dispatch(draftSlice.actions.discard(undefined));
    }
  }, [dispatch, reduxDraft, reduxDraftType, reset]);

  const deleteEvent = useCallback(
    (
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
      const eventToDelete = draft ?? reduxDraft;
      const { data: _title } = StringV4Schema.safeParse(eventToDelete?.title);
      const title = _title ?? "this event";
      const usePrefix = applyTo === RecurringEventUpdateScope.ALL_EVENTS;
      const prefix = usePrefix ? "all instances of - " : "";

      const confirmed = window.confirm(`Delete ${prefix}${title}?`);

      if (confirmed && eventToDelete?._id) {
        dispatch(
          deleteEventSlice.actions.request({
            _id: eventToDelete._id,
            applyTo,
          }),
        );
      }
      discard();
    },
    [dispatch, draft, reduxDraft, discard],
  );

  const convert = useCallback(
    (start: string, end: string) => {
      if (isAtWeeklyLimit) {
        alert(SOMEDAY_WEEK_LIMIT_MSG);
        return;
      }

      const event: Payload_ConvertEvent["event"] = {
        ...draft,
        _id: draft!._id!,
        user: draft?.user ?? "",
        isAllDay: false,
        isSomeday: true,
        startDate: start,
        endDate: end,
        origin: draft?.origin,
        priority: draft?.priority ?? Priorities.UNASSIGNED,
        order: somedayWeekCount,
      };

      if (isRecurrence()) {
        event.recurrence = {
          ...event.recurrence,
          rule: event.recurrence?.rule?.map((rule) => {
            const isRRule = rule.startsWith("RRULE:");

            if (!isRRule) return rule;

            return rule.replace(/FREQ=\w+;/, "FREQ=WEEKLY;");
          }) as string[],
        };
      }

      dispatch(getWeekEventsSlice.actions.convert({ event }));

      discard();
    },
    [discard, dispatch, draft, isAtWeeklyLimit, somedayWeekCount, isRecurrence],
  );

  const openForm = useCallback(() => {
    setIsFormOpen(true);
  }, [setIsFormOpen]);

  const determineSubmitAction = useCallback(
    (draft: Schema_WebEvent) => {
      const isExisting = !!draft._id;
      if (!isExisting) return "CREATE";

      if (isExisting) {
        // Prevent updates if event is pending (waiting for backend confirmation)
        const isPending = draft._id
          ? pendingEventIds.includes(draft._id)
          : false;
        if (isPending) {
          // Event is pending, discard the change and return to original position
          return "DISCARD";
        }

        if (isFormOpenBeforeDragging) {
          return "OPEN_FORM";
        }
        const isSame = reduxDraft
          ? !DirtyParser.isEventDirty(draft, reduxDraft)
          : false;
        if (isSame) {
          // no need to make HTTP request
          return "DISCARD";
        }
      }
      return "UPDATE";
    },
    [reduxDraft, isFormOpenBeforeDragging, pendingEventIds],
  );

  const getEditSlicePayload = useCallback(
    (
      event: Schema_WebEvent,
      applyTo: RecurringEventUpdateScope,
    ): Payload_EditEvent => {
      const viewParser = new EventInViewParser(
        event,
        weekProps.component.startOfView,
        weekProps.component.endOfView,
      );
      const shouldRemove = viewParser.isEventOutsideView();
      const payload = { _id: event._id!, event, shouldRemove, applyTo };

      return payload;
    },
    [weekProps.component.endOfView, weekProps.component.startOfView],
  );

  const shouldAddToView = useCallback(
    (event: Schema_WebEvent) => {
      const viewParser = new EventInViewParser(
        event,
        weekProps.component.startOfView,
        weekProps.component.endOfView,
      );
      const lastNavSource = weekProps.util.getLastNavigationSource();
      const idsInView = currentWeekEvents?.data ?? [];
      const shouldAddToView = viewParser.shouldAddToViewAfterDragToEdge(
        lastNavSource,
        idsInView,
      );
      return shouldAddToView;
    },
    [
      weekProps.component.startOfView,
      weekProps.component.endOfView,
      weekProps.util,
      currentWeekEvents?.data,
    ],
  );

  const submit = useCallback(
    async (
      draft: Schema_GridEvent,
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
      const action = determineSubmitAction(draft);
      switch (action) {
        case "OPEN_FORM":
          openForm();
          return;
        case "DISCARD":
          discard();
          return;
        case "CREATE": {
          const event = new OnSubmitParser(draft).parse();
          dispatch(
            createEventSlice.actions.request({
              ...event,
              recurrence: event.recurrence as Recurrence["recurrence"],
            }),
          );
          return;
        }
        case "UPDATE": {
          if (!draft._id) {
            discard();
            return;
          }

          const event = new OnSubmitParser(draft).parse();
          const payload = getEditSlicePayload(event, applyTo);
          dispatch(editEventSlice.actions.request(payload));

          if (shouldAddToView(event)) {
            dispatch(getWeekEventsSlice.actions.insert(event._id!));
          }

          if (isFormOpenBeforeDragging) {
            openForm();
          } else {
            discard();
          }
          return;
        }
        default:
          break;
      }
    },
    [
      determineSubmitAction,
      discard,
      dispatch,
      getEditSlicePayload,
      isFormOpenBeforeDragging,
      openForm,
      shouldAddToView,
    ],
  );

  const duplicateEvent = useCallback(() => {
    const draft = MapEvent.removeProviderData({
      ...(reduxDraft as Schema_Event),
    }) as Schema_GridEvent;
    const { _id: _duplicatedEventId, ...duplicateDraft } = draft;

    submit(duplicateDraft);
    discard();
  }, [reduxDraft, submit, discard]);

  const drag = useCallback(
    (e: Omit<PartialMouseEvent, "currentTarget">) => {
      if (!isDragging) {
        devAlert("not dragging (anymore?)");
        return;
      }

      const hasMoved = computeDragHasMoved({
        dateCalcs,
        draft,
        pointer: e,
        startOfView: weekProps.component.startOfView,
      });

      if (!dragStatus?.hasMoved && hasMoved) {
        setDragStatus(
          (_status): Status_Drag => ({
            ..._status!,
            hasMoved: true,
          }),
        );
      }

      if (!draft) return;

      const nextDraft = computeDragPosition({
        dateCalcs,
        draft,
        dragStatus,
        pointer: e,
        startOfView: weekProps.component.startOfView,
      });

      if (nextDraft) {
        setDraft(nextDraft);
      }
    },
    [
      isDragging,
      dateCalcs,
      weekProps.component.startOfView,
      draft,
      dragStatus,
      setDraft,
      setDragStatus,
    ],
  );

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!draft || !reduxDraft) return; // TS Guard

      e.preventDefault();
      e.stopPropagation();

      if (!isResizing) return;

      // For all-day events, use a fixed Y coordinate (0) because Y positioning is irrelevant:
      const y = draft.isAllDay ? 0 : e.clientY;
      const currTime = dateCalcs.getDateByXY(
        e.clientX,
        y,
        weekProps.component.startOfView,
      );

      const resizeResult = computeResize({
        currTime,
        dateBeingChanged,
        draft,
        reduxDraft,
      });

      if (!resizeResult) {
        return;
      }

      if (resizeResult.nextDateBeingChanged !== dateBeingChanged) {
        setDateBeingChanged(resizeResult.nextDateBeingChanged);
      }

      closeForm();
      setDraft((_draft): Schema_GridEvent => {
        return {
          ..._draft!,
          _id: _draft!._id,
          hasFlipped: resizeResult.flipDraft.hasFlipped,
          endDate: resizeResult.flipDraft.endDate,
          startDate: resizeResult.flipDraft.startDate,
          priority: resizeResult.flipDraft.priority,
        };
      });

      if (!resizeStatus?.hasMoved && resizeResult.hasMoved) {
        setResizeStatus({ hasMoved: true });
      }

      setDraft((_draft): Schema_GridEvent => {
        return {
          ..._draft!,
          [resizeResult.dateChanged]: resizeResult.updatedTime,
        };
      });
    },
    [
      closeForm,
      dateBeingChanged,
      dateCalcs,
      draft,
      reduxDraft,
      isResizing,
      resizeStatus?.hasMoved,
      setDateBeingChanged,
      setDraft,
      setResizeStatus,
      weekProps.component.startOfView,
    ],
  );

  const create = useCallback(async () => {
    if (reduxDraft !== null) {
      setDraft(reduxDraft as Schema_GridEvent);
    } else {
      const { startDate, endDate } = reduxDraft ?? {
        startDate: undefined,
        endDate: undefined,
      };

      const defaultDraft = (await assembleDefaultEvent(
        reduxDraftType,
        startDate,
        endDate,
      )) as Schema_GridEvent;
      setDraft(defaultDraft);
    }
    openForm();
  }, [openForm, reduxDraft, reduxDraftType, setDraft]);

  const handleChange = useCallback(async () => {
    const isSomeday =
      reduxDraftType === Categories_Event.SOMEDAY_WEEK ||
      reduxDraftType === Categories_Event.SOMEDAY_MONTH;
    if (!isDrafting) return;
    if (activity === "eventRightClick") {
      return; // Prevents form and context menu from opening at same time
    }
    if (!isSomeday && activity === "keyboardEdit") {
      setDraft(reduxDraft as Schema_GridEvent);
      openForm();
      return;
    }
    if (
      !isSomeday &&
      (activity === "createShortcut" || activity === "gridClick")
    ) {
      await create();
      return;
    }
    if (activity === "dragging") {
      setDraft(reduxDraft as Schema_GridEvent);
      startDragging();
      return;
    }
    if (activity === "resizing") {
      setDraft(reduxDraft as Schema_GridEvent);
      startResizing();
    }
  }, [
    reduxDraftType,
    isDrafting,
    activity,
    create,
    setDraft,
    reduxDraft,
    startDragging,
    startResizing,
    openForm,
  ]);

  const actions = {
    closeForm,
    submit,
    convert,
    deleteEvent,
    duplicateEvent,
    discard,
    drag,
    openForm,
    reset,
    resize,
    isSomeday,
    isInstance,
    isRecurrence,
    startDragging: () => {
      // Placing `setIsFormOpenBeforeDragging` here rather than inside `startDragging`
      // because `setIsFormOpenBeforeDragging` depends on `isFormOpen` and re-calculates
      // `startDragging` (due to it being a react callback) which causes issues.
      // This is a hacky solution to the issue.
      setIsFormOpenBeforeDragging(isFormOpen);
      startDragging();
    },
    stopDragging,
    stopResizing,
  };

  useDraftEffects(draftState, setters, weekProps, isDrafting, handleChange);

  return actions;
};
export type Actions_Draft = ReturnType<typeof useDraftActions>;
