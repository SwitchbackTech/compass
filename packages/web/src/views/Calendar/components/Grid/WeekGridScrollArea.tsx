import { type FC, type PropsWithChildren, useRef } from "react";
import { ID_WEEK_GRID_SCROLLER } from "@web/common/constants/web.constants";
import {
  WeekGridScroller,
  WeekGridScrollFrame,
} from "@web/views/Calendar/styled";

export const WeekGridScrollArea: FC<PropsWithChildren> = ({ children }) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  return (
    <WeekGridScrollFrame>
      <WeekGridScroller
        aria-label="Week calendar horizontal scroll area"
        id={ID_WEEK_GRID_SCROLLER}
        ref={scrollerRef}
        tabIndex={0}
      >
        {children}
      </WeekGridScroller>
    </WeekGridScrollFrame>
  );
};
