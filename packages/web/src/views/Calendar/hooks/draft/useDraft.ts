import { MouseEvent, useCallback, useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  Priorities,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { validateEvent } from "@core/validators/event.validator";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getX } from "@web/common/utils/grid.util";
import {
  editEventSlice,
  createEventSlice,
  deleteEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import {
  assembleDefaultEvent,
  prepEvtBeforeSubmit,
} from "@web/common/utils/event.util";
import {
  selectDraft,
  selectDraftStatus,
} from "@web/ducks/events/selectors/draft.selectors";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";
import {
  selectIsAtWeeklyLimit,
  selectSomedayWeekCount,
} from "@web/ducks/events/selectors/someday.selectors";
import { getUserId } from "@web/auth/auth.util";

import { DateCalcs } from "../grid/useDateCalcs";
import { WeekProps } from "../useWeek";
import { useDraftForm } from "./form/useDraftForm";
import { useDraftState } from "./state/useDraftState";

export const useDraft = (
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
  isSidebarOpen: boolean
) => {
  const dispatch = useAppDispatch();

  const reduxDraft = useAppSelector(selectDraft);
  const {
    activity,
    dateToResize,
    eventType: reduxDraftType,
    isDrafting,
  } = useAppSelector(selectDraftStatus);
  const somedayWeekCount = useAppSelector(selectSomedayWeekCount);

  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);

  const { state, setters } = useDraftState();
  const {
    isDragging,
    isResizing,
    draft,
    dragStatus,
    resizeStatus,
    dateBeingChanged,
    isFormOpen,
  } = state;

  const {
    setIsDragging,
    setIsResizing,
    setDraft,
    setDragStatus,
    setResizeStatus,
    setDateBeingChanged,
    setIsFormOpen,
  } = setters;

  useEffect(() => {
    reset();
    discard();
  }, [weekProps.component.week]);

  useEffect(() => {
    if (isResizing) {
      setDateBeingChanged(dateBeingChanged);
      setIsFormOpen(false);
    }
  }, [dateBeingChanged, isResizing]);

  useEffect(() => {
    const isStaleDraft = !isDrafting && isFormOpen;
    if (isStaleDraft) {
      setDraft(null);
      return;
    }
  }, [isDrafting, isFormOpen]);

  const reset = () => {
    setDraft(null);
    setIsDragging(false);
    setIsFormOpen(false);
    setIsResizing(false);
    setDragStatus(null);
    setResizeStatus(null);
    setDateBeingChanged(null);
  };

  const discard = useCallback(() => {
    if (draft) {
      setDraft(null);
    }

    if (reduxDraft || reduxDraftType) {
      dispatch(draftSlice.actions.discard());
    }
  }, [dispatch, draft, reduxDraft, reduxDraftType]);

  const handleResizing = useCallback(() => {
    console.log("-setting local draft to:", reduxDraft);
    setDraft(reduxDraft);
    setIsResizing(true);
    setDateBeingChanged(dateToResize);
  }, [reduxDraft, dateToResize]);

  const handleDragging = useCallback(() => {
    setDraft(reduxDraft);
    setIsDragging(true);
  }, [reduxDraft]);

  const handleShortcutOrClick = useCallback(async () => {
    const draftingExisting = reduxDraft !== null;
    if (draftingExisting) {
      console.log("!setting local draft to:", reduxDraft);
      setDraft(reduxDraft);
    } else {
      const defaultDraft = (await assembleDefaultEvent(
        reduxDraftType,
        reduxDraft?.startDate,
        reduxDraft?.endDate
      )) as Schema_GridEvent;
      setDraft(defaultDraft);
    }
    setIsFormOpen(true);
  }, [reduxDraft, reduxDraftType]);

  const handleChange = useCallback(async () => {
    if (!isDrafting) return;

    if (activity === "createShortcut" || activity === "gridClick") {
      await handleShortcutOrClick();
      return;
    }

    if (activity === "dragging") {
      handleDragging();
      return;
    }

    if (activity === "resizing") {
      handleResizing();
    }
  }, [
    activity,
    handleDragging,
    handleResizing,
    handleShortcutOrClick,
    isDrafting,
  ]);

  useEffect(() => {
    handleChange();
  }, [handleChange]);

  useEffect(() => {
    if (isDragging) {
      setIsFormOpen(false);
      setDraft((_draft) => {
        const durationMin = dayjs(_draft.endDate).diff(
          _draft.startDate,
          "minutes"
        );

        setDragStatus({
          durationMin,
        });

        return draft;
      });
    }
  }, [isDragging]);

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
    if (draft._id) {
      dispatch(deleteEventSlice.actions.request({ _id: draft._id }));
    }
    discard();
  };

  const drag = useCallback(
    (e: MouseEvent) => {
      const updateTimesDuringDrag = (e: MouseEvent) => {
        setDraft((_draft) => {
          const x = getX(e, isSidebarOpen);
          const _initialStart = dateCalcs.getDateByXY(
            x,
            e.clientY,
            weekProps.component.startOfView
          );

          const startDate = _draft?.isAllDay
            ? _initialStart.format(YEAR_MONTH_DAY_FORMAT)
            : _initialStart.format();

          const _end = _initialStart.add(
            dragStatus?.durationMin || 0,
            "minutes"
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
        weekProps.component.startOfView
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
    ]
  );

  const isValidMovement = useCallback(
    (currTime: Dayjs) => {
      const _currTime = currTime.format();

      const noChange = draft[dateBeingChanged] === _currTime;
      if (noChange) return false;

      const diffDay = currTime.day() !== dayjs(draft.startDate).day();
      if (diffDay) return false;

      const sameStart = currTime.format() === draft.startDate;
      if (sameStart) return false;

      return true;
    },
    [dateBeingChanged, draft]
  );

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
        weekProps.component.startOfView
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
    ]
  );

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

  const { formProps } = useDraftForm(isFormOpen, reset, discard, setIsFormOpen);

  return {
    draftState: {
      draft,
      dragStatus,
      formProps,
      isDrafting,
      isDragging,
      isFormOpen,
      isResizing,
      reduxDraft,
      reduxDraftType,
      resizeStatus,
    },
    draftUtil: {
      convert,
      deleteEvent,
      discard,
      drag,
      resize,
      setDateBeingChanged,
      setDraft,
      setIsDragging,
      setIsFormOpen,
      setIsResizing,
      stopDragging,
      stopResizing,
      submit,
    },
  };
};

export type Hook_Draft = ReturnType<typeof useDraft>;
export type State_Draft = Hook_Draft["draftState"];
export type Util_GridDraft = Hook_Draft["draftUtil"];
