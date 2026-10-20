import { flip, offset, shift, useFloating } from "@floating-ui/react";
import { useEffect } from "react";
import {
  DESCRIPTION_LINK_SHORTCUT_COUNT,
  listDescriptionLinks,
} from "@web/components/DescriptionEditor/description-link.util";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { PICK_KEY_LABELS } from "@web/shortcuts/digit-pick.util";

interface DescriptionEditorLinkHintsProps {
  editorRoot: HTMLElement | null;
  visible: boolean;
}

export const DescriptionEditorLinkHints = ({
  editorRoot,
  visible,
}: DescriptionEditorLinkHintsProps) => {
  if (!editorRoot || !visible) return null;

  const hints = listDescriptionLinks(editorRoot)
    .slice(0, DESCRIPTION_LINK_SHORTCUT_COUNT)
    .map((link, index) => ({
      link,
      digit: PICK_KEY_LABELS[index] ?? String(index + 1),
    }));

  if (hints.length === 0) return null;

  return (
    <>
      {hints.map(({ link, digit }) => (
        <DescriptionEditorLinkHintChip
          key={`${link.href}-${digit}`}
          anchor={link}
          digit={digit}
        />
      ))}
    </>
  );
};

const DescriptionEditorLinkHintChip = ({
  anchor,
  digit,
}: {
  anchor: HTMLAnchorElement;
  digit: string;
}) => {
  const { refs, floatingStyles } = useFloating({
    open: true,
    placement: "right-start",
    middleware: [offset(2), flip(), shift({ padding: 4 })],
  });

  useEffect(() => {
    refs.setReference(anchor);
  }, [anchor, refs]);

  return (
    <span
      ref={refs.setFloating}
      className="pointer-events-none z-10"
      style={floatingStyles}
      aria-hidden="true"
    >
      <ShortcutKeys
        keys={digit}
        className="inline-flex pointer-coarse:inline-flex"
      />
    </span>
  );
};
