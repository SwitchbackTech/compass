import { type FC, type ReactElement, useEffect, useState } from "react";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { TooltipDescription } from "@web/components/Tooltip/Description/TooltipDescription";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip/Tooltip";

const ENTRY_HINT_MS = 5_000;

/**
 * Anchored on the secondary timezone control: surfaces Esc on entry, then on
 * hover or focus like other grid tooltips.
 */
export const SecondaryTimezoneExitHint: FC<{
  children: ReactElement;
}> = ({ children }) => {
  // Remounted (keyed on the zone) whenever a new second zone is picked, so
  // the pulse starts from this initial state rather than an effect reset.
  const [entryPulse, setEntryPulse] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => setEntryPulse(false), ENTRY_HINT_MS);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <Tooltip
      open={entryPulse || undefined}
      onOpenChange={(open) => {
        if (!open) {
          setEntryPulse(false);
        }
      }}
      placement="bottom"
    >
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center">
          <TooltipDescription description="Hide second timezone" />
          <ShortcutKeys keys="Esc" />
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
