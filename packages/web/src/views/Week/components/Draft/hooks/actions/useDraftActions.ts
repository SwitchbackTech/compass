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
import { getDragDurationMinutes } from "./drag-duration.util";

const scopeFromApplyTo = (
  applyTo: RecurringEventUpdateScope,
): RecurrenceScope =>
  applyTo === RecurringEventUpdateScope.ALL_EVENTS
    ? "all"
    : applyTo === RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS
      ? "thisAndFollowing"
      : "this";

export const useDraftActions = (
  draftState: State_Draft_Local,
  setters: Setters_Draft,
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
) => {
  const mutations = useEventMutations();
  const { data: calendars } = useCalendarsQuery();
  const gridDraftFromStore = useDraftStore(selectGridDraft);

  const { activity, isDrafting } = useDraftStore(selectDraftStatus)!;

  const {
    dateBeingChanged,
    draft,
    dragOffset,
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
    setDragOffset,
    setDragStatus,
    setResizeStatus,
    setDateBeingChanged,
    setDraft,
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
      setIsResizing(true);
      setDateBeingChanged(dateBeingChanged);
    },
    [setIsResizing, setDateBeingChanged],
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
  }, [setIsResizing, setResizeStatus, setDateBeingChanged]);

  const discard = useCallback(() => {
    setDraft(null);
    setIsDragging(false);
    setIsFormOpen(false);
    setIsResizing(false);
    setDragStatus(null);
    setResizeStatus(null);
    setDateBeingChanged(null);

    if (gridDraftFromStore || isDrafting) {
      draftActions.discard();
    }
  }, [
    gridDraftFromStore,
    isDrafting,
    setDateBeingChanged,
    setDraft,
    setDragStatus,
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
      const nextDraft = applyDraftKeyboardReposition({
        activity,
        draft,
        key,
        isStartAllowed: (nextStart) => isInsideVisibleWeek(dayjs(nextStart)),
      });
      if (!nextDraft) return false;

      setDraft(nextDraft);
      return true;
    },
    [activity, draft, isInsideVisibleWeek, setDraft],
  );

  const drag = useCallback(
    (e: Omit<PartialMouseEvent, "currentTarget">) => {
      const updateTimesDuringDrag = (
        e: Omit<PartialMouseEvent, "currentTarget">,
      ) => {
        if (!draft) return;

        const isAllDay = draft.values.schedule.kind === "allDay";
        const rawX = e.clientX;
        const x = isAllDay ? rawX - dragOffset.x : rawX;
        const startEndDurationMin = getDragDurationMinutes(
          draft.values.schedule,
          dragStatus,
        );

        const y = e.clientY - dragOffset.y;

        let eventStart = dateCalcs.getDateByXY(
          x,
          y,
          weekProps.component.startOfView,
        );

        let eventEnd = eventStart.add(startEndDurationMin, "minutes");

        if (!isAllDay) {
          // Edge case: timed events' end times can overflow past midnight at the bottom of the grid.
          // Below logic prevents that from occurring.
          if (eventEnd.date() !== eventStart.date()) {
            eventEnd = eventEnd.hour(0).minute(0);
            eventStart = eventEnd.subtract(startEndDurationMin, "minutes");
          }
        }

        const schedule: GridScheduleDraft = isAllDay
          ? {
              kind: "allDay",
              start: eventStart.toDate(),
              end: eventEnd.toDate(),
            }
          : {
              ...draft.values.schedule,
              start: eventStart.toDate(),
              end: eventEnd.toDate(),
            };

        const nextDraft = replaceGridDraftSchedule(draft, schedule);

        setDraft(nextDraft);
      };
      if (!isDragging) {
        devAlert("not dragging (anymore?)");
        return;
      }

      const currTime = dateCalcs.getDateStrByXY(
        e.clientX,
        e.clientY,
        weekProps.component.startOfView,
      );
      const draftStartStr = draft
        ? dayjs(draft.values.schedule.start).format()
        : undefined;
      const hasMoved = currTime !== draftStartStr;

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
      dateCalcs,
      weekProps.component.startOfView,
      draft,
      dragOffset,
      dragStatus,
      setDraft,
      setDragStatus,
    ],
  );

  const isValidMovement = useCallback(
    (currTime: dayjs.Dayjs) => {
      if (!draft || !dateBeingChanged) return false;

      const isAllDay = draft.values.schedule.kind === "allDay";
      if (isAllDay) {
        return true;
      }

      const draftDate =
        dateBeingChanged === "startDate"
          ? draft.values.schedule.start
          : draft.values.schedule.end;
      const _currTime = currTime.format();
      const noChange = dayjs(draftDate).format() === _currTime;

      if (noChange) return false;

      const diffDay =
        currTime.day() !== dayjs(draft.values.schedule.start).day();
      if (diffDay) return false;

      const sameStart =
        _currTime === dayjs(draft.values.schedule.start).format();
      if (sameStart) return false;

      return true;
    },
    [dateBeingChanged, draft],
  );

  const resize = useCallback(
    (e: MouseEvent) => {
      // Freeze the origin against the store draft: local `setDraft` updates
      // mid-gesture must not shift the resize baseline.
      if (!draft || !gridDraftFromStore) return;

      const isAllDay = draft.values.schedule.kind === "allDay";
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
        startDate: formatDraftDate(draft.values.schedule.start),
        endDate: formatDraftDate(draft.values.schedule.end),
      };
      const originDates: Record<"startDate" | "endDate", string> = {
        startDate: formatDraftDate(gridDraftFromStore.values.schedule.start),
        endDate: formatDraftDate(gridDraftFromStore.values.schedule.end),
      };

      const flipIfNeeded = (currTime: Dayjs) => {
        let startDate = draftDates.startDate;
        let endDate = draftDates.endDate;

        let justFlipped = false;
        let dateKey = dateBeingChanged;
        const opposite = dayjs(draftDates[oppositeKey]);
        const comparisonKeyword =
          dateBeingChanged === "startDate" ? "after" : "before";

        if (comparisonKeyword === "after") {
          if (currTime.isAfter(opposite)) {
            dateKey = oppositeKey;
            startDate = draftDates.endDate;
            setDateBeingChanged(dateKey);

            justFlipped = true;
          }
        } else if (comparisonKeyword === "before") {
          if (currTime.isBefore(opposite)) {
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
              ...draft.values.schedule,
              start: dayjs(startDate).toDate(),
              end: dayjs(endDate).toDate(),
            };

        setDraft((_draft) => {
          if (!_draft) return _draft;

          return replaceGridDraftSchedule(_draft, schedule);
        });

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

      if (!isValidMovement(currTime)) {
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

      setDraft((_draft) => {
        if (!_draft) return _draft;

        const nextSchedule: GridScheduleDraft = {
          ..._draft.values.schedule,
          ...(dateChanged === "startDate"
            ? { start: dayjs(updatedTime).toDate() }
            : { end: dayjs(updatedTime).toDate() }),
        } as GridScheduleDraft;

        return replaceGridDraftSchedule(_draft, nextSchedule);
      });
    },
    [
      dateBeingChanged,
      dateCalcs,
      draft,
      gridDraftFromStore,
      isResizing,
      isValidMovement,
      resizeStatus?.hasMoved,
      setDateBeingChanged,
      setDraft,
      setIsFormOpen,
      setResizeStatus,
      weekProps.component.startOfView,
    ],
  );

  const create = useCallback(async () => {
    if (!gridDraftFromStore) return;

    setDraft(gridDraftFromStore);
    setIsFormOpen(true);
  }, [gridDraftFromStore, setDraft, setIsFormOpen]);

  const handleChange = useCallback(async () => {
    if (!isDrafting) return;
    if (activity === "eventRightClick") {
      return; // Prevents form and context menu from opening at same time
    }
    if (activity === "keyboardEdit") {
      if (gridDraftFromStore) setDraft(gridDraftFromStore);
      setIsFormOpen(true);
      return;
    }
    if (activity === "createShortcut" || activity === "gridClick") {
      await create();
      return;
    }
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

  const actions = {
    submit,
    discard,
    drag,
    repositionDraftByKeyboard,
    resize,
    setLocalDraft: setDraft,
    startDragging: (offset?: DragOffset) => {
      // Placing `setIsFormOpenBeforeDragging` here rather than inside `startDragging`
      // because `setIsFormOpenBeforeDragging` depends on `isFormOpen` and re-calculates
      // `startDragging` (due to it being a react callback) which causes issues.
      // This is a hacky solution to the issue.
      setIsFormOpenBeforeDragging(isFormOpen);
      startDragging(offset);
    },
    startResizing,
    stopDragging,
    stopResizing,
  };

  useDraftEffects(draftState, setters, weekProps, isDrafting, handleChange);

  return actions;
};
export type Actions_Draft = ReturnType<typeof useDraftActions>;
