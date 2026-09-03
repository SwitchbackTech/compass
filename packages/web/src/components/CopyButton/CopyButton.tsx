import { Check, Copy } from "@phosphor-icons/react";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { copyText } from "@web/common/utils/clipboard/clipboard.util";
import IconButton from "@web/components/IconButton/IconButton";
import { pointerPassAttributes } from "@web/shortcuts/keyboard-only/pointer-action";
import { pointerConfusionActions } from "@web/shortcuts/keyboard-only/pointer-confusion.store";

const COPIED_RESET_MS = 1500;
const ICON_SIZE = 16;

export interface CopyButtonProps {
  /** Text written to the clipboard on click. */
  text: string;
  /** Accessible name, e.g. "copy event title". */
  label: string;
  className?: string;
  /** Called after a successful copy (for confusion-score telemetry). */
  onCopied?: () => void;
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
      pointerConfusionActions.recordCopyButtonClick();
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
    <IconButton
      {...pointerPassAttributes}
      aria-label={ariaLabel}
      className={classNames(
        "shrink-0 opacity-25 transition-opacity hover:opacity-100 focus-visible:opacity-100",
        className,
      )}
      disabled={!text.trim()}
      onClick={handleCopy}
      size="small"
      tabIndex={0}
      type="button"
    >
      {copied ? <Check size={ICON_SIZE} /> : <Copy size={ICON_SIZE} />}
    </IconButton>
  );
}
