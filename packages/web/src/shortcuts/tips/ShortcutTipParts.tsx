import { type FC } from "react";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import {
  getPartsPlainText,
  type ShortcutTipPart,
} from "@web/shortcuts/tips/shortcut-tips.data";

const partKeycaps = (
  part: Exclude<ShortcutTipPart, string>,
): readonly string[] => ("keys" in part ? part.keys : [part.key]);

/**
 * Prose with inline keycap chips. The visible chips are aria-hidden; the
 * reconstituted sentence is the accessible name.
 */
export const ShortcutTipParts: FC<{
  parts: readonly ShortcutTipPart[];
}> = ({ parts }) => {
  const plainText = getPartsPlainText(parts);

  return (
    <span>
      <span className="sr-only">{plainText}</span>
      <span aria-hidden className="inline-flex flex-wrap items-center gap-1">
        {parts.map((part, i) =>
          typeof part === "string" ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: parts are a fixed, order-stable literal
            <span key={i}>{part}</span>
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: parts are a fixed, order-stable literal
            <ShortcutKeys key={i} keys={[...partKeycaps(part)]} />
          ),
        )}
      </span>
    </span>
  );
};
