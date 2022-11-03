import { MouseEvent, useCallback, useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { Priorities } from "@core/constants/core.constants";
import { getDefaultEvent } from "@web/common/utils/event.util";
import {
  selectDraft,
  selectDraftStatus,
} from "@web/ducks/events/event.selectors";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { draftSlice, deleteEventSlice } from "@web/ducks/events/event.slice";
import {
  Schema_GridEvent,
  Status_DraftEvent,
} from "@web/common/types/web.event.types";
import { YEAR_MONTH_DAY_FORMAT } from "@web/common/constants/date.constants";
import { getElemById, getX } from "@web/common/utils/grid.util";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";

import { WeekProps } from "../useWeek";
import { useDraftUtils } from "./useDraftUtils";
import { useEventListener } from "../mouse/useEventListener";

export interface Status_Drag {
  hasMoved?: boolean;
  initialMinutesDifference?: number;
  initialYOffset?: number;
}

interface Status_Resize {
  hasMoved: boolean;
}
// simple offset to give space for the times label
//  - getting diff (in pixels) between top of event and e.clientY
//    would be more accurate
const Y_BUFFER = 15;

export const useGridDraft = (
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
  isSidebarOpen: boolean
) => {
  const dispatch = useDispatch();

  const draftUtil = useDraftUtils();

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [draft, setDraft] = useState<Schema_GridEvent | null>(null);
  const [dragStatus, setDragStatus] = useState<Status_Drag | null>(null);
  const [resizeStatus, setResizeStatus] = useState<Status_Resize | null>(null);
  const [dateBeingChanged, setDateBeingChanged] = useState<
    "startDate" | "endDate" | null
  >("endDate");

  const reduxDraft = useSelector(selectDraft) as Schema_Event;

  const {
    activity,
    dateToResize,
    eventType: reduxDraftType,
    isDrafting,
  } = useSelector(selectDraftStatus) as Status_DraftEvent;

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

  const discard = useCallback(() => {
    if (draft) {
      setDraft(null);
    }

    if (reduxDraft || reduxDraftType) {
      dispatch(draftSlice.actions.discard());
    }
  }, [dispatch, draft, reduxDraft, reduxDraftType]);

  const handleChange = useCallback(() => {
    if (isDrafting) {
      if (activity === "createShortcut") {
        const defaultDraft = getDefaultEvent(
          reduxDraftType,
          reduxDraft.startDate,
          reduxDraft.endDate
        );
        setDraft({ ...defaultDraft, isOpen: true });
        return;
      }

      const shouldResetDraft = draft?.isOpen;
      if (shouldResetDraft) {
        setDraft(null);
        setIsResizing(false);
        setIsDragging(false);
        setDragStatus(null);
        setResizeStatus(null);
        setDateBeingChanged(null);

        if (reduxDraft) {
          dispatch(draftSlice.actions.discard());
        }
        return;
      }

      setDraft({ ...reduxDraft, isOpen: false });

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
        const initialDiffMin = dayjs(_draft.endDate).diff(
          _draft.startDate,
          "minutes"
        );

        setDragStatus({
          initialMinutesDifference: initialDiffMin,
          initialYOffset: Y_BUFFER,
        });

        return { ..._draft, isOpen: false };
      });
    }
  }, [isDragging]);

  const submit = useCallback(() => {
    draftUtil.submit(draft);

    // workaround for event not showing up upon first render
    const startWeek = dayjs(draft.startDate).week();
    if (startWeek !== weekProps.component.week) {
      weekProps.state.setWeek(startWeek - 1);
    }

    discard();
  }, []);

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
          const y = e.clientY - dragStatus?.initialYOffset || Y_BUFFER;

          const _initialStart = dateCalcs.getDateByXY(
            x,
            y,
            weekProps.component.startOfSelectedWeekDay
          );

          const startDate = _draft?.isAllDay
            ? _initialStart.format(YEAR_MONTH_DAY_FORMAT)
            : _initialStart.format();

          const _end = _initialStart.add(
            dragStatus?.initialMinutesDifference || 0,
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
        console.error("trying to drag before setting isDragging");
        return;
      }
      const x = getX(e, isSidebarOpen);

      const currTime = dateCalcs.getDateStrByXY(
        x,
        e.clientY,
        weekProps.component.startOfSelectedWeekDay
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
      dateCalcs,
      draft?.startDate,
      dragStatus?.hasMoved,
      dragStatus?.initialMinutesDifference,
      dragStatus?.initialYOffset,
      isDragging,
      isSidebarOpen,
      weekProps.component.startOfSelectedWeekDay,
    ]
  );

  const isValidMovement = useCallback(
    (currTime: Dayjs) => {
      const noChange = draft[dateBeingChanged] === currTime.format();
      if (noChange) return false;

      const diffDay = currTime.day() !== dayjs(draft.startDate).day();
      if (diffDay) return false;

      const sameStart = currTime.format() === draft.startDate;
      if (sameStart) return false;

      return true;
    },
    [dateBeingChanged, draft]
  );

  const getNextAction = useCallback(
    (category: Categories_Event) => {
      let shouldSubmit: boolean;
      let hasMoved: boolean;
      const isNew = !draft._id;

      if (category === Categories_Event.TIMED) {
        hasMoved = resizeStatus?.hasMoved || dragStatus?.hasMoved;
        shouldSubmit = !draft.isOpen;
      } else if (category === Categories_Event.ALLDAY) {
        hasMoved = dragStatus?.hasMoved;
        shouldSubmit = hasMoved;
      }

      const clickedOnExisting = !isNew && !hasMoved;
      const shouldOpenForm = (isNew || clickedOnExisting) && !draft.isOpen;

      return { shouldOpenForm, shouldSubmit };
    },
    [draft?._id, draft?.isOpen, dragStatus?.hasMoved, resizeStatus?.hasMoved]
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

        if (comparisonKeyword === "after") {
          // if (currTime.isSame(opposite) || currTime.isAfter(opposite)) {
          if (currTime.isAfter(opposite)) {
            dateKey = oppositeKey;
            startDate = draft.endDate;
            setDateBeingChanged(dateKey);
          }
        }

        if (comparisonKeyword === "before") {
          if (currTime.isBefore(opposite)) {
            // if (currTime.isSame(opposite) || currTime.isBefore(opposite)) {
            dateKey = oppositeKey;
            endDate = draft.startDate;
            setDateBeingChanged(dateKey);
          }
        }

        setDraft((_draft) => {
          return {
            ..._draft,
            isOpen: false,
            endDate,
            startDate,
            priority: draft.priority,
            [dateKey]: currTime.format(),
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
        weekProps.component.startOfSelectedWeekDay
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
      weekProps.component.startOfSelectedWeekDay,
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

  const _onAllDayRowMouseUp = useCallback(() => {
    if (isDragging) {
      stopDragging();
    }

    if (!draft || !isDrafting) {
      return;
    }

    if (isDrafting && reduxDraftType === Categories_Event.SOMEDAY) {
      discard();
      return;
    }

    const { shouldSubmit, shouldOpenForm } = getNextAction(
      Categories_Event.ALLDAY
    );

    if (shouldOpenForm) {
      setDraft((_draft) => {
        return { ..._draft, isOpen: true };
      });
      return;
    }

    shouldSubmit && submit();
  }, [
    isDragging,
    draft,
    isDrafting,
    reduxDraftType,
    getNextAction,
    submit,
    discard,
  ]);

  const _onMainGridMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!draft || !isDrafting) {
        return;
      }

      if (isDrafting && reduxDraft === Categories_Event.ALLDAY) {
        discard();
        return;
      }

      if (isDrafting && reduxDraftType === Categories_Event.SOMEDAY) {
        e.stopPropagation();
        discard();
        return;
      }

      if (isResizing) {
        stopResizing();
      }

      if (isDragging) {
        stopDragging();
      }

      const { shouldSubmit, shouldOpenForm } = getNextAction(
        Categories_Event.TIMED
      );
      if (shouldOpenForm) {
        setDraft((_draft) => {
          return { ..._draft, isOpen: true };
        });
        return;
      }

      shouldSubmit && submit();
    },
    [
      discard,
      draft,
      getNextAction,
      isDrafting,
      isDragging,
      isResizing,
      reduxDraftType,
      submit,
    ]
  );

  const _onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isResizing && !draft.isAllDay) {
        resize(e);
      } else if (isDragging) {
        drag(e);
      }
    },
    [draft?.isAllDay, isDragging, isResizing]
  );

  useEventListener("mousemove", _onMouseMove);
  useEventListener("mouseup", _onMainGridMouseUp, getElemById(ID_GRID_MAIN));

  return {
    draftState: {
      draft,
      isResizing,
      isDragging,
    },
    draftHelpers: {
      deleteEvent,
      discard,
      setDateBeingChanged,
      setIsDragging,
      setIsResizing,
      setDraft,
      submit,
    },
  };
};
