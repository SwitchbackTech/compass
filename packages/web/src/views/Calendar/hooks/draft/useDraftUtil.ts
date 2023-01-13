import { MouseEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import {
  Schema_GridEvent,
  Status_DraftEvent,
} from "@web/common/types/web.event.types";
import { getX } from "@web/common/utils/grid.util";
import {
  editEventSlice,
  createEventSlice,
  deleteEventSlice,
  draftSlice,
} from "@web/ducks/events/event.slice";
import { useCallback, useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { getDefaultEvent, prepareEvent } from "@web/common/utils/event.util";
import {
  selectDraft,
  selectDraftStatus,
} from "@web/ducks/events/event.selectors";

import { DateCalcs } from "../grid/useDateCalcs";
import { WeekProps } from "../useWeek";
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

export const useDraftUtil = (
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
  isSidebarOpen: boolean
) => {
  const dispatch = useDispatch();

  const reduxDraft = useSelector(selectDraft) as Schema_Event;
  const {
    activity,
    dateToResize,
    eventType: reduxDraftType,
    isDrafting,
  } = useSelector(selectDraftStatus) as Status_DraftEvent;

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [draft, setDraft] = useState<Schema_GridEvent | null>(null);
  const [dragStatus, setDragStatus] = useState<Status_Drag | null>(null);
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
          reduxDraft.startDate,
          reduxDraft.endDate
        );
        setDraft({ ...defaultDraft, isOpen: true });
        return;
      }

      // const shouldResetDraft = draft?.isOpen;
      // if (shouldResetDraft) {
      //   console.log("resettitng draft...");
      //   setDraft(null);
      //   setIsResizing(false);
      //   setIsDragging(false);
      //   setDragStatus(null);
      //   setResizeStatus(null);
      //   setDateBeingChanged(null);

      //++
      // if (reduxDraft) {
      //   dispatch(draftSlice.actions.discard());
      // }
      // return;
      // }

      // console.log("setting to false");
      // setDraft({ ...reduxDraft, isOpen: false });
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
        //++
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

  const submit = (draft: Schema_GridEvent) => {
    const event = prepareEvent(draft);
    const isExisting = event._id;
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
