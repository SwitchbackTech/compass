import { type FC, type PropsWithChildren } from "react";
import { ID_WEEK_GRID_SCROLLER } from "@web/common/constants/web.constants";

export const WeekGridScrollArea: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="relative min-h-0 w-full flex-1">
      <section
        className="peer h-full w-full overflow-x-auto overflow-y-hidden [overscroll-behavior-x:contain] [scrollbar-width:none] focus-visible:outline-none [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
        aria-label="Week calendar horizontal scroll area"
        id={ID_WEEK_GRID_SCROLLER}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: WCAG 2.1.1 requires a scrollable region to be keyboard-focusable (axe's scrollable-region-focusable rule); the focus-visible overlay below is already styled for this, tabIndex={-1} just made it unreachable by Tab.
        tabIndex={0}
      >
        {children}
      </section>
      {/* Rendered as a sibling overlay, not an outline on the section itself, so the ring isn't clipped by the section's own overflow-y-hidden (which cuts off the top edge behind the all-day row). */}
      <div className="pointer-events-none absolute inset-0 hidden outline outline-1 outline-[var(--accent)] peer-focus-visible:block" />
    </div>
  );
};
