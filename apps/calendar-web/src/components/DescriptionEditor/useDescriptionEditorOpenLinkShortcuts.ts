import { type Editor } from "@tiptap/react";
import { useCallback } from "react";
import { KEYMAP } from "@core/shortcuts/keymap";
import {
  findLinkElement,
  linkAtCaret,
  openDescriptionLink,
} from "@web/components/DescriptionEditor/description-link.util";
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
