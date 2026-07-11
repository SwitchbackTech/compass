import { useCallback, useRef, useState } from "react";
import { CALENDAR_TIMED_VISIBLE_HOURS } from "@web/layout/calendar-grid/calendarGrid.constants";
import {
  type CalendarGridMeasurement,
  type CalendarGridMeasurements,
  type CalendarGridRefs,
} from "@web/layout/calendar-grid/types/calendarGrid.types";

const toMeasurementSnapshot = (
  rect: DOMRectReadOnly,
): CalendarGridMeasurement => ({
  bottom: rect.bottom,
  height: rect.height,
  left: rect.left,
  right: rect.right,
  top: rect.top,
  width: rect.width,
  x: rect.x,
  y: rect.y,
});

const areMeasurementsEqual = (
  current: CalendarGridMeasurement | null | undefined,
  next: CalendarGridMeasurement,
) => {
  return (
    current?.bottom === next.bottom &&
    current.height === next.height &&
    current.left === next.left &&
    current.right === next.right &&
    current.top === next.top &&
    current.width === next.width &&
    current.x === next.x &&
    current.y === next.y
  );
};

export const useCalendarGridLayout = ({
  isInteractionMotionActive = () => false,
  visibleDateCount,
}: {
  isInteractionMotionActive?: () => boolean;
  visibleDateCount: number;
}) => {
  const safeVisibleDateCount = Math.max(1, visibleDateCount);

  const [allDayMeasurements, setAllDayMeasurements] =
    useState<CalendarGridMeasurement | null>(null);
  const [allDayColumnsMeasurements, setAllDayColumnsMeasurements] =
    useState<CalendarGridMeasurement | null>(null);
  const [mainMeasurements, setMainMeasurements] =
    useState<CalendarGridMeasurement | null>(null);

  const allDayColumnsRef = useRef<HTMLDivElement | null>(null);
  const mainGridRef = useRef<HTMLDivElement | null>(null);
  const timedColumnsRef = useRef<HTMLDivElement | null>(null);
  const observersRef = useRef(new Map<string, ResizeObserver>());

  const updateAllDayRowMeasurement = useCallback(
    (node: HTMLDivElement) => {
      if (isInteractionMotionActive()) {
        return;
      }

      const next = toMeasurementSnapshot(node.getBoundingClientRect());
      setAllDayMeasurements((current) => {
        if (isInteractionMotionActive()) {
          return current;
        }

        return areMeasurementsEqual(current, next) ? current : next;
      });
    },
    [isInteractionMotionActive],
  );

  const updateAllDayColumnsMeasurement = useCallback(
    (node: HTMLDivElement) => {
      if (isInteractionMotionActive()) {
        return;
      }

      const next = toMeasurementSnapshot(node.getBoundingClientRect());
      setAllDayColumnsMeasurements((current) => {
        if (isInteractionMotionActive()) {
          return current;
        }

        return areMeasurementsEqual(current, next) ? current : next;
      });
    },
    [isInteractionMotionActive],
  );

  const updateMainGridMeasurement = useCallback(
    (node: HTMLDivElement) => {
      if (isInteractionMotionActive()) {
        return;
      }

      const next = toMeasurementSnapshot(node.getBoundingClientRect());
      setMainMeasurements((current) => {
        if (isInteractionMotionActive()) {
          return current;
        }

        return areMeasurementsEqual(current, next) ? current : next;
      });
    },
    [isInteractionMotionActive],
  );

  const observeElement = useCallback(
    (
      key: string,
      node: HTMLDivElement | null,
      measure: (node: HTMLDivElement) => void,
    ) => {
      observersRef.current.get(key)?.disconnect();
      observersRef.current.delete(key);

      if (!node) {
        return;
      }

      measure(node);

      if (typeof ResizeObserver === "undefined") {
        return;
      }

      const observer = new ResizeObserver(() => measure(node));
      observer.observe(node);
      observersRef.current.set(key, observer);
    },
    [],
  );

  const allDayRowRef = useCallback(
    (node: HTMLDivElement | null) => {
      observeElement("allDayRow", node, updateAllDayRowMeasurement);
    },
    [observeElement, updateAllDayRowMeasurement],
  );

  const allDayRef = useCallback(
    (node: HTMLDivElement | null) => {
      allDayColumnsRef.current = node;
      observeElement("allDayColumns", node, updateAllDayColumnsMeasurement);
    },
    [observeElement, updateAllDayColumnsMeasurement],
  );

  const mainGridElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      mainGridRef.current = node;
      observeElement("mainGrid", node, updateMainGridMeasurement);
    },
    [observeElement, updateMainGridMeasurement],
  );

  const timedColumnsElementRef = useCallback((node: HTMLDivElement | null) => {
    timedColumnsRef.current = node;
  }, []);

  const colWidths = allDayColumnsMeasurements?.width
    ? Array(safeVisibleDateCount).fill(
        allDayColumnsMeasurements.width / safeVisibleDateCount,
      )
    : [];

  const gridRefs: CalendarGridRefs = {
    allDayRef,
    allDayColumnsRef,
    allDayRowRef,
    mainGridElementRef,
    mainGridRef,
    timedColumnsElementRef,
    timedColumnsRef,
  };

  const measurements: CalendarGridMeasurements = {
    allDayRow: allDayMeasurements,
    colWidths,
    hourHeight: mainMeasurements?.height
      ? mainMeasurements.height / CALENDAR_TIMED_VISIBLE_HOURS
      : 0,
    mainGrid: mainMeasurements,
  };

  return {
    gridRefs,
    measurements,
  };
};

export type CalendarGridLayout = ReturnType<typeof useCalendarGridLayout>;
