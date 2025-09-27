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

  const mainGridRef = useRef<HTMLDivElement | null>(null);

  const _measureAllDayRow = useCallback(
    (_node?: HTMLDivElement) => {
      const node = _node ?? getElemById(ID_GRID_ALLDAY_ROW);

      if (!node) return;

      const allDayRect = node.getBoundingClientRect();

      setAllDayMeasurements(allDayRect);
    },
    [setAllDayMeasurements],
  );

  const _measureColWidths = useCallback(
    (_node?: HTMLDivElement) => {
      const node = _node ?? getElemById(ID_ALLDAY_COLUMNS);
      const daysInView = 7;

      if (!node) return;

      const colWidth = node.clientWidth / daysInView;
      const colWidths = Array(daysInView).fill(colWidth);

      setColWidths(colWidths);
    },
    [setColWidths],
  );
  const allDayRef = useCallback(
    (node: HTMLDivElement) => {
      if (node !== null) {
        _measureAllDayRow(node);
        _measureColWidths(node);
      }
    },
    [_measureAllDayRow, _measureColWidths],
  );

  const _measureMainGrid = useCallback(
    (_node?: HTMLDivElement) => {
      const node = _node ?? getElemById(ID_GRID_MAIN);

      if (!node) return;

      const mainRect = node.getBoundingClientRect();

      setMainMeasurements(mainRect);
    },
    [setMainMeasurements],
  );

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
    _measureMainGrid();
    _measureAllDayRow();
    _measureColWidths();
  }, [
    isSidebarOpen,
    week,
    _measureColWidths,
    _measureMainGrid,
    _measureAllDayRow,
  ]);

  useEffect(() => {
    const update = () => {
      _measureAllDayRow();
      _measureColWidths();
      _measureMainGrid();
    };

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [_measureAllDayRow, _measureColWidths, _measureMainGrid]);

  useEffect(() => {
    _measureAllDayRow();
  }, [alldayRowsCount, _measureAllDayRow]);

  useEffect(() => {
    if (mainGridRef.current && !mainMeasurements) {
      _measureMainGrid(mainGridRef.current);
    }
  }, [_measureMainGrid, mainMeasurements]);

  return {
    gridRefs: {
      allDayRef,
      mainGridRef,
    },
    measurements: {
      allDayRow: allDayMeasurements,
      colWidths,
      mainGrid: mainMeasurements,
      hourHeight: mainMeasurements?.height ? mainMeasurements?.height / 11 : 0,
      remeasure,
    },
  };
};

export type Layout_Grid = ReturnType<typeof useGridLayout>;
export type Measurements_Grid = Layout_Grid["measurements"];
export type Refs_Grid = Layout_Grid["gridRefs"];
