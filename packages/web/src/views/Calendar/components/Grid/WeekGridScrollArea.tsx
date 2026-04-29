import {
  type FC,
  type PropsWithChildren,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ID_WEEK_GRID_SCROLLER } from "@web/common/constants/web.constants";
import {
  WeekGridScroller,
  WeekGridScrollFrame,
  WeekGridScrollRail,
  WeekGridScrollThumb,
} from "@web/views/Calendar/styled";

interface ScrollState {
  isScrollable: boolean;
  thumbLeft: number;
  thumbWidth: number;
}

const initialScrollState: ScrollState = {
  isScrollable: false,
  thumbLeft: 0,
  thumbWidth: 100,
};

const getScrollState = (element: HTMLDivElement): ScrollState => {
  const maxScrollLeft = element.scrollWidth - element.clientWidth;
  const isScrollable = maxScrollLeft > 1;

  if (!isScrollable) {
    return initialScrollState;
  }

  const scrollProgress = element.scrollLeft / maxScrollLeft;
  const thumbWidth = Math.max(
    (element.clientWidth / element.scrollWidth) * 100,
    18,
  );

  return {
    isScrollable,
    thumbLeft: scrollProgress * (100 - thumbWidth),
    thumbWidth,
  };
};

const isSameScrollState = (a: ScrollState, b: ScrollState) =>
  a.isScrollable === b.isScrollable &&
  a.thumbLeft === b.thumbLeft &&
  a.thumbWidth === b.thumbWidth;

export const WeekGridScrollArea: FC<PropsWithChildren> = ({ children }) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] =
    useState<ScrollState>(initialScrollState);

  const updateScrollState = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const nextState = getScrollState(scroller);
    setScrollState((currentState) =>
      isSameScrollState(currentState, nextState) ? currentState : nextState,
    );
  }, []);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    updateScrollState();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateScrollState);
    resizeObserver?.observe(scroller);

    if (scroller.firstElementChild) {
      resizeObserver?.observe(scroller.firstElementChild);
    }

    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      resizeObserver?.disconnect();
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

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
      <WeekGridScrollRail
        $isVisible={scrollState.isScrollable}
        aria-hidden="true"
      >
        <WeekGridScrollThumb
          style={{
            left: `${scrollState.thumbLeft}%`,
            width: `${scrollState.thumbWidth}%`,
          }}
        />
      </WeekGridScrollRail>
    </WeekGridScrollFrame>
  );
};
