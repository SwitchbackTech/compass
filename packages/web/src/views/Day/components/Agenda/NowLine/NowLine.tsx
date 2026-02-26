import { memo, useCallback, useEffect, useRef, useState } from "react";
import { fromEvent, share } from "rxjs";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import {
  getAgendaEventTime,
  getNowLinePosition,
} from "@web/views/Day/util/agenda/agenda.util";
import { setupMinuteSync } from "@web/views/Day/util/time/time.util";

const scroll$ = fromEvent(
  compassEventEmitter,
  CompassDOMEvents.SCROLL_TO_NOW_LINE,
).pipe(share());

export const NowLine = memo(function NowLine() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const scrollToNow = useCallback(() => {
    ref.current?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [ref]);

  useEffect(() => {
    const cleanup = setupMinuteSync(() => {
      setCurrentTime(new Date());
    });

    return cleanup;
  }, []);

  useEffect(() => {
    const subscription = scroll$.subscribe(scrollToNow);

    return () => subscription.unsubscribe();
  }, [scrollToNow]);

  return (
    <div
      ref={ref}
      data-now-marker="true"
      className={"text-accent-primary absolute right-0 left-0 z-5 border-t-1"}
      style={{
        top: `${getNowLinePosition(currentTime)}px`,
      }}
    >
      <div className="now-line absolute -top-1 -left-2 h-2 w-4 rounded-full"></div>
      <div className="pointer-events-none absolute -top-2 left-0 w-16 rounded-sm bg-[#0c0f17] px-1 text-[11px] leading-none font-medium shadow-sm">
        {getAgendaEventTime(currentTime)}
      </div>
    </div>
  );
});

NowLine.displayName = "NowLine";
