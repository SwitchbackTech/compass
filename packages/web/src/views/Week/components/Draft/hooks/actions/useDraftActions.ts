import { useCallback, useMemo, useRef } from "react";
import { type RecurrenceScope } from "@core/types/event-command.contracts";
import { devAlert } from "@core/util/app.util";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import { type PartialMouseEvent } from "@web/common/types/util.types";
import { RecurringEventUpdateScope } from "@web/common/types/web.event.types";
import { repositionDraftByKeyboard as applyDraftKeyboardReposition } from "@web/common/utils/draft/reposition-draft-by-keyboard.util";
import { DirtyParser } from "@web/common/utils/parse/dirty.parser";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  parseGridEventDraft,
  replaceGridDraftSchedule,
} from "@web/events/grid-event-draft.adapter";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import {
  draftActions,
  selectDraftStatus,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  clearGestureEphemera,
  useDraftEffects,
} from "@web/views/Week/components/Draft/hooks/effects/useDraftEffects";
import {
  type DragOffset,
  type Setters_Draft,
  type State_Draft_Local,
  type Status_Drag,
} from "@web/views/Week/components/Draft/hooks/state/useDraftState";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { resolveDraftDragSchedule } from "./draft-drag-schedule.util";
import { resizeDraft } from "./draft-resize.util";

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
  const defaultTargetCalendarId = useDefaultTargetCalendar(calendars ?? [])?.id;
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
    clearGestureEphemera(setters);
    draftActions.discard();
  }, [setters]);

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
          const calendarId = draft.values.calendarId ?? defaultTargetCalendarId;
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
            const started = mutations.replace(
              { id: parsed.eventId, input: parsed.input },
              isFormOpenBeforeDragging
                ? undefined
                : { onOptimisticApplied: discard },
            );
            if (!started && !isFormOpenBeforeDragging) {
              discard();
            }
          } else if (!isFormOpenBeforeDragging) {
            discard();
          }

          if (isFormOpenBeforeDragging) {
            setIsFormOpen(true);
          }
          return;
        }
        default:
          break;
      }
    },
    [
      defaultTargetCalendarId,
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

  const resize = useCallback(
    (e: MouseEvent) => {
      const liveDraft = readLiveDraft();
      // Freeze the origin against the gesture snapshot so live store updates
      // mid-gesture must not shift the resize baseline.
      if (!liveDraft || !gestureOriginDraft || !dateBeingChanged) return;

      e.preventDefault();
      e.stopPropagation();

      if (!isResizing) return;

      // For all-day events, use a fixed Y coordinate (0) because Y positioning is irrelevant:
      const y = liveDraft.values.schedule.kind === "allDay" ? 0 : e.clientY;
      const currTime = dateCalcs.getDateByXY(
        e.clientX,
        y,
        weekProps.component.startOfView,
      );

      const result = resizeDraft({
        currTime,
        dateBeingChanged,
        draft: liveDraft,
        origin: gestureOriginDraft,
      });
      if (!result) return;

      setIsFormOpen(false);
      if (result.flippedTo) setDateBeingChanged(result.flippedTo);
      if (!resizeStatus?.hasMoved && result.hasMoved) {
        setResizeStatus({ hasMoved: true });
      }
      draftActions.setGridDraft(result.draft);
    },
    [
      dateBeingChanged,
      dateCalcs,
      gestureOriginDraft,
      isResizing,
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
    if (
      activity === "keyboardEdit" ||
      activity === "createShortcut" ||
      activity === "gridClick"
    ) {
      setIsFormOpen(true);
    }
    // "creating": store already owns the live drag-create preview — no
    // local mirror or resize start needed.
  }, [isDrafting, activity, setIsFormOpen]);

  // Read at call time so startDragging's identity does not churn when the form
  // opens or when dragStatus updates mid-gesture (#2497 memo chain).
  const isFormOpenRef = useRef(isFormOpen);
  isFormOpenRef.current = isFormOpen;
  const dragStatusRef = useRef(dragStatus);
  dragStatusRef.current = dragStatus;

  const startDraggingAction = useCallback(
    (
      offset?: DragOffset,
      initialEvent?: Omit<PartialMouseEvent, "currentTarget">,
    ) => {
      // Gesture policy only — not draft ownership.
      setIsFormOpenBeforeDragging(isFormOpenRef.current);
      const nextOffset = offset ?? { x: 0, y: 0 };
      startDragging(offset);
      // Apply the pointer position immediately. Drag often begins only after the
      // pointer has already left the all-day row; waiting for the next mousemove
      // (and for isDragging to commit) can miss the cross-row conversion entirely
      // on a short gesture.
      if (initialEvent) {
        applyDragPosition(initialEvent, nextOffset, dragStatusRef.current);
      }
    },
    [applyDragPosition, setIsFormOpenBeforeDragging, startDragging],
  );

  const actions = useMemo(
    () => ({
      submit,
      discard,
      drag,
      repositionDraftByKeyboard,
      resize,
      startDragging: startDraggingAction,
      startResizing,
      stopDragging,
      stopResizing,
    }),
    [
      discard,
      drag,
      repositionDraftByKeyboard,
      resize,
      startDraggingAction,
      startResizing,
      stopDragging,
      stopResizing,
      submit,
    ],
  );

  useDraftEffects(draftState, setters, weekProps, isDrafting, handleChange);

  return actions;
};
export type Actions_Draft = ReturnType<typeof useDraftActions>;
