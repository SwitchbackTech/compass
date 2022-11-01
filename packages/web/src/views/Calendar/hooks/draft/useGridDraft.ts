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
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";

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
      console.log("stale event");
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
  }, [discard, draft, draftUtil, weekProps.component.week, weekProps.state]);

  const deleteEvent = () => {
    if (draft._id) {
      dispatch(deleteEventSlice.actions.request({ _id: draft._id }));
    }
    discard();
  };

  const drag = (e: MouseEvent) => {
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
  };

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

  const isValidMovement = (currTime: Dayjs) => {
    const noChange = draft[dateBeingChanged] === currTime.format();
    if (noChange) return false;

    const diffDay = currTime.day() !== dayjs(draft.startDate).day();
    if (diffDay) return false;

    const sameStart = currTime.format() === draft.startDate;
    if (sameStart) return false;

    return true;
  };

  const resize = (e: MouseEvent) => {
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
  };

  const stopDragging = () => {
    setIsDragging(false);
    setDragStatus(null);
  };

  const stopResizing = () => {
    setIsResizing(false);
    setResizeStatus(null);
    setDateBeingChanged("endDate");
  };

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

  const _onAllDayRowMouseUp = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        stopDragging();
      }

      if (isDrafting && reduxDraftType === Categories_Event.SOMEDAY) {
        e.stopPropagation();
        discard();
        return;
      }

      const shouldOpenForm = !draft?.isOpen;
      // if (!draft._id && shouldOpenForm) {
      if (shouldOpenForm) {
        setDraft((_draft) => {
          return { ..._draft, isOpen: true };
        });
      }
    },
    [discard, draft?.isOpen, isDrafting, isDragging, reduxDraftType]
  );

  const _onMainGridMouseUp = useCallback(
    (e: MouseEvent) => {
      console.log("maingrid up");
      // if (!draft) {
      if (!draft || !isDrafting) {
        // e.stopPropagation();
        console.log("skipping mouse action, cuz no draft");
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
        console.log("stopping resize");
        stopResizing();
      }
      if (isDragging) {
        console.log("stopping drag [main]");
        stopDragging();
      }

      const isNew = !draft._id;
      const hasMoved = resizeStatus?.hasMoved || dragStatus?.hasMoved;
      const clickedOnExisting = !isNew && !hasMoved;
      const shouldOpenForm = (isNew || clickedOnExisting) && !draft.isOpen;
      const shouldSubmit = !draft.isOpen;

      if (shouldOpenForm) {
        console.log("opening form...");
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
      dragStatus?.hasMoved,
      isDrafting,
      isDragging,
      isResizing,
      reduxDraft,
      reduxDraftType,
      resizeStatus?.hasMoved,
      submit,
    ]
  );

  const _onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isResizing && !draft?.isAllDay) {
        resize(e);
      } else if (isDragging) {
        drag(e);
      }
    },
    [draft?.isAllDay, drag, isDragging, isResizing, resize]
  );

  useEventListener("mousemove", _onMouseMove);
  useEventListener("mouseup", _onMainGridMouseUp, getElemById(ID_GRID_MAIN));
  useEventListener(
    "mouseup",
    _onAllDayRowMouseUp,
    getElemById(ID_GRID_ALLDAY_ROW)
  );

  return {
    draftState: {
      draft,
      isResizing,
      isDragging,
    },
    draftHelpers: {
      deleteEvent,
      discard,
      resize,
      setDateBeingChanged,
      setIsDragging,
      setIsResizing,
      setDraft,
      stopResizing,
      submit,
    },
  };
};

//++
// export type Hook_Draft = ReturnType<typeof useGridDraft>;
// export type Helpers_Draft = Hook_Draft["draftHelpers"];
