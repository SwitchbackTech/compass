import { type Editor } from "@tiptap/react";
import { useCallback } from "react";
import { KEYMAP } from "@core/shortcuts/keymap";
import { copyText } from "@web/common/utils/clipboard/clipboard.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import {
  findLinkElement,
  resolveDescriptionLinkToCopy,
} from "@web/components/DescriptionEditor/description-link.util";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

const LINK_COPIED_TOAST_ID = "description-link-copied";

export function useDescriptionEditorCopyLinkShortcut(
  editor: Editor | null,
  editorRoot: HTMLElement | null,
  enabled: boolean,
) {
  const handler = useCallback(
    (event: KeyboardEvent) => {
      if (!editor || !editorRoot) return;

      const focusedLink = findLinkElement(editorRoot, event.target);
      const url = resolveDescriptionLinkToCopy(editor, editorRoot, focusedLink);
      if (!url) return;

      void copyText(url).then((didCopy) => {
        if (didCopy) {
          showStatusToast(LINK_COPIED_TOAST_ID, "Link copied");
        }
      });
    },
    [editor, editorRoot],
  );

  useAppShortcut(KEYMAP.copyDescriptionLink.hotkey, handler, {
    enabled: enabled && Boolean(editor),
    ignoreInputs: false,
    preventDefault: true,
    stopPropagation: true,
    shortcutId: "edit-copy-description-link",
  });
}
