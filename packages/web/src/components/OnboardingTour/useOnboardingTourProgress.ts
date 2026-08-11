import { useEffect, useRef } from "react";
import { type Event } from "@core/types/event.contracts";
import { ID_EVENT_FORM } from "@web/common/constants/web.constants";
import { DEMO_EVENT_IDS } from "@web/common/storage/migrations/external/demo-data-seed";
import {
  focusCalendarEventElement,
  getCalendarEventIdFromElement,
} from "@web/common/utils/event/event.util";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import {
  ONBOARDING_ARROW_LESSON_STEP_IDS,
  type OnboardingTourStepId,
} from "@web/components/OnboardingTour/onboarding.tour.steps";
import {
  onboardingTourActions,
  selectIsConfirmingTourSkip,
  selectOnboardingTourActive,
  selectOnboardingTourStepId,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import { useHasPendingEventMutations } from "@web/events/mutations/useEventPending";
import { useEventById } from "@web/events/queries/useEventById";
import {
  draftActions,
  selectDraftActivity,
  selectGridDraft,
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  edgeFocusActions,
  selectEdgeForEvent,
  useEdgeFocusStore,
} from "@web/grid/shortcuts/edge-focus.store";
import {
  selectKeyboardOnlyActive,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";

const TITLE_FIELD_SELECTOR = `form[name="${ID_EVENT_FORM}"] input[name="Event Title"]`;

/** targetEvent completes once the Dentist demo event is focused. */
export function shouldAdvanceTargetEventStep(eventId: string | null): boolean {
  return eventId === DEMO_EVENT_IDS.dentist;
}

type TimedSchedule = { start: string; end: string };

const timedScheduleOf = (event: Event | null): TimedSchedule | null => {
  if (!event || event.schedule.kind !== "timed") return null;
  return { start: event.schedule.start, end: event.schedule.end };
};

const sameSchedule = (a: TimedSchedule | null, b: TimedSchedule | null) =>
  a !== null && b !== null && a.start === b.start && a.end === b.end;

/** Shared by move/resizeEdge/undo: focus Dentist and snapshot its schedule. */
const enterDentistMission = (
  dentistEvent: Event | null,
  scheduleAtEntryRef: { current: TimedSchedule | null },
) => {
  focusCalendarEventElement(DEMO_EVENT_IDS.dentist);
  scheduleAtEntryRef.current = timedScheduleOf(dentistEvent);
};

const STEPS_NEEDING_DENTIST: ReadonlySet<OnboardingTourStepId> = new Set([
  "move",
  "resizeEdge",
  "undo",
]);

/**
 * Advances tour steps when the user performs the prompted action.
 * Does not take the app lock; coachmarks stay out of the modal Escape stack
 * except for an explicit Skip-on-Escape while the tour is active.
 */
export function useOnboardingTourProgress() {
  const isActive = useOnboardingTourStore(selectOnboardingTourActive);
  const stepId = useOnboardingTourStore(selectOnboardingTourStepId);
  const isConfirmingSkip = useOnboardingTourStore(selectIsConfirmingTourSkip);
  const isFormOpen = useDraftStore(selectIsEventFormOpen);
  const isSaving = useHasPendingEventMutations();
  const draftActivity = useDraftStore(selectDraftActivity);
  const gridDraft = useDraftStore(selectGridDraft);
  // Only the move/resizeEdge/undo missions read Dentist's live schedule;
  // gating the id keeps the (always-mounted) tour hook from running a full
  // query-cache scan on every render outside those three steps.
  const dentistEvent = useEventById(
    isActive && STEPS_NEEDING_DENTIST.has(stepId)
      ? DEMO_EVENT_IDS.dentist
      : undefined,
  );
  const dentistEdge = useEdgeFocusStore(
    selectEdgeForEvent(DEMO_EVENT_IDS.dentist),
  );
  const isKeyboardOnly = useKeyboardOnlyStore(selectKeyboardOnlyActive);

  /** move/resizeEdge/undo capture the schedule at step entry to diff against. */
  const scheduleAtEntryRef = useRef<TimedSchedule | null>(null);
  /** undo has two phases: wait for a revert, then wait for a reapply. */
  const undoPhaseRef = useRef<"pending-undo" | "pending-redo">("pending-undo");

  // create / save / editSequence: unchanged encouragement-based checks.
  useEffect(() => {
    if (!isActive) return;

    if (stepId === "create" && isFormOpen) {
      onboardingTourActions.advance();
      return;
    }

    // Optimistic create flips pending; that is enough to count as saved.
    if (stepId === "save" && isSaving) {
      onboardingTourActions.advance();
    }
  }, [isActive, stepId, isFormOpen, isSaving]);

  // moveFocus: auto-focus the anchor event, then require focus to land on a
  // genuinely different event id (upgrade over "any arrow keydown counts").
  useEffect(() => {
    if (!isActive || stepId !== "moveFocus") return;
    focusCalendarEventElement(DEMO_EVENT_IDS.morningStandup);

    const onFocusChange = () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return;
      const eventId = getCalendarEventIdFromElement(active);
      if (eventId && eventId !== DEMO_EVENT_IDS.morningStandup) {
        onboardingTourActions.advance();
      }
    };

    document.addEventListener("focusin", onFocusChange);
    return () => document.removeEventListener("focusin", onFocusChange);
  }, [isActive, stepId]);

  // editSequence: require the title field itself to be focused, not just
  // "some form is open" (upgrade over the old form-open-only check).
  useEffect(() => {
    if (!isActive || stepId !== "editSequence") return;

    const checkTitleFocused = () => {
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        active.matches(TITLE_FIELD_SELECTOR)
      ) {
        onboardingTourActions.advance();
      }
    };

    document.addEventListener("focusin", checkTitleFocused);
    checkTitleFocused();
    return () => document.removeEventListener("focusin", checkTitleFocused);
  }, [isActive, stepId]);

  // targetEvent: completes only when the Dentist demo event is focused,
  // named directly in the mission copy (upgrade over "jump to anything").
  useEffect(() => {
    if (!isActive || stepId !== "targetEvent") return;

    const tryAdvanceFromActiveElement = () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return;
      const eventId = getCalendarEventIdFromElement(active);
      if (shouldAdvanceTargetEventStep(eventId)) {
        onboardingTourActions.advance();
      }
    };

    // Jump focuses on keydown; some test envs do not bubble focusin reliably,
    // so also re-check after a printable keyup (the letter that completes jump).
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key.length === 1) tryAdvanceFromActiveElement();
    };

    document.addEventListener("focusin", tryAdvanceFromActiveElement);
    document.addEventListener("keyup", onKeyUp);
    tryAdvanceFromActiveElement();
    return () => {
      document.removeEventListener("focusin", tryAdvanceFromActiveElement);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [isActive, stepId]);

  // move / resizeEdge: keep Dentist focused through both missions (in case
  // the previous step's completion came via the stuck-fallback rather than
  // an actual jump), and capture its schedule at entry to diff against.
  // resizeEdge also seeds edge focus to "startDate": EDGE_CYCLE is
  // [null, startDate, endDate] and nothing before this step ever touches
  // edge focus, so without this a single Tab (what the card's copy and
  // shortcutHint promise) would land on startDate, not endDate.
  // biome-ignore lint/correctness/useExhaustiveDependencies: capture the schedule once, on step entry - dentistEvent updating mid-step must not reset the snapshot we diff against.
  useEffect(() => {
    if (!isActive || (stepId !== "move" && stepId !== "resizeEdge")) return;
    enterDentistMission(dentistEvent, scheduleAtEntryRef);
    if (stepId === "resizeEdge") {
      edgeFocusActions.setEdge(
        DEMO_EVENT_IDS.dentist,
        "startDate",
        "Editing start time",
      );
    }
  }, [isActive, stepId]);

  // move: verify the whole event's start time actually changed (upgrade
  // over "any Shift+Arrow keydown counts"; also fixes the sandbox no-op).
  useEffect(() => {
    if (!isActive || stepId !== "move") return;
    const entry = scheduleAtEntryRef.current;
    const current = timedScheduleOf(dentistEvent);
    if (entry && current && current.start !== entry.start) {
      onboardingTourActions.advance();
    }
  }, [isActive, stepId, dentistEvent]);

  // resizeEdge: verify Tab focused the end edge and only the end time moved.
  useEffect(() => {
    if (!isActive || stepId !== "resizeEdge") return;
    const entry = scheduleAtEntryRef.current;
    const current = timedScheduleOf(dentistEvent);
    if (
      entry &&
      current &&
      dentistEdge === "endDate" &&
      current.end !== entry.end &&
      current.start === entry.start
    ) {
      onboardingTourActions.advance();
    }
  }, [isActive, stepId, dentistEvent, dentistEdge]);

  // placeDraft: clear focus/edge state on entry so Shift+Arrow has nothing
  // focused to move, then verify a new keyboard-placed draft landed.
  useEffect(() => {
    if (!isActive || stepId !== "placeDraft") return;
    edgeFocusActions.reset();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [isActive, stepId]);

  useEffect(() => {
    if (!isActive || stepId !== "placeDraft") return;
    if (draftActivity === "keyboardPlace" && gridDraft !== null) {
      draftActions.discard();
      onboardingTourActions.advance();
    }
  }, [isActive, stepId, draftActivity, gridDraft]);

  // undo: two phases against real event state, not keydowns - wait for
  // Dentist's schedule to change (undo), then to change again (redo).
  // biome-ignore lint/correctness/useExhaustiveDependencies: capture the schedule once, on step entry - dentistEvent updating mid-step must not reset the snapshot we diff against.
  useEffect(() => {
    if (!isActive || stepId !== "undo") return;
    enterDentistMission(dentistEvent, scheduleAtEntryRef);
    undoPhaseRef.current = "pending-undo";
  }, [isActive, stepId]);

  useEffect(() => {
    if (!isActive || stepId !== "undo") return;
    const entry = scheduleAtEntryRef.current;
    const current = timedScheduleOf(dentistEvent);
    if (!entry || !current) return;

    if (undoPhaseRef.current === "pending-undo") {
      if (!sameSchedule(current, entry)) {
        undoPhaseRef.current = "pending-redo";
      }
      return;
    }

    // Redo must restore exactly the schedule captured at step entry - not
    // merely "changed again" - or a manual re-edit of Dentist (rather than
    // pressing redo) would be misread as a successful redo.
    if (sameSchedule(current, entry)) {
      onboardingTourActions.advance();
    }
  }, [isActive, stepId, dentistEvent]);

  // hardcore: graduation completes once Hardcore Mode is actually active.
  useEffect(() => {
    if (!isActive || stepId !== "hardcore") return;
    if (isKeyboardOnly) onboardingTourActions.advance();
  }, [isActive, stepId, isKeyboardOnly]);

  // ArrowLeft / ArrowRight move Previous / Next when arrows are not the
  // lesson and focus is not inside an editable field.
  useEffect(() => {
    if (!isActive || isConfirmingSkip) return;
    if (ONBOARDING_ARROW_LESSON_STEP_IDS.has(stepId)) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }
      if (isEditableKeyboardTarget(event)) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onboardingTourActions.advance();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onboardingTourActions.retreat();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isActive, stepId, isConfirmingSkip]);

  // Escape never traps: first press shows an inline "skip the tour?" confirm.
  // While confirming, Enter skips and any other key cancels the confirm and
  // lets the keypress fall through, so pressing the actual lesson key still
  // counts. Capture so this wins over unrelated lower handlers.
  useEffect(() => {
    if (!isActive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const { isConfirmingSkip: confirming } =
        useOnboardingTourStore.getState();

      if (confirming) {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          onboardingTourActions.skip();
        } else {
          // Any other key (including a second Escape) means "keep going".
          onboardingTourActions.cancelSkipConfirm();
        }
        return;
      }

      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;

      event.preventDefault();
      event.stopPropagation();
      onboardingTourActions.requestSkipConfirm();
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [isActive]);
}
