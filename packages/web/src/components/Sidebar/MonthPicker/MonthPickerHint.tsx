import { type FC } from "react";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { type MonthPickerUnit } from "./monthPickerCursor";

interface Props {
  hasMovedWithArrows: boolean;
  isFocused: boolean;
  unit: MonthPickerUnit;
}

const hintClassName =
  "c-context-tooltip top-full bottom-auto left-1/2 mt-1.5 mb-0 flex -translate-x-1/2 items-center gap-1.5";

function statusText({ hasMovedWithArrows, isFocused, unit }: Props): string {
  if (!isFocused) return "I focuses the picker";
  if (hasMovedWithArrows) {
    return `Up and down arrows move by ${unit}. Enter opens it.`;
  }
  return `Up and down arrows move by ${unit}`;
}

/**
 * Caption under the month grid. Hover (or any unfocused glance) only
 * advertises `I`. Focusing the picker reveals the arrow keycaps; using an
 * arrow then adds Enter, styled as the same kind of keycap as `I`.
 */
export const MonthPickerHint: FC<Props> = ({
  hasMovedWithArrows,
  isFocused,
  unit,
}) => {
  return (
    <span role="status" className={hintClassName}>
      <span className="sr-only">
        {statusText({ hasMovedWithArrows, isFocused, unit })}
      </span>
      {isFocused ? (
        <>
          <ShortcutKeys keys={["ArrowUp", "ArrowDown"]} />
          <span aria-hidden>move by {unit}</span>
          {hasMovedWithArrows ? (
            <>
              <span aria-hidden>·</span>
              <ShortcutKeys keys="Enter" />
              <span aria-hidden>opens it</span>
            </>
          ) : null}
        </>
      ) : (
        <>
          <ShortcutKeys keys="I" />
          <span aria-hidden>focuses the picker</span>
        </>
      )}
    </span>
  );
};
