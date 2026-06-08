import { type ReactNode, useState } from "react";
import { getLifeDotLabel } from "./life.utils";

interface LifeDotTooltipProps {
  weekNumber: number;
  children: ReactNode;
}

export function LifeDotTooltip({ weekNumber, children }: LifeDotTooltipProps) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const label = getLifeDotLabel(weekNumber);

  return (
    // biome-ignore lint/a11y/useSemanticElements: This trigger wraps thousands of grid cells; using real buttons makes the Bun web suite materially slower. Keyboard semantics are provided explicitly.
    <span
      className="relative inline-flex cursor-pointer border-0 bg-transparent p-0"
      onBlur={() => {
        setOpen(false);
        setPinned(false);
      }}
      onClick={() => {
        setPinned((current) => {
          setOpen(!current);
          return !current;
        });
      }}
      onFocus={() => setOpen(true)}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => {
        if (!pinned) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        setPinned((current) => {
          setOpen(!current);
          return !current;
        });
      }}
      role="button"
      tabIndex={0}
    >
      {children}
      {open ? (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded border border-border-primary bg-bg-secondary px-2 py-1 text-text-lighter text-xs shadow-lg"
          role="tooltip"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
