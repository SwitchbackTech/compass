import { useEffect } from "react";
import {
  onboardingTourActions,
  selectOnboardingTourActive,
  selectOnboardingTourStepId,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import { useHasPendingEventMutations } from "@web/events/mutations/useEventPending";
import {
  isEventFormOpen,
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
import { isFloatingLayerOpen } from "@web/shortcuts/floating-layer";

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

    if (stepId === "palette" && isPaletteOpen) {
      onboardingTourActions.advance();
      return;
    }

    if (stepId === "shortcuts" && isShortcutsOpen) {
      onboardingTourActions.advance();
    }
  }, [isActive, stepId, isFormOpen, isSaving, isPaletteOpen, isShortcutsOpen]);

  // ESC skips the tour when nothing higher owns Escape. Capture + stand down
  // for app lock / form / floating layers so we never trap the user.
  useEffect(() => {
    if (!isActive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      if (document.body.dataset.appLocked === "true") return;
      if (isFloatingLayerOpen()) return;
      if (isEventFormOpen()) return;

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
