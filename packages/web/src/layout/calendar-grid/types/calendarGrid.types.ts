import {
  type MutableRefObject,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefCallback,
} from "react";
import { type Dayjs } from "@core/util/date/dayjs";

export interface CalendarGridVisibleDate {
  date: Dayjs;
  key: string;
  surfaceLabel?: string;
}

export interface CalendarGridMeasurement {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
  x: number;
  y: number;
}

export interface CalendarGridMeasurements {
  allDayRow: CalendarGridMeasurement | null;
  colWidths: number[];
  hourHeight: number;
  mainGrid: CalendarGridMeasurement | null;
}

export interface CalendarGridRefs {
  allDayColumnsRef: MutableRefObject<HTMLDivElement | null>;
  allDayRef: RefCallback<HTMLDivElement>;
  allDayRowRef: RefCallback<HTMLDivElement>;
  mainGridElementRef: RefCallback<HTMLDivElement>;
  mainGridRef: MutableRefObject<HTMLDivElement | null>;
  timedColumnsElementRef: RefCallback<HTMLDivElement>;
  timedColumnsRef: MutableRefObject<HTMLDivElement | null>;
}

export interface CalendarEventPosition {
  height: number;
  left: number;
  top: number;
  width: number;
  zIndex?: number;
}

export interface CalendarGridRenderLayers {
  allDayEvents: ReactNode;
  timedEvents: ReactNode;
}

export interface CalendarGridMouseHandlers {
  onAllDayMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
  onTimedMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
}
