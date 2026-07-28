import { useCallback } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type RecurrenceScope } from "@core/types/event-command.contracts";
import { devAlert } from "@core/util/app.util";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { getDefaultTargetCalendar } from "@web/calendars/calendar.util";
import { type PartialMouseEvent } from "@web/common/types/util.types";
import { RecurringEventUpdateScope } from "@web/common/types/web.event.types";
import { repositionDraftByKeyboard as applyDraftKeyboardReposition } from "@web/common/utils/draft/reposition-draft-by-keyboard.util";
import { DirtyParser } from "@web/common/utils/parse/dirty.parser";
import {
  type GridEventDraft,
  type GridScheduleDraft,
} from "@web/events/event-draft.types";
import {
  parseGridEventDraft,
  replaceGridDraftSchedule,
} from "@web/events/grid-event-draft.adapter";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import {
  draftActions,
  selectDraftStatus,
  selectGridDraft,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { GRID_TIME_STEP } from "@web/grid/grid.constants";
import { useDraftEffects } from "@web/views/Week/components/Draft/hooks/effects/useDraftEffects";
import {
  type DragOffset,
  type Setters_Draft,
  type State_Draft_Local,
  type Status_Drag,
} from "@web/views/Week/components/Draft/hooks/state/useDraftState";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { resolveDraftDragSchedule } from "./draft-drag-schedule.util";

const scopeFromApplyTo = (
  applyTo: RecurringEventUpdateScope,
): RecurrenceScope =>
  applyTo === RecurringEventUpdateScope.ALL_EVENTS
    ? "all"
    : applyTo === RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS
      ? "thisAndFollowing"
      : "this";

const readLiveDraft = (): GridEventDraft | null =>
  useDraftStore.getState().gridDraft;

export const useDraftActions = (
  draftState: State_Draft_Local,
  setters: Setters_Draft,
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
) => {
  const mutations = useEventMutations();
  const { data: calendars } = useCalendarsQuery();
  // Prefer the store selector so high-frequency gesture writes stay in sync
  // with React renders; gesture handlers also re-read via getState().
  const draft = useDraftStore(selectGridDraft);

  const { activity, isDrafting } = useDraftStore(selectDraftStatus)!;

  const {
    dateBeingChanged,
    dragOffset,
    dragStatus,
    gestureOriginDraft,
    isDragging,
    isResizing,
    resizeStatus,
    isFormOpen,
    isFormOpenBeforeDragging,
  } = draftState;

  const {
    setIsDragging,
    setIsResizing,
    setDragOffset,
    setDragStatus,
    setGestureOriginDraft,
    setResizeStatus,
    setDateBeingChanged,
    setIsFormOpen,
    setIsFormOpenBeforeDragging,
  } = setters;

  const startDragging = useCallback(
    (offset?: DragOffset) => {
      if (offset) {
        setDragOffset(offset);
      }
      setIsDragging(true);
    },
    [setDragOffset, setIsDragging],
  );

  const startResizing = useCallback(
    (dateBeingChanged: "startDate" | "endDate") => {
      const liveDraft = readLiveDraft();
      if (liveDraft) {
        setGestureOriginDraft(liveDraft);
      }
      setIsResizing(true);
      setDateBeingChanged(dateBeingChanged);
    },
    [setDateBeingChanged, setGestureOriginDraft, setIsResizing],
  );

  const stopDragging = useCallback(() => {
    setIsDragging(false);
    setDragStatus(null);
    setIsFormOpenBeforeDragging(null);
  }, [setIsDragging, setDragStatus, setIsFormOpenBeforeDragging]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    setResizeStatus(null);
    setDateBeingChanged("endDate");
    setGestureOriginDraft(null);
  }, [
    setDateBeingChanged,
    setGestureOriginDraft,
    setIsResizing,
    setResizeStatus,
  ]);

  const discard = useCallback(() => {
    setIsDragging(false);
    setIsFormOpen(false);
    setIsResizing(false);
    setDragStatus(null);
    setResizeStatus(null);
    setDateBeingChanged(null);
    setGestureOriginDraft(null);
    draftActions.discard();
  }, [
    setDateBeingChanged,
    setDragStatus,
    setGestureOriginDraft,
    setIsDragging,
    setIsFormOpen,
    setIsResizing,
    setResizeStatus,
  ]);

  const determineSubmitAction = useCallback(
    (draft: GridEventDraft) => {
      if (draft.kind !== "edit") return "CREATE";

      if (isFormOpenBeforeDragging) {
        return "OPEN_FORM";
      }

      const isSame = !DirtyParser.isGridDraftDirty(draft);
      if (isSame) {
        // no need to make HTTP request
        return "DISCARD";
      }

      return "UPDATE";
    },
    [isFormOpenBeforeDragging],
  );

  const submit = useCallback(
    async (
      draft: GridEventDraft,
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
      const action = determineSubmitAction(draft);
      switch (action) {
        case "OPEN_FORM":
          setIsFormOpen(true);
          return;
        case "DISCARD":
          discard();
          return;
        case "CREATE": {
          if (draft.kind !== "create") return;

          // Respects a calendar the user explicitly chose via CalendarSelect;
          // only an untouched draft (calendarId still null) falls back to the
          // default target calendar.
          const calendarId =
            draft.values.calendarId ??
            getDefaultTargetCalendar(calendars ?? [])?.id;
          if (!calendarId) return;

          const parsed = parseGridEventDraft({
            ...draft,
            values: { ...draft.values, calendarId },
          });

          if (parsed.ok && parsed.mode === "create") {
            mutations.create(parsed.input);
          }
          return;
        }
        case "UPDATE": {
          if (draft.kind !== "edit") {
            discard();
            return;
          }

          const scope = scopeFromApplyTo(applyTo);
          const parsed = parseGridEventDraft({
            ...draft,
            values: { ...draft.values, scope },
          });

          if (parsed.ok && parsed.mode === "edit") {
            mutations.replace({ id: parsed.eventId, input: parsed.input });
          }

          if (isFormOpenBeforeDragging) {
            setIsFormOpen(true);
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
      calendars,
      determineSubmitAction,
      discard,
      isFormOpenBeforeDragging,
      mutations,
      setIsFormOpen,
    ],
  );

  const isInsideVisibleWeek = useCallback(
    (start: Dayjs) => {
      const viewStart = weekProps.component.startOfView.startOf("day");
      const viewEnd = weekProps.component.endOfView.startOf("day");

      return (
        !start.isBefore(viewStart, "day") && !start.isAfter(viewEnd, "day")
      );
    },
    [weekProps.component.endOfView, weekProps.component.startOfView],
  );

  const repositionDraftByKeyboard = useCallback(
    (key: string) => {
      const liveDraft = readLiveDraft();
      const nextDraft = applyDraftKeyboardReposition({
        activity,
        draft: liveDraft,
        key,
        isStartAllowed: (nextStart) => isInsideVisibleWeek(dayjs(nextStart)),
      });
      if (!nextDraft) return false;

      draftActions.setGridDraft(nextDraft);
      return true;
    },
    [activity, isInsideVisibleWeek],
  );

  const applyDragPosition = useCallback(
    (
      e: Omit<PartialMouseEvent, "currentTarget">,
      offset: DragOffset,
      status: Status_Drag | null,
    ) => {
      const liveDraft = readLiveDraft();
      if (!liveDraft) return;

      const { durationMin, schedule } = resolveDraftDragSchedule({
        clientX: e.clientX,
        clientY: e.clientY,
        dragOffset: offset,
        dragStatus: status,
        getDateByXY: dateCalcs.getDateByXY,
        schedule: liveDraft.values.schedule,
        startOfView: weekProps.component.startOfView,
      });

      const nextDraft = replaceGridDraftSchedule(liveDraft, schedule);
      const prev = liveDraft.values.schedule;
      const kindChanged = prev.kind !== schedule.kind;
      const hasMoved =
        kindChanged ||
        !dayjs(prev.start).isSame(schedule.start) ||
        !dayjs(prev.end).isSame(schedule.end);

      draftActions.setGridDraft(nextDraft);

      // Cross-row conversion switches between grab-offset and absolute pointer
      // placement; clear the stale offset so the next frame doesn't jump.
      if (kindChanged) {
        setDragOffset({ x: 0, y: 0 });
      }

      if (
        (!status?.hasMoved && hasMoved) ||
        (status != null && status.durationMin !== durationMin)
      ) {
        setDragStatus(
          (_status): Status_Drag => ({
            durationMin,
            hasMoved: Boolean(_status?.hasMoved || hasMoved),
          }),
        );
      }
    },
    [
      dateCalcs.getDateByXY,
      setDragOffset,
      setDragStatus,
      weekProps.component.startOfView,
    ],
  );

  const drag = useCallback(
    (e: Omit<PartialMouseEvent, "currentTarget">) => {
      if (!isDragging) {
        devAlert("not dragging (anymore?)");
        return;
      }

      applyDragPosition(e, dragOffset, dragStatus);
    },
    [applyDragPosition, dragOffset, dragStatus, isDragging],
  );

  const isValidMovement = useCallback(
    (currTime: dayjs.Dayjs, liveDraft: GridEventDraft) => {
      if (!dateBeingChanged) return false;

      const isAllDay = liveDraft.values.schedule.kind === "allDay";
      if (isAllDay) {
        return true;
      }

      const draftDate =
        dateBeingChanged === "startDate"
          ? liveDraft.values.schedule.start
          : liveDraft.values.schedule.end;
      const _currTime = currTime.format();
      const noChange = dayjs(draftDate).format() === _currTime;

      if (noChange) return false;

      const diffDay =
        currTime.day() !== dayjs(liveDraft.values.schedule.start).day();
      if (diffDay) return false;

      const sameStart =
        _currTime === dayjs(liveDraft.values.schedule.start).format();
      if (sameStart) return false;

      return true;
    },
    [dateBeingChanged],
  );

  const resize = useCallback(
    (e: MouseEvent) => {
      const liveDraft = readLiveDraft();
      // Freeze the origin against the gesture snapshot so live store updates
      // mid-gesture must not shift the resize baseline.
      if (!liveDraft || !gestureOriginDraft) return;

      const isAllDay = liveDraft.values.schedule.kind === "allDay";
      const _dateBeingChanged = dateBeingChanged as "startDate" | "endDate";
      const oppositeKey =
        _dateBeingChanged === "startDate" ? "endDate" : "startDate";

      // String mirrors of the draft's live schedule, formatted exactly as
      // the legacy GridEvent draft stored them (all-day: day-only
      // YEAR_MONTH_DAY_FORMAT strings; timed: full offset strings). The flip
      // math below is unchanged dayjs-string arithmetic ported verbatim from
      // before the GridEventDraft conversion, reading/writing through this
      // mirror instead of native GridEvent fields.
      const formatDraftDate = (date: Date) =>
        isAllDay
          ? dayjs(date).format(YEAR_MONTH_DAY_FORMAT)
          : dayjs(date).format();
      const draftDates: Record<"startDate" | "endDate", string> = {
        startDate: formatDraftDate(liveDraft.values.schedule.start),
        endDate: formatDraftDate(liveDraft.values.schedule.end),
      };
      const originDates: Record<"startDate" | "endDate", string> = {
        startDate: formatDraftDate(gestureOriginDraft.values.schedule.start),
        endDate: formatDraftDate(gestureOriginDraft.values.schedule.end),
      };

      let workingDraft = liveDraft;
      let workingDateBeingChanged = dateBeingChanged;

      const flipIfNeeded = (currTime: Dayjs) => {
        let startDate = draftDates.startDate;
        let endDate = draftDates.endDate;

        let justFlipped = false;
        let dateKey = workingDateBeingChanged;
        const opposite = dayjs(draftDates[oppositeKey]);
        const comparisonKeyword =
          workingDateBeingChanged === "startDate" ? "after" : "before";

        if (comparisonKeyword === "after") {
          if (currTime.isAfter(opposite)) {
            dateKey = oppositeKey;
            startDate = draftDates.endDate;
            workingDateBeingChanged = dateKey;
            setDateBeingChanged(dateKey);

            justFlipped = true;
          }
        } else if (comparisonKeyword === "before") {
          if (currTime.isBefore(opposite)) {
            workingDateBeingChanged = oppositeKey;
            setDateBeingChanged(oppositeKey);
            if (isAllDay) {
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

        setIsFormOpen(false);

        const schedule: GridScheduleDraft = isAllDay
          ? {
              kind: "allDay",
              start: dayjs(startDate).toDate(),
              end: dayjs(endDate).toDate(),
            }
          : {
              ...workingDraft.values.schedule,
              start: dayjs(startDate).toDate(),
              end: dayjs(endDate).toDate(),
            };

        workingDraft = replaceGridDraftSchedule(workingDraft, schedule);
        return justFlipped;
      };

      e.preventDefault();
      e.stopPropagation();

      if (!isResizing) return;

      // For all-day events, use a fixed Y coordinate (0) because Y positioning is irrelevant:
      const y = isAllDay ? 0 : e.clientY;
      const currTime = dateCalcs.getDateByXY(
        e.clientX,
        y,
        weekProps.component.startOfView,
      );

      if (!isValidMovement(currTime, workingDraft)) {
        return;
      }

      const justFlipped = flipIfNeeded(currTime);
      const dateChanged = justFlipped ? oppositeKey : _dateBeingChanged;

      const origTime = dayjs(originDates[dateChanged]).add(-1, "day");

      let updatedTime: string;
      let hasMoved: boolean;

      if (isAllDay) {
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

      const nextSchedule: GridScheduleDraft = {
        ...workingDraft.values.schedule,
        ...(dateChanged === "startDate"
          ? { start: dayjs(updatedTime).toDate() }
          : { end: dayjs(updatedTime).toDate() }),
      } as GridScheduleDraft;

      draftActions.setGridDraft(
        replaceGridDraftSchedule(workingDraft, nextSchedule),
      );
    },
    [
      dateBeingChanged,
      dateCalcs,
      gestureOriginDraft,
      isResizing,
      isValidMovement,
      resizeStatus?.hasMoved,
      setDateBeingChanged,
      setIsFormOpen,
      setResizeStatus,
      weekProps.component.startOfView,
    ],
  );

  const handleChange = useCallback(async () => {
    if (!isDrafting) return;
    if (activity === "eventRightClick") {
      return; // Prevents form and context menu from opening at same time
    }
    if (activity === "keyboardEdit") {
      setIsFormOpen(true);
      return;
    }
    if (activity === "createShortcut" || activity === "gridClick") {
      setIsFormOpen(true);
      return;
    }
<<<<<<< HEAD
    if (activity === "creating") {
      // Mirror the running drag-create preview. Deliberately does not start a
      // local resize: `resize()` freezes the store draft as its origin, so
      // letting it run against a store draft that moves with the pointer would
      // collapse its math.
      if (gridDraftFromStore) setDraft(gridDraftFromStore);
    }
  }, [
    isDrafting,
    activity,
    create,
    setDraft,
    gridDraftFromStore,
    setIsFormOpen,
  ]);
=======
    if (activity === "resizing") {
      if (dateToResize === "startDate" || dateToResize === "endDate") {
        startResizing(dateToResize);
      }
    }
  }, [isDrafting, activity, dateToResize, setIsFormOpen, startResizing]);
>>>>>>> d408b41c (refactor(web): make zustand the sole draft values owner)

  const actions = {
    submit,
    discard,
    drag,
    repositionDraftByKeyboard,
    resize,
    startDragging: (
      offset?: DragOffset,
      initialEvent?: Omit<PartialMouseEvent, "currentTarget">,
    ) => {
      // Capture form-open before startDragging so the callback identity of
      // startDragging does not depend on isFormOpen (which would recreate it
      // and disrupt gesture start). Gesture policy only — not draft ownership.
      setIsFormOpenBeforeDragging(isFormOpen);
      const nextOffset = offset ?? { x: 0, y: 0 };
      startDragging(offset);
      // Apply the pointer position immediately. Drag often begins only after the
      // pointer has already left the all-day row; waiting for the next mousemove
      // (and for isDragging to commit) can miss the cross-row conversion entirely
      // on a short gesture.
      if (initialEvent) {
        applyDragPosition(initialEvent, nextOffset, dragStatus);
      }
    },
    startResizing,
    stopDragging,
    stopResizing,
  };

  useDraftEffects(
    { ...draftState, draft },
    setters,
    weekProps,
    isDrafting,
    handleChange,
  );

  return actions;
};
export type Actions_Draft = ReturnType<typeof useDraftActions>;
