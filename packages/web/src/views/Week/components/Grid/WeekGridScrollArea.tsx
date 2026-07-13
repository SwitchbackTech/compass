import { type FC, type PropsWithChildren } from "react";
import { ID_WEEK_GRID_SCROLLER } from "@web/common/constants/web.constants";

export const WeekGridScrollArea: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="relative min-h-0 w-full flex-1">
      <div
        className="h-full w-full overflow-x-auto overflow-y-hidden [overscroll-behavior-x:contain] [scrollbar-width:none] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--compass-color-accent-primary)] focus-visible:[outline-offset:-1px] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
        aria-label="Week calendar horizontal scroll area"
        id={ID_WEEK_GRID_SCROLLER}
      >
        {children}
      </div>
    </div>
  );
};
