import { type Schema_Event } from "@core/types/event.types";
import { type Dayjs } from "@core/util/date/dayjs";
import {
  type CalendarInteractionCancellationTargets,
  type CalendarInteractionEngineSchedulerOptions,
} from "@web/common/calendar-interaction/CalendarInteractionEngine";
import { type WeekLayoutCacheSources } from "@web/views/Week/interaction/adapter/geometry/weekLayoutCache";
import {
  type SomedayInteractionCategory,
  type SomedayInteractionRegisteredEvent,
} from "../registry/somedayEventRegistry";

export interface SomedayInteractionPointerOwnership {
  reason: string;
  shouldOwn: boolean;
}

export interface SomedayInteractionAdapterOptions {
  engineOptions?: CalendarInteractionEngineSchedulerOptions;
  getLayoutSources?: () => WeekLayoutCacheSources;
  getViewStart: () => Dayjs;
  runtime?: () => SomedayInteractionRuntime;
}

export interface SomedayInteractionRuntime {
  getSomedayEventById(eventId: string): Schema_Event | null;
  isSidebarDropAllowed?: (result: SomedaySidebarCommitResult) => boolean;
  onCancelInteraction?: () => void;
  onClickSomedayEvent(
    event: Schema_Event,
    category: SomedayInteractionCategory,
  ): void;
  onCommitSomedayInteraction(result: SomedayInteractionCommitResult): void;
  onMotionActivation?: (target: SomedayInteractionTarget) => void;
  onPreviewSomedaySidebarDrop?: (
    result: SomedaySidebarCommitResult | null,
  ) => void;
  onRequestWeekNavigation?: (direction: "next" | "prev") => void;
}

export interface SomedayInteractionTarget {
  category: SomedayInteractionCategory;
  event: Schema_Event;
  registered: SomedayInteractionRegisteredEvent;
}

export interface SomedaySidebarDrop {
  category: SomedayInteractionCategory;
  index: number;
  type: "sidebar";
}

export interface SomedayTimedDrop {
  dayIndex: number;
  endMinutes: number;
  startMinutes: number;
  type: "timed";
}

export interface SomedayAllDayDrop {
  dayIndex: number;
  type: "allDay";
}

export type SomedayInteractionDrop =
  | SomedayAllDayDrop
  | SomedaySidebarDrop
  | SomedayTimedDrop;

export interface SomedayInteractionVisual {
  drop: SomedayInteractionDrop | null;
  eventId: string;
  initialViewStart: Dayjs;
  pointerStart: {
    x: number;
    y: number;
  };
  sourceIndex: number;
  sourceRect: {
    height: number;
    left: number;
    top: number;
    width: number;
  };
  transform: {
    x: number;
    y: number;
  };
  weekOffsetDays: number;
}

export interface SomedayScheduleCommitResult {
  dates: {
    endDate: string;
    startDate: string;
  };
  eventId: string;
  isAllDay: boolean;
  type: "schedule";
}

export interface SomedaySidebarCommitResult {
  destination: {
    droppableId: string;
    index: number;
  };
  eventId: string;
  source: {
    droppableId: string;
    index: number;
  };
  type: "sidebarDrop";
}

export interface SomedayNoopCommitResult {
  type: "noop";
}

export type SomedayInteractionCommitResult =
  | SomedayNoopCommitResult
  | SomedayScheduleCommitResult
  | SomedaySidebarCommitResult;

export interface SomedayInteractionAdapter {
  cancel(): void;
  connectCancellationEvents(
    targets?: CalendarInteractionCancellationTargets,
  ): () => void;
  handlePointerCancel(event: PointerEvent): boolean;
  handlePointerDown(event: PointerEvent): SomedayInteractionPointerOwnership;
  handlePointerMove(event: PointerEvent): boolean;
  handlePointerUp(event: PointerEvent): boolean;
  ownsPointer(event: Pick<PointerEvent, "pointerId">): boolean;
  rebuildLayoutAfterNavigation(): void;
}
