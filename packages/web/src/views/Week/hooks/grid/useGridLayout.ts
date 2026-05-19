import { useCallback, useRef, useState } from "react";
import { isWeekInteractionMotionActive } from "@web/views/Week/interaction/state/weekInteractionMotionState";
import { WEEK_TIMED_VISIBLE_HOURS } from "@web/views/Week/layout.constants";

type MeasurementSnapshot = Pick<
  DOMRectReadOnly,
  "bottom" | "height" | "left" | "right" | "top" | "width" | "x" | "y"
>;

const DAYS_IN_VIEW = 7;

const toMeasurementSnapshot = (rect: DOMRectReadOnly): MeasurementSnapshot => ({
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
  current: MeasurementSnapshot | null | undefined,
  next: MeasurementSnapshot,
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

export const useGridLayout = () => {
  const [allDayMeasurements, setAllDayMeasurements] =
    useState<MeasurementSnapshot | null>(null);
  const [allDayColumnsMeasurements, setAllDayColumnsMeasurements] =
    useState<MeasurementSnapshot | null>(null);
  const [mainMeasurements, setMainMeasurements] =
    useState<MeasurementSnapshot | null>(null);

  const allDayColumnsRef = useRef<HTMLDivElement | null>(null);
  const mainGridRef = useRef<HTMLDivElement | null>(null);
  const timedColumnsRef = useRef<HTMLDivElement | null>(null);
  const observersRef = useRef(new Map<string, ResizeObserver>());

  const updateAllDayRowMeasurement = useCallback((node: HTMLDivElement) => {
    if (isWeekInteractionMotionActive()) {
      return;
    }

    const next = toMeasurementSnapshot(node.getBoundingClientRect());
    setAllDayMeasurements((current) => {
      if (isWeekInteractionMotionActive()) {
        return current;
      }

      return areMeasurementsEqual(current, next) ? current : next;
    });
  }, []);

  const updateAllDayColumnsMeasurement = useCallback((node: HTMLDivElement) => {
    if (isWeekInteractionMotionActive()) {
      return;
    }

    const next = toMeasurementSnapshot(node.getBoundingClientRect());
    setAllDayColumnsMeasurements((current) => {
      if (isWeekInteractionMotionActive()) {
        return current;
      }

      return areMeasurementsEqual(current, next) ? current : next;
    });
  }, []);

  const updateMainGridMeasurement = useCallback((node: HTMLDivElement) => {
    if (isWeekInteractionMotionActive()) {
      return;
    }

    const next = toMeasurementSnapshot(node.getBoundingClientRect());
    setMainMeasurements((current) => {
      if (isWeekInteractionMotionActive()) {
        return current;
      }

      return areMeasurementsEqual(current, next) ? current : next;
    });
  }, []);

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
    ? Array(DAYS_IN_VIEW).fill(allDayColumnsMeasurements.width / DAYS_IN_VIEW)
    : [];

  return {
    gridRefs: {
      allDayRef,
      allDayColumnsRef,
      allDayRowRef,
      mainGridElementRef,
      mainGridRef,
      timedColumnsElementRef,
      timedColumnsRef,
    },
    measurements: {
      allDayRow: allDayMeasurements,
      colWidths,
      mainGrid: mainMeasurements,
      hourHeight: mainMeasurements?.height
        ? mainMeasurements.height / WEEK_TIMED_VISIBLE_HOURS
        : 0,
    },
  };
};

export type Layout_Grid = ReturnType<typeof useGridLayout>;
export type Measurements_Grid = Layout_Grid["measurements"];
export type Refs_Grid = Layout_Grid["gridRefs"];
