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
import {
  getShortcutHint,
  type ShortcutTipPart,
} from "@web/shortcuts/tips/shortcut-tips.data";
import {
  setTipsMuted,
  useIsTipsMuted,
} from "@web/shortcuts/tips/shortcut-tips-muted.store";

/** Context-aware keyboard tips pinned under the Save bar in the event form. */
export function EventFormFooterTips() {
  const tipsMuted = useIsTipsMuted();
  const focusInsideForm = useEventFormFocusStore(selectEventFormFocusInside);
  const tabNavigationApplies = useEventFormFocusStore(
    selectEventFormTabNavigationApplies,
  );
  const firstEventDone = useFirstEventPromptStore(selectFirstEventDone);
  const isCelebrating = useFirstEventPromptStore(selectFirstEventCelebrating);

  if (tipsMuted || !focusInsideForm) return null;

  let parts: readonly ShortcutTipPart[];
  if (!firstEventDone && !isCelebrating) {
    parts = getShortcutHint("first-event-save").parts;
  } else {
    parts = buildEventFormFooterTipParts({
      focusInsideForm,
      tabNavigationApplies,
    });
  }
  if (parts.length === 0) return null;

  return (
    <div
      className="flex min-h-10 w-full flex-col items-center justify-center gap-0.5"
      data-testid="event-form-footer-tips"
    >
      <p
        aria-live="polite"
        className="block w-full text-pretty break-words text-center text-text-muted text-xs leading-5 opacity-80"
      >
        <ShortcutTipParts parts={parts} />
      </p>
      <button
        className="c-focus-ring rounded-xs px-1 text-text-muted text-xs leading-5 opacity-80 hover:text-text-primary hover:opacity-100"
        onClick={() => setTipsMuted(true)}
        type="button"
      >
        Hide tips
      </button>
    </div>
  );
}
