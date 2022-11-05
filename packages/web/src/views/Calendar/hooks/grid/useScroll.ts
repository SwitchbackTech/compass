import { getCurrentMinute } from "@web/common/utils/grid.util";
import { useCallback, useEffect } from "react";

import { Ref_Grid } from "../../components/Grid/grid.types";

export const useScroll = (timedGridRef: Ref_Grid) => {
  const scrollToNow = useCallback(() => {
    const rows = 11;
    const gridRowHeight = (timedGridRef.current.clientHeight || 0) / rows;
    const minuteHeight = gridRowHeight / 60;

    const buffer = 150;
    const top = getCurrentMinute() * minuteHeight - buffer;

    timedGridRef.current.scroll({
      top,
      behavior: "smooth",
    });
  }, [timedGridRef]);

  useEffect(() => {
    if (!timedGridRef.current) return;

    scrollToNow();
  }, [scrollToNow, timedGridRef]);

  return { scrollToNow };
};

export type Util_Scroll = ReturnType<typeof useScroll>;
