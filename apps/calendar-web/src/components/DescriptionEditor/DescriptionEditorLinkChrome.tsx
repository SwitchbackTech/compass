import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { useEffect, useState } from "react";
import { KEYMAP } from "@core/shortcuts/keymap";
import { copyText } from "@web/common/utils/clipboard/clipboard.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import {
  findLinkElement,
  listDescriptionLinks,
} from "@web/components/DescriptionEditor/description-link.util";
import IconButton from "@web/components/IconButton/IconButton";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

const LINK_COPIED_TOAST_ID = "description-link-copied";
const COPY_ICON_SIZE = 14;

interface DescriptionEditorLinkChromeProps {
  editorRoot: HTMLElement | null;
}

export const DescriptionEditorLinkChrome = ({
  editorRoot,
}: DescriptionEditorLinkChromeProps) => {
  const [activeLink, setActiveLink] = useState<HTMLAnchorElement | null>(null);
  const [hoveredLink, setHoveredLink] = useState<HTMLAnchorElement | null>(
    null,
  );

  const chromeLink = activeLink ?? hoveredLink;

  useEffect(() => {
    if (!editorRoot) return;

    const syncTabIndex = () => {
      for (const link of listDescriptionLinks(editorRoot)) {
        link.tabIndex = 0;
        link.classList.add("c-focus-ring", "rounded-xs");
      }
    };

    syncTabIndex();

    const onFocusIn = (event: FocusEvent) => {
      setActiveLink(findLinkElement(editorRoot, event.target));
    };

    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && editorRoot.contains(next)) {
        const link = findLinkElement(editorRoot, next);
        if (link) {
          setActiveLink(link);
          return;
        }
      }
      setActiveLink(null);
    };

    const onPointerOver = (event: PointerEvent) => {
      setHoveredLink(findLinkElement(editorRoot, event.target));
    };

    const onPointerOut = (event: PointerEvent) => {
      const related = event.relatedTarget;
      if (related instanceof Node && editorRoot.contains(related)) {
        const link = findLinkElement(editorRoot, related);
        if (link) {
          setHoveredLink(link);
          return;
        }
      }
      setHoveredLink(null);
    };

    editorRoot.addEventListener("focusin", onFocusIn);
    editorRoot.addEventListener("focusout", onFocusOut);
    editorRoot.addEventListener("pointerover", onPointerOver);
    editorRoot.addEventListener("pointerout", onPointerOut);

    const observer = new MutationObserver(syncTabIndex);
    observer.observe(editorRoot, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["href"],
    });

    return () => {
      editorRoot.removeEventListener("focusin", onFocusIn);
      editorRoot.removeEventListener("focusout", onFocusOut);
      editorRoot.removeEventListener("pointerover", onPointerOver);
      editorRoot.removeEventListener("pointerout", onPointerOut);
      observer.disconnect();
    };
  }, [editorRoot]);

  const { refs, floatingStyles } = useFloating({
    open: Boolean(chromeLink),
    placement: "right-start",
    middleware: [offset(4), flip(), shift({ padding: 4 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (chromeLink) {
      refs.setReference(chromeLink);
    }
  }, [chromeLink, refs]);

  if (!chromeLink) return null;

  const copyUrl = async () => {
    const didCopy = await copyText(chromeLink.href);
    if (didCopy) {
      showStatusToast(LINK_COPIED_TOAST_ID, "Link copied");
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: keeps the editor focused when pressing the copy control beside a link mark.
    <div
      ref={refs.setFloating}
      className="z-10"
      style={floatingStyles}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <TooltipWrapper
        description="Copy link"
        shortcut={[...KEYMAP.copyDescriptionLink.keycaps]}
        shortcutId="edit-copy-description-link"
      >
        <IconButton
          aria-label="Copy link"
          size="small"
          type="button"
          onClick={() => {
            void copyUrl();
          }}
        >
          <Copy size={COPY_ICON_SIZE} />
        </IconButton>
      </TooltipWrapper>
    </div>
  );
};
