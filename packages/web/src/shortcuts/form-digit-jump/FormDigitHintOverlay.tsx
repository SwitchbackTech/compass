import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import { getEventFormFieldElement } from "@web/common/utils/form/form.util";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { FORM_FIELD_DIGITS } from "@web/shortcuts/edit-sequence/edit-sequence.fields";
import { getVisibleHintRect } from "@web/shortcuts/shift-hint/shift-hint-visible-rect";

/** Screen-reader copy, so the visible chips can stay aria-hidden. */
const SR_TEXT = `Jump to field? ${FORM_FIELD_DIGITS.map(
  (entry) => `${entry.digit} for ${entry.label.toLowerCase()}`,
).join(", ")}. Release the modifier to dismiss.`;

/**
 * Numbered keycap chips anchored next to each form field while Mod is held
 * (see useFormDigitJumpShortcut). Portaled like ShiftHintOverlay so the
 * scrollable form body cannot clip a chip on a field near its edge.
 */
export function FormDigitHintOverlay({ visible }: { visible: boolean }) {
  const [, setLayoutTick] = useState(0);

  useEffect(() => {
    if (!visible) return;

    const refresh = () => setLayoutTick((tick) => tick + 1);
    window.addEventListener("resize", refresh);
    // Capture scroll from the form's own scrollable body.
    window.addEventListener("scroll", refresh, true);
    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [visible]);

  if (!visible || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0"
      data-form-digit-hints=""
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      <span aria-live="polite" className="sr-only" role="status">
        {SR_TEXT}
      </span>
      <div aria-hidden>
        {FORM_FIELD_DIGITS.map((entry) => {
          const anchor = getEventFormFieldElement(entry.field);
          if (!anchor) {
            // e.g. the calendar picker (digit 5) on an edit draft.
            return null;
          }

          const visibleRect = getVisibleHintRect(anchor);
          if (!visibleRect) {
            return null;
          }

          const chipWidth = 22;

          return (
            <span
              key={entry.field}
              className="absolute"
              style={{
                top: visibleRect.top + 2,
                left: Math.max(4, visibleRect.right - chipWidth),
              }}
            >
              <ShortcutHint>{entry.digit}</ShortcutHint>
            </span>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
