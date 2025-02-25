import dayjs, { Dayjs } from "dayjs";
import { MouseEvent, useCallback } from "react";
import {
  Priorities,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { validateEvent } from "@core/validators/event.validator";
import { getUserId } from "@web/auth/auth.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  assembleDefaultEvent,
  prepEvtBeforeSubmit,
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
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";
import { useDraftEffects } from "../effects/useDraftEffects";
import { Setters_Draft, State_Draft_Local } from "../state/useDraftState";

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
  const {
    activity,
    dateToResize,
    eventType: reduxDraftType,
    isDrafting,
  } = useAppSelector(selectDraftStatus);

  const {
    dateBeingChanged,
    draft,
    dragStatus,
    isDragging,
    isResizing,
    resizeStatus,
  } = draftState;

  const {
    setIsDragging,
    setIsResizing,
    setDragStatus,
    setResizeStatus,
    setDateBeingChanged,
    setDraft,
    setIsFormOpen,
  } = setters;

  const startDragging = useCallback(() => {
    setDraft(reduxDraft);
    setIsDragging(true);
  }, [reduxDraft]);

  const startResizing = useCallback(() => {
    setDraft(reduxDraft);
    setIsResizing(true);
    setDateBeingChanged(dateToResize);
  }, [reduxDraft, dateToResize]);

  const stopDragging = () => {
    setIsDragging(false);
    setDragStatus(null);
  };

  const stopResizing = () => {
    setIsResizing(false);
    setResizeStatus(null);
    setDateBeingChanged("endDate");
  };

  const submit = async (draft: Schema_GridEvent) => {
    const userId = await getUserId();
    const event = prepEvtBeforeSubmit(draft, userId);
    const { startOfView, endOfView } = weekProps.component;

    const isExisting = event._id;
    if (isExisting) {
      const isOutsideView =
        !dayjs(event.startDate).isBetween(startOfView, endOfView, null, "[]") &&
        !dayjs(event.endDate).isBetween(startOfView, endOfView, null, "[]");

      const shouldRemove = isOutsideView ? true : false;
      const payload = { _id: event._id, event, shouldRemove };
      dispatch(editEventSlice.actions.request(payload));
    } else {
      dispatch(createEventSlice.actions.request(event));
    }

    discard();
  };

  const closeForm = () => {
    setIsFormOpen(false);
  };

  const convert = (start: string, end: string) => {
    if (isAtWeeklyLimit) {
      alert(SOMEDAY_WEEK_LIMIT_MSG);
      return;
    }

    const _draft = {
      ...draft,
      isAllDay: false,
      isSomeday: true,
      startDate: start,
      endDate: end,
      order: somedayWeekCount,
    };
    const event = validateEvent(_draft);
    dispatch(getWeekEventsSlice.actions.convert({ event }));

    discard();
  };

  const deleteEvent = () => {
    if (reduxDraft?._id) {
      dispatch(deleteEventSlice.actions.request({ _id: reduxDraft._id }));
    }
    discard();
  };

  const discard = useCallback(() => {
    if (draft) {
      setDraft(null);
    }

    if (reduxDraft || reduxDraftType) {
      dispatch(draftSlice.actions.discard());
    }
  }, [dispatch, draft, reduxDraft, reduxDraftType]);

  const drag = useCallback(
    (e: MouseEvent) => {
      const updateTimesDuringDrag = (e: MouseEvent) => {
        if (!draft) return;

        const x = getX(e, isSidebarOpen);
        const startEndDurationMin = dragStatus?.durationMin || 0;

        let eventStart = dateCalcs.getDateByXY(
          x,
          e.clientY,
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
        alert("not dragging (anymore?)");
        return;
      }

      const x = getX(e, isSidebarOpen);
      const currTime = dateCalcs.getDateStrByXY(
        x,
        e.clientY,
        weekProps.component.startOfView,
      );
      const hasMoved = currTime !== draft.startDate;

      if (!dragStatus?.hasMoved && hasMoved) {
        setDragStatus((_status) => ({
          ..._status,
          hasMoved: true,
        }));
      }

      updateTimesDuringDrag(e);
    },
    [
      isDragging,
      isSidebarOpen,
      dateCalcs,
      weekProps.component.startOfView,
      draft?.startDate,
      dragStatus?.hasMoved,
      dragStatus?.durationMin,
    ],
  );

  const isValidMovement = useCallback(
    (currTime: dayjs.Dayjs) => {
      if (!draft || !dateBeingChanged) return false;

      const _currTime = currTime.format();
      const noChange = draft[draft.dateBeingChanged] === _currTime;
      if (noChange) return false;

      const diffDay = currTime.day() !== dayjs(draft.startDate).day();
      if (diffDay) return false;

      const sameStart = currTime.format() === draft.startDate;
      if (sameStart) return false;

      return true;
    },
    [dateBeingChanged, draft],
  );

  const openForm = () => {
    setIsFormOpen(true);
  };

  const reset = () => {
    setDraft(null);
    setIsDragging(false);
    closeForm();
    setIsResizing(false);
    setDragStatus(null);
    setResizeStatus(null);
    setDateBeingChanged(null);
  };

  const resize = useCallback(
    (e: MouseEvent) => {
      const oppositeKey =
        dateBeingChanged === "startDate" ? "endDate" : "startDate";

      const flipIfNeeded = (currTime: Dayjs) => {
        let startDate = draft.startDate;
        let endDate = draft.endDate;

        let justFlipped = false;
        let dateKey = dateBeingChanged;
        const opposite = dayjs(draft[oppositeKey]);
        const comparisonKeyword =
          dateBeingChanged === "startDate" ? "after" : "before";

        if (comparisonKeyword === "after") {
          if (currTime.isAfter(opposite)) {
            dateKey = oppositeKey;
            startDate = draft.endDate;
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
        setDraft((_draft) => {
          return {
            ..._draft,
            hasFlipped: justFlipped,
            endDate,
            startDate,
            priority: draft.priority,
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

      const origTime = dayjs(draft[dateChanged]);
      const diffMin = currTime.diff(origTime, "minute");
      const updatedTime = origTime.add(diffMin, "minutes").format();

      const hasMoved = diffMin !== 0;

      if (!resizeStatus?.hasMoved && hasMoved) {
        setResizeStatus({ hasMoved: true });
      }

      setDraft((_draft) => {
        return { ..._draft, [dateChanged]: updatedTime };
      });
    },
    [
      dateBeingChanged,
      dateCalcs,
      draft,
      isResizing,
      isSidebarOpen,
      isValidMovement,
      resizeStatus?.hasMoved,
      weekProps.component.startOfView,
    ],
  );

  const create = useCallback(async () => {
    const draftingExisting = reduxDraft !== null;
    if (draftingExisting) {
      setDraft(reduxDraft as Schema_GridEvent);
    } else {
      const defaultDraft = (await assembleDefaultEvent(
        reduxDraftType,
        reduxDraft?.startDate,
        reduxDraft?.endDate,
      )) as Schema_GridEvent;
      setDraft(defaultDraft);
    }
    openForm();
  }, [reduxDraft, reduxDraftType]);

  const handleChange = useCallback(async () => {
    if (!isDrafting) return;

    if (activity === "eventRightClick") {
      return; // Prevents form and context menu from opening at same time
    }

    if (activity === "createShortcut" || activity === "gridClick") {
      await create();
      return;
    }

    if (activity === "dragging") {
      startDragging();
      return;
    }

    if (activity === "resizing") {
      startResizing();
    }
  }, [activity, startDragging, startResizing, create, isDrafting]);

  useDraftEffects(draftState, setters, weekProps, isDrafting, handleChange);

  return {
    closeForm,
    submit,
    convert,
    deleteEvent,
    discard,
    drag,
    openForm,
    reset,
    resize,
    stopDragging,
    stopResizing,
  };
};
export type Actions_Draft = ReturnType<typeof useDraftActions>;
