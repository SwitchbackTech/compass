import { type Editor } from "@tiptap/react";
import { useCallback, useEffect } from "react";
import { KEYMAP } from "@core/shortcuts/keymap";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import {
  findLinkElement,
  linkAtCaret,
  openDescriptionLink,
  tryOpenDescriptionLinkFromDigit,
} from "@web/components/DescriptionEditor/description-link.util";
import { isRecurrenceScopeAskReady } from "@web/events/recurrence/recurrence-scope-opportunity.store";
import { recurrenceScopeForToastDigit } from "@web/events/recurrence/recurrence-scope-toast-digit";
import { recordHandledShortcutInvocation } from "@web/shortcuts/tips/shortcut-telemetry";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

export function useDescriptionEditorOpenLinkAtCaretShortcut(
  editor: Editor | null,
  editorRoot: HTMLElement | null,
  enabled: boolean,
) {
  const handler = useCallback(
    (event: KeyboardEvent) => {
      if (!editor || !editorRoot) return;
      const link =
        linkAtCaret(editor) ??
        findLinkElement(editorRoot, event.target) ??
        findLinkElement(editorRoot, document.activeElement);
      if (!link?.href) return;
      openDescriptionLink(link.href);
      recordHandledShortcutInvocation("edit-open-description-link");
    },
    [editor, editorRoot],
  );

  useAppShortcut(KEYMAP.openDescriptionLinkAtCaret.hotkey, handler, {
    enabled: enabled && Boolean(editor),
    ignoreInputs: false,
    preventDefault: true,
    stopPropagation: true,
    shortcutId: "edit-open-description-link",
  });
}

export function useDescriptionEditorOpenLinkDigitShortcuts(
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
