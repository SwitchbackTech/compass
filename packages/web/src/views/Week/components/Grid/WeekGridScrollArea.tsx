import { type FC, type PropsWithChildren } from "react";
import { ID_WEEK_GRID_SCROLLER } from "@web/common/constants/web.constants";
import { WeekGridScroller, WeekGridScrollFrame } from "@web/views/Week/styled";

export const WeekGridScrollArea: FC<PropsWithChildren> = ({ children }) => {
  return (
    <WeekGridScrollFrame>
      <WeekGridScroller
        aria-label="Week calendar horizontal scroll area"
        id={ID_WEEK_GRID_SCROLLER}
        tabIndex={0}
      >
        {children}
      </WeekGridScroller>
    </WeekGridScrollFrame>
  );
};
