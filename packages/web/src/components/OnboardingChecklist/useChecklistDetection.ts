import { useContext, useEffect } from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { getCalendarEventIdFromElement } from "@web/common/utils/event/event.util";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { checklistActions } from "@web/components/OnboardingChecklist/checklist.store";
import { useDraftStore } from "@web/events/stores/draft.store";
import { useEdgeFocusStore } from "@web/grid/shortcuts/edge-focus.store";
import { keyboardKey } from "@web/shortcuts/is-bare-letter-key";
import { useEventJumpStore } from "@web/shortcuts/shift-hint/event-jump.store";

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

/**
 * Loose, self-contained mission detection: listens to the real stores and the
 * keyboard rather than hooking into the shortcut handlers, so nothing here
 * couples to the grid engine. Any qualifying action counts (any event, any
 * direction); false positives are accepted by design, the checklist is
 * encouragement, not assessment.
 */
export function useChecklistDetection(enabled: boolean) {
  const { authenticated } = useContext(SessionContext);

  useEffect(() => {
    if (!enabled) return;

    // jumpToEvent: the S jump mode activating is the taught entry point.
    const unsubJump = useEventJumpStore.subscribe((state) => {
      if (state.isActive) checklistActions.completeItem("jumpToEvent");
    });

    // placeDraft: a draft landed on the grid via the keyboard.
    const unsubDraft = useDraftStore.subscribe((state) => {
      if (state.status?.activity === "keyboardPlace" && state.gridDraft) {
        checklistActions.completeItem("placeDraft");
      }
    });

    // moveEvent / resizeEdge / undo ride the same capture listener the real
    // handlers use; the edge store at keydown time picks move vs resize.
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event)) return;

      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        keyboardKey(event).toLowerCase() === "z"
      ) {
        checklistActions.completeItem("undo");
        return;
      }

      if (!event.shiftKey || !ARROW_KEYS.has(event.key)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (useEdgeFocusStore.getState().edge !== null) {
        checklistActions.completeItem("resizeEdge");
        return;
      }
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        getCalendarEventIdFromElement(active)
      ) {
        checklistActions.completeItem("moveEvent");
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      unsubJump();
      unsubDraft();
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled]);

  // signUp: completes the moment the session authenticates, including users
  // who were already signed in before the checklist first rendered.
  useEffect(() => {
    if (!enabled || !authenticated) return;
    checklistActions.completeItem("signUp");
  }, [enabled, authenticated]);
}
