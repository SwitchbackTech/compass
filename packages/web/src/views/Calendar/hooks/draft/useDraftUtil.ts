import { MouseEvent } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  Priorities,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
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
import { useCallback, useEffect, useState } from "react";
import {
  getDefaultEvent,
  prepEvtBeforeConvertToSomeday,
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

import { DateCalcs } from "../grid/useDateCalcs";
import { WeekProps } from "../useWeek";
export interface Status_Drag {
  durationMin: number;
  hasMoved?: boolean;
}

interface Status_Resize {
  hasMoved: boolean;
}

export const useDraftUtil = (
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

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [draft, setDraft] = useState<Schema_GridEvent | null>(null);
  const [dragStatus, setDragStatus] = useState<Status_Drag | null>();
  const [resizeStatus, setResizeStatus] = useState<Status_Resize | null>(null);
  const [dateBeingChanged, setDateBeingChanged] = useState<
    "startDate" | "endDate" | null
  >("endDate");

  useEffect(() => {
    setDraft(null);
    setIsDragging(false);
    setIsResizing(false);
    setDragStatus(null);
    setResizeStatus(null);
    setDateBeingChanged(null);
  }, [weekProps.component.week]);

  useEffect(() => {
    if (isResizing) {
      setDraft((_draft) => {
        setDateBeingChanged(dateBeingChanged);
        return { ..._draft, isOpen: false };
      });
    }
  }, [dateBeingChanged, isResizing]);

  useEffect(() => {
    const isStaleDraft = !isDrafting && draft?.isOpen;
    if (isStaleDraft) {
      setDraft(null);
      return;
    }
  }, [isDrafting, draft?.isOpen]);

  const handleChange = useCallback(() => {
    if (isDrafting) {
      if (activity === "createShortcut") {
        const defaultDraft = getDefaultEvent(
          reduxDraftType,
          reduxDraft?.startDate,
          reduxDraft?.endDate
        );
        setDraft({ ...defaultDraft, isOpen: true });
        return;
      }

      setDraft(reduxDraft);

      if (activity === "dragging") {
        setIsDragging(true);
        return;
      }

      if (activity === "resizing") {
        setIsResizing(true);
        setDateBeingChanged(dateToResize);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activity,
    dateToResize,
    dispatch,
    isDrafting,
    reduxDraft,
    reduxDraftType,
  ]);

  useEffect(() => {
    handleChange();
  }, [handleChange]);

  useEffect(() => {
    if (isDragging) {
      setDraft((_draft) => {
        const durationMin = dayjs(_draft.endDate).diff(
          _draft.startDate,
          "minutes"
        );

        setDragStatus({
          durationMin,
        });

        return { ..._draft, isOpen: false };
      });
    }
  }, [dateCalcs, isDragging]);

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
    const event = prepEvtBeforeConvertToSomeday(_draft);
    dispatch(getWeekEventsSlice.actions.convert({ event }));

    discard();
  };

  const deleteEvent = () => {
    if (draft._id) {
      dispatch(deleteEventSlice.actions.request({ _id: draft._id }));
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
      const flipIfNeeded = (currTime: Dayjs) => {
        let startDate = draft.startDate;
        let endDate = draft.endDate;

        let dateKey = dateBeingChanged;
        const oppositeKey =
          dateBeingChanged === "startDate" ? "endDate" : "startDate";
        const opposite = dayjs(draft[oppositeKey]);

        const comparisonKeyword =
          dateBeingChanged === "startDate" ? "after" : "before";

        const isSame = currTime.isSame(opposite);

        if (comparisonKeyword === "after") {
          if (currTime.isAfter(opposite)) {
            dateKey = oppositeKey;
            startDate = draft.endDate;
            setDateBeingChanged(dateKey);
          } else if (isSame) {
            setDateBeingChanged(oppositeKey);
            endDate = dayjs(endDate).add(GRID_TIME_STEP, "minutes").format();
          }
        } else if (comparisonKeyword === "before") {
          if (currTime.isBefore(opposite)) {
            setDateBeingChanged(oppositeKey);
            startDate = dayjs(startDate)
              .subtract(GRID_TIME_STEP, "minutes")
              .format();
            endDate = dayjs(startDate).add(GRID_TIME_STEP, "minutes").format();
          }
        }

        setDraft((_draft) => {
          return {
            ..._draft,
            isOpen: false,
            endDate,
            startDate,
            priority: draft.priority,
          };
        });
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

      flipIfNeeded(currTime);

      const origTime = dayjs(draft[dateBeingChanged]);
      const diffMin = currTime.diff(origTime, "minute");
      const updatedTime = origTime.add(diffMin, "minutes").format();

      const hasMoved = diffMin !== 0;

      if (!resizeStatus?.hasMoved && hasMoved) {
        setResizeStatus({ hasMoved: true });
      }

      setDraft((_draft) => {
        return { ..._draft, [dateBeingChanged]: updatedTime };
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

  const submit = (draft: Schema_GridEvent) => {
    const event = prepEvtBeforeSubmit(draft);

    const isExisting = event._id;
    // include param for how to handle recurrences
    if (isExisting) {
      dispatch(
        editEventSlice.actions.request({
          _id: event._id,
          event,
        })
      );
    } else {
      dispatch(createEventSlice.actions.request(event));
    }

    discard();
  };

  return {
    draftState: {
      draft,
      dragStatus,
      isDrafting,
      isDragging,
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
      setIsResizing,
      stopDragging,
      stopResizing,
      submit,
    },
  };
};

export type Hook_GridUtil = ReturnType<typeof useDraftUtil>;
export type State_GridDraft = Hook_GridUtil["draftState"];
export type Util_GridDraft = Hook_GridUtil["draftUtil"];
