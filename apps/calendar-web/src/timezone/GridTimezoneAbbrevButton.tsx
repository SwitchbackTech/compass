import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { GRID_TIME_COLUMN_WIDTH } from "@web/grid/grid.constants";

const timezoneAbbrevClassName =
  "c-focus-ring min-h-6 truncate rounded-sm px-0.5 text-center text-[10px] text-text-muted leading-none hover:text-text";

type Props = Omit<
  ComponentPropsWithoutRef<"button">,
  "aria-label" | "children" | "className" | "style" | "type"
> & {
  abbreviation: string;
  /** Accessible name prefix, e.g. "Calendar timezone". */
  label: string;
  /**
   * Two labels sharing the time column each take a fixed half; a lone label
   * fills the column instead.
   */
  shareColumn: boolean;
};

/**
 * One timezone abbreviation in the week/day grid corner. Forwards its ref and
 * remaining props so a tooltip trigger can anchor on the button element.
 */
export const GridTimezoneAbbrevButton = forwardRef<HTMLButtonElement, Props>(
  function GridTimezoneAbbrevButton(
    { abbreviation, label, shareColumn, ...buttonProps },
    ref,
  ) {
    return (
      <button
        {...buttonProps}
        aria-label={`${label}: ${abbreviation}`}
        className={
          shareColumn
            ? timezoneAbbrevClassName
            : `${timezoneAbbrevClassName} w-full max-w-full`
        }
        ref={ref}
        style={shareColumn ? { width: GRID_TIME_COLUMN_WIDTH } : undefined}
        type="button"
      >
        {abbreviation}
      </button>
    );
  },
);
