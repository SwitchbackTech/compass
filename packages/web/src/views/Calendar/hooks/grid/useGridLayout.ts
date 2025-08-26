import { useCallback, useEffect, useRef, useState } from "react";
import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { getElemById } from "@web/common/utils/grid.util";
import { selectRowCount } from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";

export type MeasureableElement = "mainGrid" | "allDayRow";

export const useGridLayout = (isSidebarOpen: boolean, week: number) => {
  const alldayRowsCount = useAppSelector(selectRowCount);
  const [allDayMeasurements, setAllDayMeasurements] = useState<DOMRect | null>(
    null,
  );
  const [mainMeasurements, setMainMeasurements] = useState<DOMRect | null>();
  const [colWidths, setColWidths] = useState<number[]>([]);

  useEffect(() => {
    _measureMainGrid();
    _measureAllDayRow();
    _measureColWidths();
  }, [isSidebarOpen, week]);

  useEffect(() => {
    const update = () => {
      _measureAllDayRow();
      _measureColWidths();
      _measureMainGrid();
    };

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    _measureAllDayRow();
  }, [alldayRowsCount]);

  const allDayRef = useCallback((node: HTMLDivElement) => {
    if (node !== null) {
      _measureAllDayRow(node);
      _measureColWidths(node);
    }
  }, []);

  const mainGridRef = useRef<HTMLDivElement | null>(null);

  const _measureAllDayRow = (node?: HTMLDivElement) => {
    if (node) {
      const allDayRect = node.getBoundingClientRect();
      setAllDayMeasurements(allDayRect);
      return;
    }
    const allDayRect = getElemById(ID_GRID_ALLDAY_ROW).getBoundingClientRect();
    setAllDayMeasurements(allDayRect);
  };

  const _measureColWidths = (node?: HTMLDivElement) => {
    const daysInView = 7;
    if (node) {
      const colWidth = node.clientWidth / daysInView;
      const colWidths = Array(daysInView).fill(colWidth);
      setColWidths(colWidths);
      return;
    }

    const cols = getElemById(ID_ALLDAY_COLUMNS);
    const colWidth = cols.clientWidth / daysInView;
    const colWidths = Array(daysInView).fill(colWidth);

    setColWidths(colWidths);
  };

  const _measureMainGrid = (node?: HTMLDivElement) => {
    if (node) {
      const mainRect = node.getBoundingClientRect();
      setMainMeasurements(mainRect);
      return;
    }
    const mainRect = getElemById(ID_GRID_MAIN).getBoundingClientRect();
    setMainMeasurements(mainRect);
  };

  const remeasure = (elem: MeasureableElement) => {
    switch (elem) {
      case "mainGrid": {
        _measureMainGrid();
        break;
      }
      case "allDayRow": {
        break;
      }
      default: {
        console.error("failed to specify which element to measure");
        break;
      }
    }
  };

  useEffect(() => {
    if (mainGridRef.current && !mainMeasurements) {
      _measureMainGrid(mainGridRef.current);
    }
  }, [mainGridRef.current]);

  return {
    gridRefs: {
      allDayRef,
      mainGridRef,
    },
    measurements: {
      allDayRow: allDayMeasurements,
      colWidths,
      mainGrid: mainMeasurements,
      hourHeight: mainMeasurements?.height / 11 || 0,
      remeasure,
    },
  };
};

export type Layout_Grid = ReturnType<typeof useGridLayout>;
export type Measurements_Grid = Layout_Grid["measurements"];
export type Refs_Grid = Layout_Grid["gridRefs"];
