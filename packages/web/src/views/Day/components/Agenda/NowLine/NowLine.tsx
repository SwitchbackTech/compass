import { ForwardedRef, forwardRef, useEffect, useState } from "react";
import { maxAgendaZIndex$ } from "@web/common/utils/dom/grid-organization.util";
import {
  getAgendaEventTime,
  getNowLinePosition,
} from "@web/views/Day/util/agenda/agenda.util";
import { setupMinuteSync } from "@web/views/Day/util/time/time.util";

export const NowLine = forwardRef(
  (_: {}, ref: ForwardedRef<HTMLDivElement | null>) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
      const cleanup = setupMinuteSync(() => {
        setCurrentTime(new Date());
      });

      return cleanup;
    }, []);

    return (
      <div
        ref={ref}
        data-now-marker="true"
        className={"absolute right-0 left-0 border-t-2 text-yellow-300"}
        style={{
          top: `${getNowLinePosition(currentTime)}px`,
          zIndex: maxAgendaZIndex$.getValue(),
        }}
      >
        <div className="now-line absolute -top-1 -left-2 h-2 w-4 rounded-full"></div>
        <div className="pointer-events-none absolute -top-2 left-0 w-16 rounded-sm bg-[#0c0f17] px-1 text-[11px] leading-none font-medium shadow-sm">
          {getAgendaEventTime(currentTime)}
        </div>
      </div>
    );
  },
);

NowLine.displayName = "NowLine";
