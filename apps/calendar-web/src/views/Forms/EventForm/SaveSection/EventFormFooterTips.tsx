import { useEffect, useMemo } from "react";
import { buildEventFormFooterTipParts } from "@core/shortcuts/event-form-footer-tips";
import {
  selectFirstEventCelebrating,
  selectFirstEventDone,
  useFirstEventPromptStore,
} from "@web/components/FirstEventPrompt/first-event.store";
import {
  selectEventFormFocusInside,
  selectEventFormTabNavigationApplies,
  useEventFormFocusStore,
} from "@web/shortcuts/tips/event-form-focus.store";
import { ShortcutTipParts } from "@web/shortcuts/tips/ShortcutTipParts";
import { getShortcutHint } from "@web/shortcuts/tips/shortcut-tips.data";
import { useIsTipsMuted } from "@web/shortcuts/tips/shortcut-tips-muted.store";
import { visibleShortcutHintActions } from "@web/shortcuts/tips/visible-shortcut-hint.store";

/** Context-aware keyboard tips pinned under the Save bar in the event form. */
export function EventFormFooterTips() {
  const tipsMuted = useIsTipsMuted();
  const focusInsideForm = useEventFormFocusStore(selectEventFormFocusInside);
  const tabNavigationApplies = useEventFormFocusStore(
    selectEventFormTabNavigationApplies,
  );
  const firstEventDone = useFirstEventPromptStore(selectFirstEventDone);
  const isCelebrating = useFirstEventPromptStore(selectFirstEventCelebrating);

  const hint = useMemo(() => {
    if (tipsMuted || !focusInsideForm) return null;
    if (!firstEventDone && !isCelebrating) {
      return getShortcutHint("first-event-save");
    }
    const parts = buildEventFormFooterTipParts({
      focusInsideForm,
      tabNavigationApplies,
    });
    if (parts.length === 0) return null;
    return { id: "save-draft" as const, parts };
  }, [
    firstEventDone,
    focusInsideForm,
    isCelebrating,
    tabNavigationApplies,
    tipsMuted,
  ]);

  useEffect(() => {
    if (!hint) {
      visibleShortcutHintActions.clearFormFooterHint();
      return;
    }
    visibleShortcutHintActions.setFormFooterHint({
      id: hint.id,
      parts: hint.parts,
    });
    return () => visibleShortcutHintActions.clearFormFooterHint();
  }, [hint]);

  if (!hint) return null;

  return (
    <p
      aria-live="polite"
      className="flex min-h-10 w-full items-center justify-center text-pretty break-words text-center text-text-muted text-xs leading-5 opacity-80"
      data-testid="event-form-footer-tips"
    >
      <ShortcutTipParts hintId={hint.id} parts={hint.parts} />
    </p>
  );
}
