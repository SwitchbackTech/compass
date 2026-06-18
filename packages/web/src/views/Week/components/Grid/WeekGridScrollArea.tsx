import { type FC, type PropsWithChildren } from "react";
import { ID_WEEK_GRID_SCROLLER } from "@web/common/constants/web.constants";

export const WeekGridScrollArea: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="relative min-h-0 w-full flex-1">
      <div
        className="c-week-grid-scroller"
        aria-label="Week calendar horizontal scroll area"
        id={ID_WEEK_GRID_SCROLLER}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
};
