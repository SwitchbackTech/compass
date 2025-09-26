import { ObjectId } from "bson";
import { MouseEvent, useCallback } from "react";
import {
  ID_OPTIMISTIC_PREFIX,
  Priorities,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { MapEvent } from "@core/mappers/map.event";
import {
  Categories_Event,
  Recurrence,
  RecurringEventUpdateScope,
} from "@core/types/event.types";
import { devAlert } from "@core/util/app.util";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/auth.util";
import { isEventDirty } from "@web/common/parsers/event.parser";
import { PartialMouseEvent } from "@web/common/types/util.types";
import {
  Schema_GridEvent,
  Schema_WebEvent,
} from "@web/common/types/web.event.types";
import {
  assembleDefaultEvent,
  prepEvtBeforeSubmit,
  prepSomedayEventBeforeSubmit,
  replaceIdWithOptimisticId,
} from "@web/common/utils/event.util";
import { getX } from "@web/common/utils/grid.util";
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
import { useDraftEffects } from "@web/views/Calendar/components/Draft/hooks/effects/useDraftEffects";
import {
  Setters_Draft,
  State_Draft_Local,
  Status_Drag,
} from "@web/views/Calendar/components/Draft/hooks/state/useDraftState";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";

export const useDraftActions = (
  draftState: State_Draft_Local,
  setters: Setters_Draft,
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
  isSidebarOpen: boolean,
) => {
  const dispatch = useAppDispatch();
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const somedayWeekCount = useAppSelector(selectSomedayWeekCount);
  const reduxDraft = useAppSelector(selectDraft);
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

  const isInstance = useCallback((): boolean => {
    return ObjectId.isValid(reduxDraft?.recurrence?.eventId ?? "");
  }, [reduxDraft]);

  const isRecurrence = useCallback((): boolean => {
    const hasRRule = Array.isArray(reduxDraft?.recurrence?.rule);

    return hasRRule || isInstance();
  }, [reduxDraft, isInstance]);

  const isRecurrenceChanged = useCallback(
    (currentDraft: Schema_WebEvent): boolean => {
      if (!isRecurrence() || !currentDraft) return false;

      const oldStartDate = reduxDraft?.startDate;
      const newStartDate = currentDraft?.startDate;
      const oldEndDate = reduxDraft?.endDate;
      const newEndDate = currentDraft?.endDate;
      const oldRecurrence = reduxDraft?.recurrence?.rule ?? [];
      const newRecurrence = currentDraft?.recurrence?.rule ?? [];
      const startDateChanged = oldStartDate !== newStartDate;
      const endDateChanged = oldEndDate !== newEndDate;
      const oldRuleFields = oldRecurrence.flatMap((rule) => rule.split(";"));
      const newRuleFields = newRecurrence.flatMap((rule) => rule.split(";"));
      const oldRuleSet = [...new Set(oldRuleFields)];
      const newRuleSet = [...new Set(newRuleFields)];

      return (
        startDateChanged ||
        endDateChanged ||
        newRuleSet.some((rule) => !oldRuleSet.includes(rule))
      );
    },
    [reduxDraft, isRecurrence],
  );

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
      dispatch(draftSlice.actions.discard());
    }
  }, [dispatch, reduxDraft, reduxDraftType, reset]);

  const deleteEvent = useCallback(
    (
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
      if (reduxDraft?._id) {
        dispatch(
          deleteEventSlice.actions.request({
            _id: reduxDraft._id,
            applyTo,
          } as unknown as void),
        );
      }
      discard();
    },
    [dispatch, reduxDraft, discard],
  );

  const convert = useCallback(
    (start: string, end: string) => {
      if (isAtWeeklyLimit) {
        alert(SOMEDAY_WEEK_LIMIT_MSG);
        return;
      }

      dispatch(
        getWeekEventsSlice.actions.convert({
          event: {
            ...draft,
            _id: draft!._id!,
            user: draft!.user!,
            isAllDay: false,
            isSomeday: true,
            startDate: start,
            endDate: end,
            origin: draft!.origin!,
            priority: draft?.priority ?? Priorities.UNASSIGNED,
            order: somedayWeekCount,
          },
        }),
      );

      discard();
    },
    [discard, dispatch, draft, isAtWeeklyLimit, somedayWeekCount],
  );

  const openForm = useCallback(() => {
    setIsFormOpen(true);
  }, [setIsFormOpen]);

  const determineSubmitAction = useCallback(
    (draft: Schema_WebEvent) => {
      const isExisting = draft._id;
      const isOptimistic = draft._id?.startsWith(ID_OPTIMISTIC_PREFIX);
      if (isExisting && !isOptimistic) {
        if (isFormOpenBeforeDragging) {
          openForm();
          return "OPEN_FORM";
        }
        const isSame = !isEventDirty(draft, reduxDraft);
        if (isSame) {
          // no need to make HTTP request
          discard();
          return "DISCARD";
        }
      }
      return "SUBMIT";
    },
    [reduxDraft, isFormOpenBeforeDragging, openForm, discard],
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
        case "SUBMIT":
        default:
          // Continue with the submit logic below
          break;
      }

      const userId = await getUserId();

      let event = null;
      if (draft.isSomeday) {
        event = prepSomedayEventBeforeSubmit(draft, userId);
        event.order = -1; // Provide it to prevent zod validation error since zod expects it
      } else {
        event = prepEvtBeforeSubmit(draft, userId);
      }

      const { startOfView, endOfView } = weekProps.component;
      const isExisting = draft._id;

      if (isExisting) {
        const isDateWithinView = (date: string) =>
          dayjs(date).isBetween(startOfView, endOfView, null, "[]");

        const isStartDateInView = isDateWithinView(event.startDate);
        const isEndDateInView = isDateWithinView(event.endDate);
        const doesEventSpanView =
          dayjs(event.startDate).isBefore(startOfView) &&
          dayjs(event.endDate).isAfter(endOfView);

        const isEventCompletelyOutsideView =
          !isStartDateInView && !isEndDateInView && !doesEventSpanView;

        const shouldRemove = isEventCompletelyOutsideView;

        const payload = { _id: event._id, event, shouldRemove, applyTo };
        dispatch(editEventSlice.actions.request(payload as unknown as void));

        // If this was a drag-to-edge navigation and event moved to current week, ensure it's visible
        const lastNavigationSource = weekProps.util.getLastNavigationSource();
        const isDragToEdgeNavigation = lastNavigationSource === "drag-to-edge";
        const wasEventMovedToCurrentWeek =
          !shouldRemove &&
          (isStartDateInView || isEndDateInView || doesEventSpanView);

        if (isDragToEdgeNavigation && wasEventMovedToCurrentWeek) {
          // Only insert if the event is not already in the current week's event list
          const isEventAlreadyInWeek = currentWeekEvents?.data.includes(
            event._id!,
          );
          if (!isEventAlreadyInWeek) {
            dispatch(getWeekEventsSlice.actions.insert(event._id!));
          }
        }
      } else {
        dispatch(
          createEventSlice.actions.request({
            ...event,
            recurrence: event.recurrence as Recurrence["recurrence"],
          }),
        );
      }

      if (isFormOpenBeforeDragging) {
        openForm();
      } else {
        discard();
      }
    },
    [
      isFormOpenBeforeDragging,
      weekProps,
      currentWeekEvents,
      dispatch,
      discard,
      openForm,
    ],
  );

  const duplicateEvent = useCallback(() => {
    const draft = MapEvent.removeProviderData({
      ...reduxDraft,
    }) as Schema_GridEvent;

    submit(replaceIdWithOptimisticId(draft));
    discard();
  }, [reduxDraft, submit, discard]);

  const drag = useCallback(
    (e: Omit<PartialMouseEvent, "currentTarget">) => {
      const updateTimesDuringDrag = (
        e: Omit<PartialMouseEvent, "currentTarget">,
      ) => {
        if (!draft) return;

        const x = getX(e as MouseEvent, isSidebarOpen);
        const startEndDurationMin = dragStatus?.durationMin || 0;

        const y = draft.isAllDay
          ? e.clientY
          : e.clientY - draft.position.dragOffset.y;

        let eventStart = dateCalcs.getDateByXY(
          x,
          y,
          weekProps.component.startOfView,
        );

        let eventEnd = eventStart.add(startEndDurationMin, "minutes");

        if (!draft.isAllDay) {
          // Edge case: timed events' end times can overflow past midnight at the bottom of the grid.
          // Below logic prevents that from occurring.
          if (eventEnd.date() !== eventStart.date()) {
            eventEnd = eventEnd.hour(0).minute(0);
            eventStart = eventEnd.subtract(startEndDurationMin, "minutes");
          }
        }

        const _draft: Schema_GridEvent = {
          ...draft,
          startDate: draft.isAllDay
            ? eventStart.format(YEAR_MONTH_DAY_FORMAT)
            : eventStart.format(),
          endDate: draft.isAllDay
            ? eventEnd.format(YEAR_MONTH_DAY_FORMAT)
            : eventEnd.format(),
          priority: draft.priority || Priorities.UNASSIGNED,
        };

        setDraft(_draft);
      };
      if (!isDragging) {
        devAlert("not dragging (anymore?)");
        return;
      }

      const x = getX(e as MouseEvent, isSidebarOpen);
      const currTime = dateCalcs.getDateStrByXY(
        x,
        e.clientY,
        weekProps.component.startOfView,
      );
      const hasMoved = currTime !== draft?.startDate;

      if (!dragStatus?.hasMoved && hasMoved) {
        setDragStatus(
          (_status): Status_Drag => ({
            ..._status!,
            hasMoved: true,
          }),
        );
      }

      updateTimesDuringDrag(e);
    },
    [
      isDragging,
      isSidebarOpen,
      dateCalcs,
      weekProps.component.startOfView,
      draft,
      dragStatus?.hasMoved,
      dragStatus?.durationMin,
      setDraft,
      setDragStatus,
    ],
  );

  const isValidMovement = useCallback(
    (currTime: dayjs.Dayjs) => {
      if (!draft || !dateBeingChanged) return false;

      const _currTime = currTime.format();
      const noChange = draft[dateBeingChanged] === _currTime;

      if (noChange) return false;

      const diffDay = currTime.day() !== dayjs(draft.startDate).day();
      if (diffDay) return false;

      const sameStart = currTime.format() === draft.startDate;
      if (sameStart) return false;

      return true;
    },
    [dateBeingChanged, draft],
  );

  const resize = useCallback(
    (e: MouseEvent) => {
      const oppositeKey =
        dateBeingChanged === "startDate" ? "endDate" : "startDate";

      const flipIfNeeded = (currTime: Dayjs) => {
        let startDate = draft?.startDate;
        let endDate = draft?.endDate;

        let justFlipped = false;
        let dateKey = dateBeingChanged;
        const opposite = dayjs(draft?.[oppositeKey]);
        const comparisonKeyword =
          dateBeingChanged === "startDate" ? "after" : "before";

        if (comparisonKeyword === "after") {
          if (currTime.isAfter(opposite)) {
            dateKey = oppositeKey;
            startDate = draft?.endDate;
            setDateBeingChanged(dateKey);

            justFlipped = true;
          }
        } else if (comparisonKeyword === "before") {
          if (currTime.isBefore(opposite)) {
            setDateBeingChanged(oppositeKey);
            startDate = dayjs(startDate)
              .subtract(GRID_TIME_STEP, "minutes")
              .format();
            endDate = dayjs(startDate).add(GRID_TIME_STEP, "minutes").format();

            justFlipped = true;
          }
        }

        closeForm();
        setDraft((_draft): Schema_GridEvent => {
          return {
            ..._draft!,
            _id: _draft!._id!,
            hasFlipped: justFlipped,
            endDate: endDate!,
            startDate: startDate!,
            priority: draft!.priority,
          };
        });

        return justFlipped;
      };

      e.preventDefault();
      e.stopPropagation();

      if (!isResizing) return;

      const x = getX(e, isSidebarOpen);
      const currTime = dateCalcs.getDateByXY(
        x,
        e.clientY,
        weekProps.component.startOfView,
      );

      if (!isValidMovement(currTime)) {
        return;
      }

      const justFlipped = flipIfNeeded(currTime);
      const dateChanged = justFlipped ? oppositeKey : dateBeingChanged;

      const origTime = dayjs(dateChanged ? draft?.[dateChanged] : null);
      const diffMin = currTime.diff(origTime, "minute");
      const updatedTime = origTime.add(diffMin, "minutes").format();

      const hasMoved = diffMin !== 0;

      if (!resizeStatus?.hasMoved && hasMoved) {
        setResizeStatus({ hasMoved: true });
      }

      setDraft((_draft): Schema_GridEvent => {
        return {
          ..._draft!,
          ...(dateChanged ? { [dateChanged]: updatedTime } : {}),
        };
      });
    },
    [
      closeForm,
      dateBeingChanged,
      dateCalcs,
      draft,
      isResizing,
      isSidebarOpen,
      isValidMovement,
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
    isInstance,
    isRecurrence,
    isRecurrenceChanged,
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
