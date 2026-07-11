import { ObjectId } from "bson";
import { useCallback, useMemo } from "react";
import {
  Priorities,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { MapEvent } from "@core/mappers/map.event";
import {
  Categories_Event,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { devAlert } from "@core/util/app.util";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { getDefaultTargetCalendar } from "@web/calendars/calendar.util";
import { type PartialMouseEvent } from "@web/common/types/util.types";
import {
  type Schema_GridEvent,
  type Schema_WebEvent,
} from "@web/common/types/web.event.types";
import { assembleDefaultEvent } from "@web/common/utils/event/event.util";
import {
  getArrowKeyMovement,
  isTimedEventInsideOneDay,
} from "@web/common/utils/event/event-nudge.util";
import { buildConvertToSomedayEvent } from "@web/common/utils/event/someday.event.util";
import { DirtyParser } from "@web/common/utils/parse/dirty.parser";
import { EventInViewParser } from "@web/common/utils/parse/view.parser";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { type Payload_EditEvent } from "@web/events/event.types";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { createLegacyEventMutationsAdapter } from "@web/events/queries/event.legacy-bridge";
import { useSomedayEventViewModel } from "@web/events/queries/useSomedayEventsQuery";
import {
  draftActions,
  selectDraft,
  selectDraftStatus,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { OnSubmitParser } from "@web/views/Week/components/Draft/hooks/actions/submit.parser";
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
  // TODO(packet-03-phase-3c): legacy-shaped facade until this file's
  // Schema_Event-based drag/drop state is converted to the new contracts.
  const eventMutations = useMemo(
    () =>
      createLegacyEventMutationsAdapter(
        mutations,
        () => getDefaultTargetCalendar(calendars ?? [])?.id,
      ),
    [mutations, calendars],
  );
  const { isAtWeeklyLimit, weekCount: somedayWeekCount } =
    useSomedayEventViewModel(
      weekProps.component.startOfView,
      weekProps.component.endOfView,
    );
  const draftFromStore = useDraftStore(selectDraft);

  const { activity, dateToResize, eventType, isDrafting } =
    useDraftStore(selectDraftStatus)!;

  const {
    dateBeingChanged,
    draft,
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

  const isSomeday = useCallback((): boolean => {
    return draftFromStore?.isSomeday ?? false;
  }, [draftFromStore?.isSomeday]);

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
      const eventToDelete = draft ?? draftFromStore;

      if (eventToDelete?._id) {
        eventMutations.delete({ _id: eventToDelete._id, applyTo });
      }
      discard();
    },
    [draft, draftFromStore, discard, eventMutations],
  );

  const convert = useCallback(
    (start: string, end: string) => {
      if (isAtWeeklyLimit) {
        showErrorToast(SOMEDAY_WEEK_LIMIT_MSG);
        return;
      }

      const event = buildConvertToSomedayEvent(
        draft!,
        { startDate: start, endDate: end },
        somedayWeekCount,
      );

      eventMutations.convertToSomeday({ event });

      discard();
    },
    [discard, draft, eventMutations, isAtWeeklyLimit, somedayWeekCount],
  );

  const openForm = useCallback(() => {
    setIsFormOpen(true);
  }, [setIsFormOpen]);

  const determineSubmitAction = useCallback(
    (draft: Schema_WebEvent) => {
      const isExisting = !!draft._id;
      if (!isExisting) return "CREATE";

      if (isExisting) {
        if (isFormOpenBeforeDragging) {
          return "OPEN_FORM";
        }
        const isSame = draftFromStore
          ? !DirtyParser.isEventDirty(draft, draftFromStore)
          : false;
        if (isSame) {
          // no need to make HTTP request
          return "DISCARD";
        }
      }
      return "UPDATE";
    },
    [draftFromStore, isFormOpenBeforeDragging],
  );

  const getEditSlicePayload = useCallback(
    (
      event: Schema_WebEvent,
      applyTo: RecurringEventUpdateScope,
    ): Payload_EditEvent => {
      const viewParser = new EventInViewParser(
        event,
        weekProps.component.startOfView,
        weekProps.component.endOfView,
      );
      const shouldRemove = viewParser.isEventOutsideView();
      const payload = { _id: event._id!, event, shouldRemove, applyTo };

      return payload;
    },
    [weekProps.component.endOfView, weekProps.component.startOfView],
  );

  const submit = useCallback(
    async (
      draft: Schema_GridEvent,
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
          const event = new OnSubmitParser(draft).parse();
          eventMutations.create(event);
          return;
        }
        case "UPDATE": {
          if (!draft._id) {
            discard();
            return;
          }

          const event = new OnSubmitParser(draft).parse();
          const payload = getEditSlicePayload(event, applyTo);
          eventMutations.edit(payload);

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
      determineSubmitAction,
      discard,
      eventMutations,
      getEditSlicePayload,
      isFormOpenBeforeDragging,
      openForm,
    ],
  );

  const duplicateEvent = useCallback(() => {
    const draft = MapEvent.removeProviderData({
      ...(draftFromStore as Schema_Event),
    }) as Schema_GridEvent;
    const { _id: _duplicatedEventId, ...duplicateDraft } = draft;

    submit(duplicateDraft);
    discard();
  }, [draftFromStore, submit, discard]);

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

      const movement = getArrowKeyMovement(key, Boolean(draft.isAllDay));
      if (!movement) return false;

      const start = dayjs(draft.startDate);
      const end = dayjs(draft.endDate);
      const nextStart = start
        .add(movement.days, "day")
        .add(movement.minutes, "minutes");
      const nextEnd = end
        .add(movement.days, "day")
        .add(movement.minutes, "minutes");

      if (!isInsideVisibleWeek(nextStart)) return false;

      if (!draft.isAllDay && !isTimedEventInsideOneDay(nextStart, nextEnd)) {
        return false;
      }

      setDraft({
        ...draft,
        startDate: nextStart.format(),
        endDate: nextEnd.format(),
      });

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

        const rawX = e.clientX;
        const x = draft.isAllDay ? rawX - draft.position.dragOffset.x : rawX;
        const startEndDurationMin = getDragDurationMinutes(draft, dragStatus);

        const y = e.clientY - draft.position.dragOffset.y;

        let eventStart = dateCalcs.getDateByXY(
          x,
          y,
          weekProps.component.startOfView,
        );

        let eventEnd = eventStart.add(startEndDurationMin, "minutes");

        if (!draft.isAllDay) {
          // Edge case: timed events' end times can overflow past midnight at the bottom of the grid.
          // Below logic prevents that from occurring.
          if (eventEnd.date() !== eventStart.date()) {
            eventEnd = eventEnd.hour(0).minute(0);
            eventStart = eventEnd.subtract(startEndDurationMin, "minutes");
          }
        }

        const _draft: Schema_GridEvent = {
          ...draft,
          startDate: draft.isAllDay
            ? eventStart.format(YEAR_MONTH_DAY_FORMAT)
            : eventStart.format(),
          endDate: draft.isAllDay
            ? eventEnd.format(YEAR_MONTH_DAY_FORMAT)
            : eventEnd.format(),
          priority: draft.priority || Priorities.UNASSIGNED,
        };

        setDraft(_draft);
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
      const hasMoved = currTime !== draft?.startDate;

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
      dragStatus,
      setDraft,
      setDragStatus,
    ],
  );

  const isValidMovement = useCallback(
    (currTime: dayjs.Dayjs) => {
      if (!draft || !dateBeingChanged) return false;

      if (draft.isAllDay) {
        return true;
      }

      const _currTime = currTime.format();
      const noChange = draft[dateBeingChanged] === _currTime;

      if (noChange) return false;

      const diffDay = currTime.day() !== dayjs(draft.startDate).day();
      if (diffDay) return false;

      const sameStart = currTime.format() === draft.startDate;
      if (sameStart) return false;

      return true;
    },
    [dateBeingChanged, draft],
  );

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!draft || !draftFromStore) return; // TS Guard

      const _dateBeingChanged = dateBeingChanged as "startDate" | "endDate";
      const oppositeKey =
        _dateBeingChanged === "startDate" ? "endDate" : "startDate";

      const flipIfNeeded = (currTime: Dayjs) => {
        let startDate = draft?.startDate;
        let endDate = draft?.endDate;

        let justFlipped = false;
        let dateKey = dateBeingChanged;
        const opposite = dayjs(draft?.[oppositeKey]);
        const comparisonKeyword =
          dateBeingChanged === "startDate" ? "after" : "before";

        if (comparisonKeyword === "after") {
          if (currTime.isAfter(opposite)) {
            dateKey = oppositeKey;
            startDate = draft?.endDate;
            setDateBeingChanged(dateKey);

            justFlipped = true;
          }
        } else if (comparisonKeyword === "before") {
          if (currTime.isBefore(opposite)) {
            setDateBeingChanged(oppositeKey);
            if (draft?.isAllDay) {
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
        setDraft((_draft): Schema_GridEvent => {
          return {
            ..._draft!,
            _id: _draft!._id,
            hasFlipped: justFlipped,
            endDate: endDate,
            startDate: startDate,
            priority: draft.priority,
          };
        });

        return justFlipped;
      };

      e.preventDefault();
      e.stopPropagation();

      if (!isResizing) return;

      // For all-day events, use a fixed Y coordinate (0) because Y positioning is irrelevant:
      const y = draft.isAllDay ? 0 : e.clientY;
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

      if (draft?.isAllDay) {
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

      setDraft((_draft): Schema_GridEvent => {
        return {
          ..._draft!,
          ...(dateChanged ? { [dateChanged]: updatedTime } : {}),
        };
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

    if (draftFromStore !== null) {
      setDraft(draftFromStore as Schema_GridEvent);
    } else {
      const { startDate, endDate } = draftFromStore ?? {
        startDate: undefined,
        endDate: undefined,
      };

      const defaultDraft = (await assembleDefaultEvent(
        eventType,
        startDate,
        endDate,
      )) as Schema_GridEvent;
      setDraft(defaultDraft);
    }
    openForm();
  }, [openForm, draftFromStore, eventType, setDraft, setDraftSessionKey]);

  const handleChange = useCallback(async () => {
    const isSomeday =
      eventType === Categories_Event.SOMEDAY_WEEK ||
      eventType === Categories_Event.SOMEDAY_MONTH;
    if (!isDrafting) return;
    if (activity === "eventRightClick") {
      return; // Prevents form and context menu from opening at same time
    }
    if (!isSomeday && activity === "keyboardEdit") {
      setDraftSessionKey((key) => key + 1);
      setDraft(draftFromStore as Schema_GridEvent);
      openForm();
      return;
    }
    if (
      !isSomeday &&
      (activity === "createShortcut" || activity === "gridClick")
    ) {
      await create();
      return;
    }
    if (activity === "resizing") {
      setDraftSessionKey((key) => key + 1);
      setDraft(draftFromStore as Schema_GridEvent);
      startResizing();
    }
  }, [
    eventType,
    isDrafting,
    activity,
    create,
    setDraft,
    setDraftSessionKey,
    draftFromStore,
    startResizing,
    openForm,
  ]);

  const actions = {
    closeForm,
    submit,
    convert,
    deleteEvent,
    duplicateEvent,
    discard,
    drag,
    openForm,
    repositionDraftByKeyboard,
    reset,
    resize,
    isSomeday,
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
