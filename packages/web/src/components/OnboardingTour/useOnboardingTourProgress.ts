import { useEffect, useRef } from "react";
import {
  focusCalendarEventElement,
  getCalendarEventIdFromElement,
} from "@web/common/utils/event/event.util";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import {
  getSandboxFocusEventId,
  isTargetEventSandboxId,
} from "@web/components/OnboardingTour/onboarding.sandbox-events";
import { ONBOARDING_ARROW_LESSON_STEP_IDS } from "@web/components/OnboardingTour/onboarding.tour.steps";
import {
  onboardingTourActions,
  selectOnboardingTourActive,
  selectOnboardingTourStepId,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import { useHasPendingEventMutations } from "@web/events/mutations/useEventPending";
import {
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  selectIsShortcutsOpen,
  useViewStore,
} from "@web/events/stores/view.store";
import {
  selectIsCmdPaletteOpen,
  useSettingsStore,
} from "@web/settings/settings.store";

/** Palette step completes after open→close, or if shortcuts open from inside it. */
export function shouldAdvancePaletteStep({
  paletteOpened,
  isPaletteOpen,
  isShortcutsOpen,
}: {
  paletteOpened: boolean;
  isPaletteOpen: boolean;
  isShortcutsOpen: boolean;
}): boolean {
  // Require the palette to have opened first so a bare "?" / sidebar toggle
  // cannot skip the Mod+K lesson.
  return paletteOpened && (!isPaletteOpen || isShortcutsOpen);
}

/** targetEvent completes once a sandbox jump event is focused. */
export function shouldAdvanceTargetEventStep(eventId: string | null): boolean {
  return Boolean(eventId && isTargetEventSandboxId(eventId));
}

/**
 * Advances tour steps when the user performs the prompted action.
 * Does not take the app lock; coachmarks stay out of the modal Escape stack
 * except for an explicit Skip-on-Escape while the tour is active.
 */
export function useOnboardingTourProgress() {
  const isActive = useOnboardingTourStore(selectOnboardingTourActive);
  const stepId = useOnboardingTourStore(selectOnboardingTourStepId);
  const isFormOpen = useDraftStore(selectIsEventFormOpen);
  const isSaving = useHasPendingEventMutations();
  const isPaletteOpen = useSettingsStore(selectIsCmdPaletteOpen);
  const isShortcutsOpen = useViewStore(selectIsShortcutsOpen);
  const paletteOpenedRef = useRef(false);
  /** Tracks whether Shift is currently held, for nudge bleed-through guard. */
  const shiftPressedRef = useRef(false);
  /** Shift must be released after entering nudge before Shift+Arrow counts. */
  const nudgeShiftArmedRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      shiftPressedRef.current = false;
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") shiftPressedRef.current = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") shiftPressedRef.current = false;
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive || stepId !== "palette") {
      paletteOpenedRef.current = false;
      return;
    }

    if (isPaletteOpen) {
      paletteOpenedRef.current = true;
    }

    if (
      shouldAdvancePaletteStep({
        paletteOpened: paletteOpenedRef.current,
        isPaletteOpen,
        isShortcutsOpen,
      })
    ) {
      paletteOpenedRef.current = false;
      onboardingTourActions.advance();
    }
  }, [isActive, stepId, isPaletteOpen, isShortcutsOpen]);

  useEffect(() => {
    if (!isActive) return;

    if (stepId === "create" && isFormOpen) {
      onboardingTourActions.advance();
      return;
    }

    // Optimistic create flips pending; that is enough to count as saved.
    if (stepId === "save" && isSaving) {
      onboardingTourActions.advance();
      return;
    }

    // The E-then-T sequence reopens the form; enough to count as the lesson.
    if (stepId === "editSequence" && isFormOpen) {
      onboardingTourActions.advance();
      return;
    }

    if (stepId === "shortcuts" && isShortcutsOpen) {
      onboardingTourActions.advance();
    }
  }, [isActive, stepId, isFormOpen, isSaving, isShortcutsOpen]);

  // Auto-focus the practice event when a sandbox lesson needs a starting focus.
  useEffect(() => {
    if (!isActive) return;
    if (
      stepId !== "editSequence" &&
      stepId !== "nudge" &&
      stepId !== "moveFocus"
    ) {
      return;
    }
    const eventId = getSandboxFocusEventId(stepId);
    if (!eventId) return;
    focusCalendarEventElement(eventId);
  }, [isActive, stepId]);

  // targetEvent completes when a sandbox jump target receives focus.
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
      if (event.key.length === 1) {
        tryAdvanceFromActiveElement();
      }
    };

    document.addEventListener("focusin", tryAdvanceFromActiveElement);
    document.addEventListener("keyup", onKeyUp);
    tryAdvanceFromActiveElement();
    return () => {
      document.removeEventListener("focusin", tryAdvanceFromActiveElement);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [isActive, stepId]);

  // Lessons taught by a single keypress: encouragement-based, like the rest
  // of this hook — pressing the key is enough to count as the lesson, we do
  // not verify the resulting focus/nudge/undo actually landed.
  useEffect(() => {
    if (!isActive) return;
    if (stepId !== "moveFocus" && stepId !== "nudge" && stepId !== "undo") {
      return;
    }

    // If Shift is still held from targetEvent, wait for release; otherwise
    // arm immediately so Next-button entry can complete Shift+Arrow once.
    if (stepId === "nudge") {
      nudgeShiftArmedRef.current = !shiftPressedRef.current;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (
        stepId === "moveFocus" &&
        !event.shiftKey &&
        !mod &&
        event.key.startsWith("Arrow")
      ) {
        onboardingTourActions.advance();
      } else if (
        stepId === "nudge" &&
        nudgeShiftArmedRef.current &&
        event.shiftKey &&
        event.key.startsWith("Arrow")
      ) {
        onboardingTourActions.advance();
      } else if (stepId === "undo" && mod && event.key.toLowerCase() === "z") {
        onboardingTourActions.advance();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (stepId !== "nudge") return;
      if (event.key === "Shift") {
        nudgeShiftArmedRef.current = true;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [isActive, stepId]);

  // ArrowLeft / ArrowRight move Previous / Next when arrows are not the lesson
  // and focus is not inside an editable field.
  useEffect(() => {
    if (!isActive) return;
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
  }, [isActive, stepId]);

  // ESC skips the tour unless the current lesson is mid-overlay dismiss
  // (palette / shortcuts), or a leftover form is still open on the palette
  // step after E-then-T. Capture so we win over unrelated lower handlers;
  // create/save still exit the tour even with the form open.
  useEffect(() => {
    if (!isActive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;

      const { stepId: currentStep } = useOnboardingTourStore.getState();
      const paletteOpen = selectIsCmdPaletteOpen(useSettingsStore.getState());
      const shortcutsOpen = selectIsShortcutsOpen(useViewStore.getState());
      const formOpen = selectIsEventFormOpen(useDraftStore.getState());

      if (currentStep === "palette" && (paletteOpen || formOpen)) {
        return;
      }
      if (currentStep === "shortcuts" && shortcutsOpen) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onboardingTourActions.skip();
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [isActive]);
}
