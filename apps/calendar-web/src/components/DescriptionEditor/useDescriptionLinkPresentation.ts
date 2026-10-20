import { type Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import {
  displayHostForDescriptionLink,
  listDescriptionLinks,
  shouldShortenDescriptionLinkLabel,
} from "@web/components/DescriptionEditor/description-link.util";

/** Display-only host labels; ProseMirror HTML stays unchanged. */
export function useDescriptionLinkPresentation(
  editor: Editor | null,
  editorRoot: HTMLElement | null,
  enabled: boolean,
  isFocused: boolean,
) {
  const wasFocusedRef = useRef(false);
  const presentationAppliedRef = useRef(false);

  useEffect(() => {
    if (!editor || !editorRoot || !enabled) return;

    if (isFocused) {
      if (presentationAppliedRef.current) {
        editor.view.dispatch(editor.state.tr);
        presentationAppliedRef.current = false;
      }
      wasFocusedRef.current = true;
      return;
    }

    if (presentationAppliedRef.current) {
      wasFocusedRef.current = false;
      return;
    }
    presentationAppliedRef.current = true;
    wasFocusedRef.current = false;

    const domObserver = (
      editor.view as unknown as {
        domObserver: { stop: () => void; start: () => void };
      }
    ).domObserver;
    domObserver.stop();
    try {
      for (const link of listDescriptionLinks(editorRoot)) {
        link.title = link.href;
        const text = link.textContent ?? "";
        if (!shouldShortenDescriptionLinkLabel(text, link.href)) continue;

        const host = displayHostForDescriptionLink(link.href);
        if (text.trim() !== host) {
          link.textContent = host;
        }
      }
    } finally {
      domObserver.start();
    }
  }, [editor, editorRoot, enabled, isFocused]);
}
