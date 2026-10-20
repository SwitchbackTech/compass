import { useEffect } from "react";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { tryOpenDescriptionLinkFromDigit } from "@web/components/DescriptionEditor/description-link.util";
import { isRecurrenceScopeAskReady } from "@web/events/recurrence/recurrence-scope-opportunity.store";
import { recurrenceScopeForToastDigit } from "@web/events/recurrence/recurrence-scope-toast-digit";
import { recordHandledShortcutInvocation } from "@web/shortcuts/tips/shortcut-telemetry";

/**
 * Bare digits 1-9 open description links while the event form is open and the
 * description field is not focused. Capture phase so typed-time and other
 * handlers can stand down when this hook is disabled.
 */
export function useDescriptionLinkDigitShortcut(
  editorRoot: HTMLElement | null,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !editorRoot) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isEditableKeyboardTarget(event)) return;
      if (isRecurrenceScopeAskReady() && recurrenceScopeForToastDigit(event)) {
        return;
      }

      if (!tryOpenDescriptionLinkFromDigit(event, editorRoot)) return;

      event.preventDefault();
      event.stopPropagation();
      recordHandledShortcutInvocation("edit-open-description-link-digit");
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [editorRoot, enabled]);
}
