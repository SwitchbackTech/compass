import { MouseEvent, useCallback } from "react";
import dayjs, { Dayjs } from "dayjs";
import { validateEvent } from "@core/validators/event.validator";
import {
  assembleDefaultEvent,
  prepEvtBeforeSubmit,
} from "@web/common/utils/event.util";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";
import {
  Priorities,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { getUserId } from "@web/auth/auth.util";
import { getX } from "@web/common/utils/grid.util";
import {
  editEventSlice,
  createEventSlice,
  deleteEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import {
  selectIsAtWeeklyLimit,
  selectSomedayWeekCount,
} from "@web/ducks/events/selectors/someday.selectors";
import {
  selectDraft,
  selectDraftStatus,
} from "@web/ducks/events/selectors/draft.selectors";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Setters_Draft, State_Draft_Local } from "../state/useDraftState";
import { useDraftEffects } from "../effects/useDraftEffects";

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
      dispatch(draftSlice.actions.discard({}));
    }
  }, [dispatch, draft, reduxDraft, reduxDraftType]);

  const drag = useCallback(
    (e: MouseEvent) => {
      const updateTimesDuringDrag = (e: MouseEvent) => {
        setDraft((_draft) => {
          const x = getX(e, isSidebarOpen);
          const _initialStart = dateCalcs.getDateByXY(
            x,
            e.clientY,
            weekProps.component.startOfView,
          );

          const startDate = _draft?.isAllDay
            ? _initialStart.format(YEAR_MONTH_DAY_FORMAT)
            : _initialStart.format();

          const _end = _initialStart.add(
            dragStatus?.durationMin || 0,
            "minutes",
          );

          const endDate = _draft.isAllDay
            ? _end.format(YEAR_MONTH_DAY_FORMAT)
            : _end.format();

          return {
            ..._draft,
            startDate,
            endDate,
            priority: _draft?.priority || Priorities.UNASSIGNED,
          };
        });
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
    console.log("opening form...");
    setIsFormOpen(true);
  };

  const reset = () => {
    setDraft(null);
    setIsDragging(false);
    // closeForm();
    setIsFormOpen(false);
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

        // closeForm();
        setIsFormOpen(false);
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

  const handleShortcutOrClick = useCallback(async () => {
    const draftingExisting = reduxDraft !== null;
    if (draftingExisting) {
      setDraft(reduxDraft);
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

    if (activity === "createShortcut") {
      await handleShortcutOrClick();
      return;
    }

    if (activity === "dragging") {
      startDragging();
      return;
    }

    if (activity === "resizing") {
      startResizing();
    }
  }, [
    activity,
    startDragging,
    startResizing,
    handleShortcutOrClick,
    isDrafting,
  ]);

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
