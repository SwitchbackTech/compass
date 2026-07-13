import { ObjectId } from "bson";
import { useCallback } from "react";
import { Priorities } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { EventIdSchema } from "@core/types/domain-primitives";
import {
  Categories_Event,
  RecurringEventUpdateScope,
} from "@core/types/event.types";
import { type RecurrenceScope } from "@core/types/event-command.contracts";
import { devAlert } from "@core/util/app.util";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { getDefaultTargetCalendar } from "@web/calendars/calendar.util";
import { type PartialMouseEvent } from "@web/common/types/util.types";
import {
  getArrowKeyMovement,
  isTimedEventInsideOneDay,
} from "@web/common/utils/event/event-nudge.util";
import { DirtyParser } from "@web/common/utils/parse/dirty.parser";
import {
  type GridEventDraft,
  type GridScheduleDraft,
} from "@web/events/event-draft.types";
import {
  createGridEventDraft,
  duplicateGridEventDraft,
  parseGridEventDraft,
  replaceGridDraftSchedule,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import {
  draftActions,
  selectDraft,
  selectDraftStatus,
  selectGridDraft,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { useDraftEffects } from "@web/views/Week/components/Draft/hooks/effects/useDraftEffects";
import {
  type Setters_Draft,
  type State_Draft_Local,
  type Status_Drag,
} from "@web/views/Week/components/Draft/hooks/state/useDraftState";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { GRID_TIME_STEP } from "@web/views/Week/layout.constants";
import { getDragDurationMinutes } from "./drag-duration.util";

const scopeFromApplyTo = (
  applyTo: RecurringEventUpdateScope,
): RecurrenceScope =>
  applyTo === RecurringEventUpdateScope.ALL_EVENTS
    ? "all"
    : applyTo === RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS
      ? "thisAndFollowing"
      : "this";

const canRepositionDraftByKeyboard = (activity: string | null | undefined) =>
  activity === "createShortcut" ||
  activity === "gridClick" ||
  activity === "keyboardEdit";

export const useDraftActions = (
  draftState: State_Draft_Local,
  setters: Setters_Draft,
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
) => {
  const mutations = useEventMutations();
  const { data: calendars } = useCalendarsQuery();
  const draftFromStore = useDraftStore(selectDraft);
  const gridDraftFromStore = useDraftStore(selectGridDraft);

  const { activity, dateToResize, eventType, isDrafting } =
    useDraftStore(selectDraftStatus)!;

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
    setDragStatus,
    setResizeStatus,
    setDateBeingChanged,
    setDraft,
    setDraftSessionKey,
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

  const isInstance = useCallback((): boolean => {
    return ObjectId.isValid(draftFromStore?.recurrence?.eventId ?? "");
  }, [draftFromStore?.recurrence?.eventId]);

  const isRecurrence = useCallback((): boolean => {
    const hasRRule = Array.isArray(draftFromStore?.recurrence?.rule);

    return hasRRule || isInstance();
  }, [draftFromStore?.recurrence?.rule, isInstance]);

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

    if (draftFromStore || eventType) {
      draftActions.discard();
    }
  }, [draftFromStore, eventType, reset]);

  const deleteEvent = useCallback(
    (
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
      // No confirmation prompt: deletes are undoable via Cmd/Ctrl+Z
      const draftId = draft?.kind === "edit" ? draft.source.id : undefined;
      const storeId = draftFromStore?._id
        ? EventIdSchema.safeParse(draftFromStore._id)
        : undefined;
      const id = draftId ?? (storeId?.success ? storeId.data : undefined);

      if (id) {
        mutations.delete({ id, scope: scopeFromApplyTo(applyTo) });
      }
      discard();
    },
    [draft, draftFromStore, discard, mutations],
  );

  const openForm = useCallback(() => {
    setIsFormOpen(true);
  }, [setIsFormOpen]);

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
          openForm();
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
      calendars,
      determineSubmitAction,
      discard,
      isFormOpenBeforeDragging,
      mutations,
      openForm,
    ],
  );

  const duplicateEvent = useCallback(() => {
    if (!gridDraftFromStore) {
      discard();
      return;
    }

    if (gridDraftFromStore.kind !== "edit") {
      // In-progress, not-yet-saved draft: duplicate its current form values.
      void submit({
        kind: "create",
        source: null,
        values: { ...gridDraftFromStore.values },
      });
      discard();
      return;
    }

    const duplicate = duplicateGridEventDraft(
      gridDraftFromStore.source,
      calendars ?? [],
    );
    if (!duplicate) {
      discard();
      return;
    }

    // duplicateGridEventDraft always drops recurrence (built for Day, which
    // has no recurring-series duplication UX). Week must preserve a
    // series-base event's rule on duplicate — matching the legacy
    // MapEvent.removeProviderData behavior this replaces, which kept
    // `recurrence.rule` for a series but dropped an occurrence's `eventId`
    // link (an occurrence's duplicate becomes standalone, since it carries
    // no rule of its own).
    const sourceRecurrence = gridDraftFromStore.source.recurrence;
    const withRecurrence: GridEventDraft =
      sourceRecurrence.kind === "series" && duplicate.kind === "create"
        ? {
            ...duplicate,
            values: {
              ...duplicate.values,
              recurrence: {
                kind: "series",
                rules: [...sourceRecurrence.rules],
              },
            },
          }
        : duplicate;

    void submit(withRecurrence);
    discard();
  }, [calendars, gridDraftFromStore, submit, discard]);

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
      if (!canRepositionDraftByKeyboard(activity) || !draft) return false;

      const isAllDay = draft.values.schedule.kind === "allDay";
      const movement = getArrowKeyMovement(key, isAllDay);
      if (!movement) return false;

      const start = dayjs(draft.values.schedule.start);
      const end = dayjs(draft.values.schedule.end);
      const nextStart = start
        .add(movement.days, "day")
        .add(movement.minutes, "minutes");
      const nextEnd = end
        .add(movement.days, "day")
        .add(movement.minutes, "minutes");

      if (!isInsideVisibleWeek(nextStart)) return false;

      if (!isAllDay && !isTimedEventInsideOneDay(nextStart, nextEnd)) {
        return false;
      }

      const schedule: GridScheduleDraft = isAllDay
        ? { kind: "allDay", start: nextStart.toDate(), end: nextEnd.toDate() }
        : {
            ...draft.values.schedule,
            start: nextStart.toDate(),
            end: nextEnd.toDate(),
          };

      setDraft(replaceGridDraftSchedule(draft, schedule));

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

        setDraft({
          ...nextDraft,
          values: {
            ...nextDraft.values,
            priority: nextDraft.values.priority || Priorities.UNASSIGNED,
          },
        } as GridEventDraft);
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
      if (!draft || !draftFromStore) return; // TS Guard

      const isAllDay = draft.values.schedule.kind === "allDay";
      const _dateBeingChanged = dateBeingChanged as "startDate" | "endDate";
      const oppositeKey =
        _dateBeingChanged === "startDate" ? "endDate" : "startDate";

      // String mirrors of the draft's live schedule, formatted exactly as
      // the legacy Schema_GridEvent draft stored them (all-day: day-only
      // YEAR_MONTH_DAY_FORMAT strings; timed: full offset strings). The flip
      // math below is unchanged dayjs-string arithmetic ported verbatim from
      // before the GridEventDraft conversion, reading/writing through this
      // mirror instead of native Schema_GridEvent fields.
      const formatDraftDate = (date: Date) =>
        isAllDay
          ? dayjs(date).format(YEAR_MONTH_DAY_FORMAT)
          : dayjs(date).format();
      const draftDates: Record<"startDate" | "endDate", string> = {
        startDate: formatDraftDate(draft.values.schedule.start),
        endDate: formatDraftDate(draft.values.schedule.end),
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

        closeForm();

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

          const withSchedule = replaceGridDraftSchedule(_draft, schedule);

          return {
            ...withSchedule,
            values: {
              ...withSchedule.values,
              priority: draft.values.priority,
            },
          } as GridEventDraft;
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

      const origTime = dayjs(draftFromStore[dateChanged]).add(-1, "day");

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
      closeForm,
      dateBeingChanged,
      dateCalcs,
      draft,
      draftFromStore,
      isResizing,
      isValidMovement,
      resizeStatus?.hasMoved,
      setDateBeingChanged,
      setDraft,
      setResizeStatus,
      weekProps.component.startOfView,
    ],
  );

  const create = useCallback(async () => {
    setDraftSessionKey((key) => key + 1);

    if (gridDraftFromStore) {
      setDraft(gridDraftFromStore);
    } else {
      // Rare fallback: a "gridClick" activity started via
      // draftActions.startGridClick (a source event not yet in the query
      // cache), which has no GridEventDraft to hand off. Build a default
      // from the legacy Schema_Event mirror's dates instead.
      const startDate = draftFromStore?.startDate;
      const endDate = draftFromStore?.endDate;
      const isAllDay = eventType === Categories_Event.ALLDAY;

      const schedule: GridScheduleDraft = isAllDay
        ? {
            kind: "allDay",
            start: startDate ? dayjs(startDate).toDate() : dayjs().toDate(),
            end: endDate
              ? dayjs(endDate).toDate()
              : dayjs().add(1, "day").toDate(),
          }
        : timedGridSchedule(
            startDate ? dayjs(startDate).toDate() : dayjs().toDate(),
            endDate ? dayjs(endDate).toDate() : dayjs().add(1, "hour").toDate(),
          );

      setDraft(createGridEventDraft(schedule));
    }

    openForm();
  }, [
    openForm,
    gridDraftFromStore,
    draftFromStore,
    eventType,
    setDraft,
    setDraftSessionKey,
  ]);

  const handleChange = useCallback(async () => {
    if (!isDrafting) return;
    if (activity === "eventRightClick") {
      return; // Prevents form and context menu from opening at same time
    }
    if (activity === "keyboardEdit") {
      setDraftSessionKey((key) => key + 1);
      if (gridDraftFromStore) setDraft(gridDraftFromStore);
      openForm();
      return;
    }
    if (activity === "createShortcut" || activity === "gridClick") {
      await create();
      return;
    }
    if (activity === "resizing") {
      setDraftSessionKey((key) => key + 1);
      if (gridDraftFromStore) setDraft(gridDraftFromStore);
      startResizing();
    }
  }, [
    isDrafting,
    activity,
    create,
    setDraft,
    setDraftSessionKey,
    gridDraftFromStore,
    startResizing,
    openForm,
  ]);

  const actions = {
    closeForm,
    submit,
    deleteEvent,
    duplicateEvent,
    discard,
    drag,
    openForm,
    repositionDraftByKeyboard,
    reset,
    resize,
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
