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
  Schema_Event,
  WithCompassId,
} from "@core/types/event.types";
import { StringV4Schema } from "@core/types/type.utils";
import { devAlert } from "@core/util/app.util";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { DirtyParser } from "@web/common/parsers/dirty.parser";
import { EventInViewParser } from "@web/common/parsers/view.parser";
import { PartialMouseEvent } from "@web/common/types/util.types";
import {
  Schema_GridEvent,
  Schema_WebEvent,
} from "@web/common/types/web.event.types";
import {
  addId,
  assembleDefaultEvent,
  isOptimisticEvent,
} from "@web/common/utils/event/event.util";
import { getX } from "@web/common/utils/grid/grid.util";
import { Payload_EditEvent } from "@web/ducks/events/event.types";
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
import { OnSubmitParser } from "@web/views/Calendar/components/Draft/hooks/actions/submit.parser";
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
      const { data: _title } = StringV4Schema.safeParse(reduxDraft?.title);
      const title = _title ?? "this event";
      const usePrefix = applyTo === RecurringEventUpdateScope.ALL_EVENTS;
      const prefix = usePrefix ? "all instances of - " : "";

      const confirmed = window.confirm(`Delete ${prefix}${title}?`);

      if (confirmed && reduxDraft?._id) {
        dispatch(
          deleteEventSlice.actions.request({
            _id: reduxDraft._id,
            applyTo,
          }),
        );
      }
      discard();
    },
    [dispatch, reduxDraft?._id, reduxDraft?.title, discard],
  );

  const convert = useCallback(
    (start: string, end: string) => {
      if (isAtWeeklyLimit) {
        alert(SOMEDAY_WEEK_LIMIT_MSG);
        return;
      }

      const event: WithCompassId<Omit<Schema_WebEvent, "_id">> = {
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
      const isExisting = draft._id && !isOptimisticEvent(draft);
      if (!isExisting) return "CREATE";

      if (isExisting) {
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
    [reduxDraft, isFormOpenBeforeDragging],
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
          const isExisting = draft._id && !isOptimisticEvent(draft);

          if (isExisting) {
            const event = new OnSubmitParser(draft).parse();
            const payload = getEditSlicePayload(event, applyTo);
            dispatch(
              editEventSlice.actions.request(payload as unknown as void),
            );

            if (shouldAddToView(event)) {
              dispatch(getWeekEventsSlice.actions.insert(event._id!));
            }
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

    submit(addId(draft));
    discard();
  }, [reduxDraft, submit, discard]);

  const drag = useCallback(
    (e: Omit<PartialMouseEvent, "currentTarget">) => {
      const updateTimesDuringDrag = (
        e: Omit<PartialMouseEvent, "currentTarget">,
      ) => {
        if (!draft) return;

        const rawX = getX(e as MouseEvent, isSidebarOpen);
        const x = draft.isAllDay ? rawX - draft.position.dragOffset.x : rawX;
        const startEndDurationMin = dragStatus?.durationMin || 0;

        const y = e.clientY - draft.position.dragOffset.y;

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

      if (draft.isAllDay) {
        return true;
      }

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
      if (!draft || !reduxDraft) return; // TS Guard

      const _dateBeingChanged = dateBeingChanged as "startDate" | "endDate";
      const oppositeKey =
        _dateBeingChanged === "startDate" ? "endDate" : "startDate";

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
            if (draft?.isAllDay) {
              // For all-day events, move by day
              startDate = dayjs(startDate)
                .subtract(1, "day")
                .format(YEAR_MONTH_DAY_FORMAT);
              endDate = dayjs(startDate)
                .add(1, "day")
                .format(YEAR_MONTH_DAY_FORMAT);
            } else {
              // For timed events, move by time step
              startDate = dayjs(startDate)
                .subtract(GRID_TIME_STEP, "minutes")
                .format();
              endDate = dayjs(startDate)
                .add(GRID_TIME_STEP, "minutes")
                .format();
            }

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
      // For all-day events, use a fixed Y coordinate (0) because Y positioning is irrelevant:
      const y = draft.isAllDay ? 0 : e.clientY;
      const currTime = dateCalcs.getDateByXY(
        x,
        y,
        weekProps.component.startOfView,
      );

      if (!isValidMovement(currTime)) {
        return;
      }

      const justFlipped = flipIfNeeded(currTime);
      const dateChanged = justFlipped ? oppositeKey : _dateBeingChanged;

      const origTime = dayjs(reduxDraft[dateChanged]).add(-1, "day");

      let updatedTime: string;
      let hasMoved: boolean;

      if (draft?.isAllDay) {
        // For all-day events, work with day differences
        const diffDays = currTime.diff(origTime, "day", true);
        updatedTime = currTime
          .add(dateChanged === "endDate" ? 1 : 0, "day")
          .format(YEAR_MONTH_DAY_FORMAT);
        hasMoved = diffDays !== 0;
      } else {
        // For timed events, work with minute differences
        const diffMin = currTime.diff(origTime, "minute");
        updatedTime = origTime.add(diffMin, "minutes").format();
        hasMoved = diffMin !== 0;
      }

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
      reduxDraft,
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
