import { useState, useEffect, useCallback } from "react";
import { WidthPercentages } from "@web/common/types/util.types";
import { getWidthInPixels } from "@web/common/utils/grid.util";

export const useWidths = (colWidthPercentages: WidthPercentages) => {
  const windowWidth = window.innerWidth;

  const getCurrentWidths = () => {
    const currentWidths = colWidthPercentages.current.map((percent) => {
      return getWidthInPixels(percent, windowWidth);
    });
    return currentWidths;
  };

  const getPastFutureWidth = () => {
    const weeksInView = 7;
    const pastFutureWidth = getWidthInPixels(100 / weeksInView, windowWidth);
    return pastFutureWidth;
  };

  const [current, setCurrentWidths] = useState<number[]>(getCurrentWidths);
  const [pastFuture, setPastFutureWidth] = useState<number>(getPastFutureWidth);

  const updateWidths = useCallback(() => {
    console.log("updating widths...");
    // duplicating width funcs to appease react hook rules
    const _currentCallback = () => {
      const currentWidths = colWidthPercentages.current.map((percent) => {
        return getWidthInPixels(percent, windowWidth);
      });
      return currentWidths;
    };

    const _pastFutureCallback = () => {
      const weeksInView = 7;
      const pastFutureWidth = getWidthInPixels(100 / weeksInView, windowWidth);
      return pastFutureWidth;
    };

    const current = _currentCallback();
    setCurrentWidths(current);

    const pastFuture = _pastFutureCallback();

    setPastFutureWidth(pastFuture);
  }, [colWidthPercentages, windowWidth]);

  useEffect(() => {
    window.addEventListener("resize", updateWidths);
    return () => {
      window.removeEventListener("resize", updateWidths);
    };
  }, [updateWidths]);

  return { current, pastFuture };
};

/*
OLD WAY - CAUSED RUNNING TWICE - DELETE ONCE CONFIDENT IN ABOVE
export const useWidths = (colWidthPercentages: WidthPercentages) => {
  const [current, setCurrentWidths] = useState<null | number[]>(null);
  const [pastFuture, setPastFutureWidth] = useState<null | number>(null);

  const updateWidths = useCallback(() => {
    const windowWidth = window.innerWidth;
    const currentWidths = colWidthPercentages.current.map((percent) => {
      return getWidthInPixels(percent, windowWidth);
    });
    setCurrentWidths(currentWidths);

    const weeksInView = 7;
    const pastFutureWidth = getWidthInPixels(100 / weeksInView, windowWidth);
    setPastFutureWidth(pastFutureWidth);
  }, [colWidthPercentages]);

  useEffect(() => {
    updateWidths();
    window.addEventListener("resize", updateWidths);
    return () => {
      window.removeEventListener("resize", updateWidths);
    };
  }, [updateWidths]);

  return { current, pastFuture };
};
*/
