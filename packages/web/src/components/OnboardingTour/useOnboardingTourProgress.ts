import { useEffect, useRef } from "react";
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
import { isHigherEscapeOwner } from "@web/shortcuts/escape-ownership";

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

  // Lessons taught by a single keypress: encouragement-based, like the rest
  // of this hook — pressing the key is enough to count as the lesson, we do
  // not verify the resulting focus/nudge/undo actually landed.
  useEffect(() => {
    if (!isActive) return;
    if (
      stepId !== "moveFocus" &&
      stepId !== "targetEvent" &&
      stepId !== "nudge" &&
      stepId !== "undo"
    ) {
      return;
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
      } else if (stepId === "targetEvent" && event.key === "Shift") {
        onboardingTourActions.advance();
      } else if (
        stepId === "nudge" &&
        event.shiftKey &&
        event.key.startsWith("Arrow")
      ) {
        onboardingTourActions.advance();
      } else if (stepId === "undo" && mod && event.key.toLowerCase() === "z") {
        onboardingTourActions.advance();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isActive, stepId]);

  // ESC skips the tour when nothing higher owns Escape. Capture + stand down
  // for app lock / form / floating layers so we never trap the user.
  useEffect(() => {
    if (!isActive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      if (isHigherEscapeOwner()) return;

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
