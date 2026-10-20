import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      setStyle({
        position: "fixed",
        left: rect.right + 2,
        top: rect.top,
        zIndex: 10,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchor]);

  if (!style) return null;

  return createPortal(
    <span className="pointer-events-none" style={style} aria-hidden="true">
      <ShortcutKeys
        keys={digit}
        className="inline-flex pointer-coarse:inline-flex"
      />
    </span>,
    document.body,
  );
};
