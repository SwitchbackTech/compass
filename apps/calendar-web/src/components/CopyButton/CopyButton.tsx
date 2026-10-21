import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { copyText } from "@web/common/utils/clipboard/clipboard.util";
import IconButton from "@web/components/IconButton/IconButton";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

const COPIED_RESET_MS = 1500;
const ICON_SIZE = 16;

export interface CopyButtonProps {
  /** Text written to the clipboard on click. */
  text: string;
  /** Accessible name, e.g. "copy guest@example.com". */
  label: string;
  className?: string;
  /** Called after a successful copy. */
  onCopied?: () => void;
  /** Optional keycap hint rendered beside the icon (always visible). */
  shortcutKeys?: readonly string[];
}

/**
 * Small copy icon beside a copyable value. Low opacity by default, full opacity
 * on hover and keyboard focus. Swaps to a checkmark briefly after copying.
 */
export function CopyButton({
  text,
  label,
  className,
  onCopied,
  shortcutKeys,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const handleCopy = () => {
    if (!text.trim()) return;

    void copyText(text).then((didCopy) => {
      if (!didCopy) return;
      onCopied?.();
      setCopied(true);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(
        () => setCopied(false),
        COPIED_RESET_MS,
      );
    });
  };

  const ariaLabel = copied ? "Copied" : label;

  return (
    <span
      className={classNames(
        "group inline-flex shrink-0 items-center gap-1",
        className,
      )}
    >
      <IconButton
        aria-label={ariaLabel}
        aria-keyshortcuts={
          shortcutKeys?.length
            ? shortcutKeys
                .map((key) => (key === "Mod" ? "Meta Control" : key))
                .join(" ")
            : undefined
        }
        className="opacity-25 transition-opacity hover:opacity-100 focus-visible:opacity-100"
        disabled={!text.trim()}
        onClick={(event) => {
          event.stopPropagation();
          handleCopy();
        }}
        onKeyDown={(event) => {
          // Nested in chips/comboboxes, Enter/Space must not bubble to a parent
          // that preventDefault's them (which would block the native button click).
          if (event.key === "Enter" || event.key === " ") {
            event.stopPropagation();
          }
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        size="small"
        tabIndex={0}
        type="button"
      >
        {copied ? <Check size={ICON_SIZE} /> : <Copy size={ICON_SIZE} />}
      </IconButton>
      {shortcutKeys && shortcutKeys.length > 0 ? (
        <ShortcutKeys
          className="opacity-25 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
          keys={[...shortcutKeys]}
        />
      ) : null}
    </span>
  );
}
