import { useEffect, useState } from "react";
import { WidthPixels } from "@web/common/types/util.types";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { Ref_Grid } from "@web/views/Calendar/components/Grid/grid.types";

export const useWidths = (allDayRef: Ref_Grid) => {
  const [colWidths, setColWidths] = useState<number[]>([]);

  useEffect(() => {
    if (!allDayRef?.current?.children) return;
    const colWidths = Array.from(allDayRef.current.children).map(
      (e) => e.clientWidth
    );
    setColWidths(colWidths);
  }, [allDayRef]);

  return colWidths;
};

export const useWidthsOld = (allDayRowWidth: number) => {
  console.log("allDayRowWidth:", allDayRowWidth);
  const [colWidths, setColWidths] = useState<WidthPixels>({
    current: { sidebarOpen: [0], sidebarClosed: [0] },
    pastFuture: { sidebarOpen: 0, sidebarClosed: 0 },
  });

  useEffect(() => {
    const equalOpen = allDayRowWidth / 7;
    const currentOpen = [
      equalOpen,
      equalOpen,
      equalOpen,
      equalOpen,
      equalOpen,
      equalOpen,
      equalOpen,
    ];

    const equalClosed = (allDayRowWidth + SIDEBAR_OPEN_WIDTH) / 7;
    const currentClosed = [
      equalClosed,
      equalClosed,
      equalClosed,
      equalClosed,
      equalClosed,
      equalClosed,
      equalClosed,
    ];

    setColWidths({
      current: {
        sidebarOpen: currentOpen,
        sidebarClosed: currentClosed,
      },
      pastFuture: {
        sidebarOpen: equalOpen,
        sidebarClosed: equalClosed,
      },
    });
  }, [allDayRowWidth]);

  return colWidths;
};
