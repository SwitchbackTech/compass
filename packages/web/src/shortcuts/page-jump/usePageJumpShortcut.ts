import {
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { physicalDigitIndex } from "@web/shortcuts/digit-pick.util";
import { useModHoldHintShortcut } from "@web/shortcuts/mod-hold/useModHoldHintShortcut";
import {
  focusPageJumpTarget,
  PAGE_JUMP_TARGETS,
} from "@web/shortcuts/page-jump/page-jump.targets";

/**
 * Mod+digit jumps focus to a page area (see PAGE_JUMP_TARGETS); holding Mod
 * alone reveals the digits via the shared hold-Mod engine.
 *
 * Disabled while the event form is open: the form's own Mod+digit field
 * jumps (useFormDigitJumpShortcut) own the gesture then, so the two digit
 * maps never overlap.
 */
export function usePageJumpShortcut(): { areHintsVisible: boolean } {
  const isEventFormOpen = useDraftStore(selectIsEventFormOpen);

  return useModHoldHintShortcut({
    enabled: !isEventFormOpen,
    onModChord: (event) => {
      const index = physicalDigitIndex(event);
      const target = index !== null ? PAGE_JUMP_TARGETS[index] : undefined;
      if (!target) return false;
      return focusPageJumpTarget(target.id);
    },
  });
}
