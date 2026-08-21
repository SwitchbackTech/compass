import { useCallback, useMemo } from "react";
import { type RecurrenceScope } from "@core/types/event-command.contracts";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import { RecurringEventUpdateScope } from "@web/common/types/web.event.types";
import { repositionDraftByKeyboard as applyDraftKeyboardReposition } from "@web/common/utils/draft/reposition-draft-by-keyboard.util";
import { DirtyParser } from "@web/common/utils/parse/dirty.parser";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { parseGridEventDraft } from "@web/events/grid-event-draft.adapter";
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
  type Setters_Draft,
  type State_Draft_Local,
} from "@web/views/Week/components/Draft/hooks/state/useDraftState";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";

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
  _dateCalcs: DateCalcs,
  weekProps: WeekProps,
) => {
  const mutations = useEventMutations();
  const { data: calendars } = useCalendarsQuery();
  const defaultTargetCalendarId = useDefaultTargetCalendar(calendars ?? [])?.id;
  const { activity, isDrafting } = useDraftStore(selectDraftStatus)!;

  const { isFormOpenBeforeDragging } = draftState;

  const { setIsFormOpen } = setters;

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

  const actions = useMemo(
    () => ({
      submit,
      discard,
      repositionDraftByKeyboard,
    }),
    [discard, repositionDraftByKeyboard, submit],
  );

  useDraftEffects(draftState, setters, weekProps, isDrafting, handleChange);

  return actions;
};
export type Actions_Draft = ReturnType<typeof useDraftActions>;
