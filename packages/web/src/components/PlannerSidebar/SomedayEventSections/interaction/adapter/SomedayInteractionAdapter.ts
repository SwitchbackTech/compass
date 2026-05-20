import { Priorities } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { type CalendarInteractionAdapter } from "@web/common/calendar-interaction/CalendarInteractionAdapter";
import {
  type CalendarInteractionCancellationTargets,
  type CalendarInteractionEngine,
  createCalendarInteractionEngine,
} from "@web/common/calendar-interaction/CalendarInteractionEngine";
import { type CalendarInteractionPoint } from "@web/common/calendar-interaction/CalendarInteractionSession";
import { isEligibleCalendarInteractionPointerDown } from "@web/common/calendar-interaction/calendarInteractionPointer";
import { createInteractionClone } from "@web/common/calendar-interaction/dom/clone/createInteractionClone";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";
import {
  gridColorByPriority,
  gridHoverColorByPriority,
} from "@web/common/styles/theme.util";
import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";
import {
  buildAllDayWeekLayoutCache,
  buildTimedWeekLayoutCache,
  getNearestDayColumn,
  type WeekDayColumnCache,
  type WeekLayoutCache,
  type WeekLayoutCacheSources,
} from "@web/views/Week/interaction/adapter/geometry/weekLayoutCache";
import {
  createWeekEdgeNavigationController,
  type WeekEdgeNavigationSide,
} from "@web/views/Week/interaction/adapter/weekEdgeNavigation";
import {
  resetWeekInteractionEdgeNavigationState,
  setWeekInteractionEdgeNavigationState,
} from "@web/views/Week/interaction/state/weekInteractionEdgeNavigationState";
import { setWeekInteractionMotionActive } from "@web/views/Week/interaction/state/weekInteractionMotionState";
import {
  EVENT_ALLDAY_HEIGHT,
  EVENT_PADDING_RIGHT,
  GRID_TIME_STEP,
  TIMED_EVENT_COLUMN_INSET,
} from "@web/views/Week/layout.constants";
import { somedayDropTargetRegistry } from "../registry/somedayDropTargetRegistry";
import {
  type SomedayInteractionCategory,
  somedayEventRegistry,
} from "../registry/somedayEventRegistry";
import {
  type SomedayAllDayDrop,
  type SomedayInteractionAdapter,
  type SomedayInteractionAdapterOptions,
  type SomedayInteractionCommitResult,
  type SomedayInteractionDrop,
  type SomedayInteractionRuntime,
  type SomedayInteractionTarget,
  type SomedayInteractionVisual,
  type SomedaySidebarCommitResult,
  type SomedaySidebarDrop,
  type SomedayTimedDrop,
} from "./SomedayInteractionAdapter.types";

const ONE_HOUR_MINUTES = 60;
// Matches the "settle" curve used by GridEvent for visual coherence with the
// landed event. The reshape duration (240ms) is short enough to track the
// cursor without feeling instant; the transform duration (110ms) is only
// applied while the overlay is anchored to a grid slot, so cursor-follow in
// the sidebar stays 1:1 with the pointer.
const SOMEDAY_OVERLAY_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const SOMEDAY_OVERLAY_RESHAPE_MS = 240;
const SOMEDAY_OVERLAY_ANCHOR_MS = 110;
const SOMEDAY_OVERLAY_LIFT_MS = 160;
// Subtle lift while the overlay is floating (in the sidebar / between
// targets). Settles back to 1 once anchored to a slot so the preview matches
// the resting size of the real event.
const SOMEDAY_OVERLAY_LIFT_SCALE = "1.04";
const SOMEDAY_OVERLAY_SETTLED_SCALE = "1";
const SOMEDAY_OVERLAY_TRANSITION_BASE =
  `height ${SOMEDAY_OVERLAY_RESHAPE_MS}ms ${SOMEDAY_OVERLAY_EASING}, ` +
  `width ${SOMEDAY_OVERLAY_RESHAPE_MS}ms ${SOMEDAY_OVERLAY_EASING}, ` +
  `color ${SOMEDAY_OVERLAY_RESHAPE_MS}ms ${SOMEDAY_OVERLAY_EASING}, ` +
  `scale ${SOMEDAY_OVERLAY_LIFT_MS}ms ${SOMEDAY_OVERLAY_EASING}, ` +
  `box-shadow ${SOMEDAY_OVERLAY_LIFT_MS}ms ${SOMEDAY_OVERLAY_EASING}`;
const SOMEDAY_OVERLAY_TRANSITION_ANCHORED =
  `${SOMEDAY_OVERLAY_TRANSITION_BASE}, ` +
  `transform ${SOMEDAY_OVERLAY_ANCHOR_MS}ms ${SOMEDAY_OVERLAY_EASING}`;
const SOMEDAY_OVERLAY_SHADOW_LIFTED = `0 12px 28px color-mix(in srgb, ${theme.color.shadow.default} 22%, transparent)`;
const SOMEDAY_OVERLAY_SHADOW_SETTLED = `0 6px 14px color-mix(in srgb, ${theme.color.shadow.default} 14%, transparent)`;

const inertRuntime: SomedayInteractionRuntime = {
  getSomedayEventById: () => null,
  onClickSomedayEvent: () => undefined,
  onCommitSomedayInteraction: () => undefined,
};

const activeEdgeNavigationIndicatorState = {
  currentEdge: null,
  isDragging: true,
  isTimerActive: false,
  progress: 0,
} as const;

export const createSomedayInteractionAdapter = ({
  engineOptions,
  getLayoutSources = () => ({}),
  getViewStart,
  runtime = () => inertRuntime,
}: SomedayInteractionAdapterOptions): SomedayInteractionAdapter => {
  const edgeNavigation = createWeekEdgeNavigationController();
  let isLayoutRebuildPending = false;
  let allDayLayout: WeekLayoutCache | null = null;
  let lastSidebarPreviewKey: string | null = null;
  let timedLayout: WeekLayoutCache | null = null;

  const engine: CalendarInteractionEngine<
    SomedayInteractionTarget,
    SomedayInteractionVisual,
    SomedayInteractionCommitResult
  > = createCalendarInteractionEngine({
    adapter: createEngineAdapter(),
    ...engineOptions,
  });

  function ownsPointer(event: Pick<PointerEvent, "pointerId">) {
    return engine.ownsPointer(event);
  }

  function connectCancellationEvents(
    targets?: CalendarInteractionCancellationTargets,
  ) {
    return engine.connectCancellationEvents(targets);
  }

  function rebuildLayoutAfterNavigation() {
    const session = engine.getSession();

    if (session.phase === "idle") {
      return;
    }

    rebuildLayouts();
    isLayoutRebuildPending = false;
  }

  function handlePointerDown(event: PointerEvent) {
    if (!isEligibleCalendarInteractionPointerDown(event)) {
      return {
        reason: "ineligible-someday-pointer",
        shouldOwn: false,
      };
    }

    const target = getInteractionTarget(event);

    if (!target) {
      return {
        reason: "no-someday-interaction-target",
        shouldOwn: false,
      };
    }

    if (!engine.handlePointerDown(event)) {
      return {
        reason: "calendar-interaction-engine-busy",
        shouldOwn: false,
      };
    }

    setWeekInteractionMotionActive(true);

    return {
      reason: "saved-someday-drag",
      shouldOwn: true,
    };
  }

  function handlePointerMove(event: PointerEvent) {
    const isOwnedPointer = ownsPointer(event);

    engine.handlePointerMove(event);

    return isOwnedPointer;
  }

  function handlePointerUp(event: PointerEvent) {
    const isOwnedPointer = ownsPointer(event);
    const result = engine.handlePointerUp(event);

    if (!result) {
      return isOwnedPointer;
    }

    const currentRuntime = runtime();

    if (result.type === "click") {
      currentRuntime.onClickSomedayEvent(
        result.target.event,
        result.target.category,
      );
      setWeekInteractionMotionActive(false);
      return isOwnedPointer;
    }

    currentRuntime.onCommitSomedayInteraction(result.result);

    return isOwnedPointer;
  }

  function handlePointerCancel(event: PointerEvent) {
    const isOwnedPointer = ownsPointer(event);

    engine.handlePointerCancel(event);

    return isOwnedPointer;
  }

  function cancel() {
    engine.cancel();
  }

  function createEngineAdapter(): CalendarInteractionAdapter<
    SomedayInteractionTarget,
    SomedayInteractionVisual,
    SomedayInteractionCommitResult
  > {
    return {
      cancel: () => {
        clearInteractionState();
        runtime().onCancelInteraction?.();
      },
      commit: ({ target, visual }) => {
        const result = commitSomedayInteraction(target, visual);

        clearInteractionState();

        return result;
      },
      createVisual: ({ pointerStart, sourceElement, target }) => {
        const sourceRect = readElementRect(sourceElement);

        rebuildLayouts();
        setWeekInteractionEdgeNavigationState(
          activeEdgeNavigationIndicatorState,
        );
        runtime().onMotionActivation?.(target);

        return {
          drop: null,
          eventId: target.event._id!,
          initialViewStart: getViewStart(),
          pointerStart,
          sourceIndex: target.registered.index,
          sourceRect,
          transform: { x: 0, y: 0 },
          weekOffsetDays: 0,
        };
      },
      getOverlayMount: ({ sourceElement, target }) => ({
        clone: createSomedayOverlayClone(sourceElement, target.event),
        cursor: "move",
        rect: readElementRect(sourceElement),
      }),
      getSourceElement: (target) => target.registered.element,
      getTarget: (event) => getInteractionTarget(event),
      updateVisual: ({ pointer, target, timestamp, visual }) => {
        if (isLayoutRebuildPending) {
          rebuildLayouts();
          isLayoutRebuildPending = false;
        }

        const edgeNavigationUpdate = updateEdgeNavigation(
          visual,
          pointer,
          timestamp,
        );
        const nextDrop = resolveDrop(pointer, edgeNavigationUpdate.visual);
        previewSidebarDrop(target, edgeNavigationUpdate.visual, nextDrop);
        const overlayRect = getCalendarOverlayRect(nextDrop);
        const nextVisual = {
          ...edgeNavigationUpdate.visual,
          drop: nextDrop,
          transform: overlayRect
            ? {
                x:
                  overlayRect.left -
                  edgeNavigationUpdate.visual.sourceRect.left,
                y: overlayRect.top - edgeNavigationUpdate.visual.sourceRect.top,
              }
            : {
                x: pointer.x - edgeNavigationUpdate.visual.pointerStart.x,
                y: pointer.y - edgeNavigationUpdate.visual.pointerStart.y,
              },
        };

        return {
          overlay: {
            height: overlayRect?.height,
            mutate: (node) => mutateOverlay(node, nextDrop, target.event),
            transform: nextVisual.transform,
            width: overlayRect?.width,
          },
          shouldContinue: edgeNavigationUpdate.isDwellActive,
          visual: nextVisual,
        };
      },
    };
  }

  function getInteractionTarget(
    event: PointerEvent,
  ): SomedayInteractionTarget | null {
    if (isInteractiveChild(event.target)) {
      return null;
    }

    const registered = somedayEventRegistry.resolveFromTarget(event.target);

    if (!registered) {
      return null;
    }

    const currentRuntime = runtime();
    const somedayEvent = currentRuntime.getSomedayEventById(registered.eventId);

    if (
      !somedayEvent?._id ||
      currentRuntime.isEventPending?.(somedayEvent._id)
    ) {
      return null;
    }

    return {
      category: registered.category,
      event: somedayEvent,
      registered,
    };
  }

  function resolveDrop(
    pointer: CalendarInteractionPoint,
    visual: SomedayInteractionVisual,
  ): SomedayInteractionDrop | null {
    const allDayDrop = resolveAllDayDrop(pointer);

    if (allDayDrop) {
      return allDayDrop;
    }

    const timedDrop = resolveTimedDrop(pointer);

    if (timedDrop) {
      return timedDrop;
    }

    return resolveSidebarDrop(pointer, visual);
  }

  function resolveAllDayDrop(
    pointer: CalendarInteractionPoint,
  ): SomedayAllDayDrop | null {
    const layout = allDayLayout;

    if (!layout || !isPointInLayout(pointer, layout)) {
      return null;
    }

    const column = getNearestDayColumn(layout.dayColumns, pointer.x);

    if (!column || !isPointInsideColumns(pointer, layout.dayColumns)) {
      return null;
    }

    return {
      dayIndex: column.index,
      type: "allDay",
    };
  }

  function resolveTimedDrop(
    pointer: CalendarInteractionPoint,
  ): SomedayTimedDrop | null {
    const layout = timedLayout;

    if (
      !layout ||
      !isPointInLayout(pointer, layout) ||
      !isPointInsideColumns(pointer, layout.dayColumns)
    ) {
      return null;
    }

    const column = getNearestDayColumn(layout.dayColumns, pointer.x);

    if (!column) {
      return null;
    }

    const gridY =
      pointer.y -
      layout.edgeNavigation.top +
      (layout.smartScroll?.initialScrollTop ?? 0);
    const startMinutes = Math.max(
      0,
      Math.floor(gridY / layout.pixelsPerMinute / GRID_TIME_STEP) *
        GRID_TIME_STEP,
    );

    return {
      dayIndex: column.index,
      endMinutes: startMinutes + ONE_HOUR_MINUTES,
      startMinutes,
      type: "timed",
    };
  }

  function resolveSidebarDrop(
    pointer: CalendarInteractionPoint,
    visual: SomedayInteractionVisual,
  ): SomedaySidebarDrop | null {
    for (const target of somedayDropTargetRegistry.getTargets()) {
      const rect = target.element.getBoundingClientRect();

      if (!isPointInRect(pointer, rect)) {
        continue;
      }

      const events = somedayEventRegistry
        .getEvents(target.category)
        .filter((event) => event.eventId !== visual.eventId);
      const insertionIndex = events.findIndex((event) => {
        const eventRect = event.element.getBoundingClientRect();

        return pointer.y < eventRect.top + eventRect.height / 2;
      });

      return {
        category: target.category,
        index: insertionIndex === -1 ? events.length : insertionIndex,
        type: "sidebar",
      };
    }

    return null;
  }

  function commitSomedayInteraction(
    target: SomedayInteractionTarget,
    visual: SomedayInteractionVisual,
  ): SomedayInteractionCommitResult {
    const drop = visual.drop;

    if (!drop || !target.event._id) {
      return { type: "noop" };
    }

    if (drop.type === "sidebar") {
      return createSidebarCommitResult(target, visual, drop);
    }

    if (drop.type === "allDay") {
      const start = visual.initialViewStart
        .add(visual.weekOffsetDays + drop.dayIndex, "day")
        .startOf("day");

      return {
        dates: {
          endDate: start.add(1, "day").format(YEAR_MONTH_DAY_FORMAT),
          startDate: start.format(YEAR_MONTH_DAY_FORMAT),
        },
        eventId: target.event._id!,
        isAllDay: true,
        type: "schedule",
      };
    }

    const start = visual.initialViewStart
      .add(visual.weekOffsetDays + drop.dayIndex, "day")
      .startOf("day")
      .add(drop.startMinutes, "minutes");

    return {
      dates: {
        endDate: start.add(ONE_HOUR_MINUTES, "minutes").format(),
        startDate: start.format(),
      },
      eventId: target.event._id!,
      isAllDay: false,
      type: "schedule",
    };
  }

  function createSidebarCommitResult(
    target: SomedayInteractionTarget,
    visual: SomedayInteractionVisual,
    drop: SomedaySidebarDrop,
  ): SomedaySidebarCommitResult {
    return {
      destination: {
        droppableId: getColumnName(drop.category),
        index: drop.index,
      },
      eventId: target.event._id!,
      source: {
        droppableId: getColumnName(target.category),
        index: visual.sourceIndex,
      },
      type: "sidebarDrop",
    };
  }

  function previewSidebarDrop(
    target: SomedayInteractionTarget,
    visual: SomedayInteractionVisual,
    drop: SomedayInteractionDrop | null,
  ) {
    const currentRuntime = runtime();

    if (drop?.type !== "sidebar" || !target.event._id) {
      clearSidebarPreview(currentRuntime);
      return;
    }

    const preview = createSidebarCommitResult(target, visual, drop);
    const isAllowed = currentRuntime.isSidebarDropAllowed?.(preview) ?? true;
    const previewKey = `${isAllowed ? "valid" : "blocked"}:${getSidebarPreviewKey(preview)}`;

    if (previewKey === lastSidebarPreviewKey) {
      return;
    }

    lastSidebarPreviewKey = previewKey;
    currentRuntime.onPreviewSomedaySidebarDrop?.(preview);
  }

  function clearSidebarPreview(currentRuntime = runtime()) {
    if (lastSidebarPreviewKey === null) {
      return;
    }

    lastSidebarPreviewKey = null;
    currentRuntime.onPreviewSomedaySidebarDrop?.(null);
  }

  function updateEdgeNavigation(
    visual: SomedayInteractionVisual,
    pointer: CalendarInteractionPoint,
    timestamp: number,
  ): { isDwellActive: boolean; visual: SomedayInteractionVisual } {
    const layout = resolveCalendarNavigationLayout(pointer);

    if (!layout) {
      edgeNavigation.reset();
      setWeekInteractionEdgeNavigationState(activeEdgeNavigationIndicatorState);
      return { isDwellActive: false, visual };
    }

    const update = edgeNavigation.update({
      bounds: layout.edgeNavigation,
      pointer,
      timestamp,
    });

    setWeekInteractionEdgeNavigationState(update.state);

    if (update.requestedSide) {
      isLayoutRebuildPending = true;
      runtime().onRequestWeekNavigation?.(update.requestedSide);

      return {
        isDwellActive: false,
        visual: {
          ...visual,
          weekOffsetDays:
            visual.weekOffsetDays +
            getWeekOffsetDaysDelta(update.requestedSide),
        },
      };
    }

    return {
      isDwellActive: update.isDwellActive,
      visual,
    };
  }

  function resolveCalendarNavigationLayout(pointer: CalendarInteractionPoint) {
    if (timedLayout && isPointInLayout(pointer, timedLayout)) {
      return timedLayout;
    }

    if (allDayLayout && isPointInLayout(pointer, allDayLayout)) {
      return allDayLayout;
    }

    return null;
  }

  function rebuildLayouts(
    sources: WeekLayoutCacheSources = getLayoutSources(),
  ) {
    allDayLayout = buildAllDayWeekLayoutCache(sources);
    timedLayout = buildTimedWeekLayoutCache(sources);
  }

  function clearInteractionState() {
    allDayLayout = null;
    timedLayout = null;
    lastSidebarPreviewKey = null;
    edgeNavigation.reset();
    resetWeekInteractionEdgeNavigationState();
    setWeekInteractionMotionActive(false);
    isLayoutRebuildPending = false;
  }

  function getCalendarOverlayRect(drop: SomedayInteractionDrop | null) {
    if (!drop || drop.type === "sidebar") {
      return null;
    }

    const layout = drop.type === "allDay" ? allDayLayout : timedLayout;
    const column = layout?.dayColumns.find(
      (day) => day.index === drop.dayIndex,
    );

    if (!layout || !column) {
      return null;
    }

    if (drop.type === "allDay") {
      return {
        height: EVENT_ALLDAY_HEIGHT,
        left: column.left,
        top: layout.edgeNavigation.top,
        width: Math.max(0, column.width - EVENT_PADDING_RIGHT),
      };
    }

    const scrollTop = layout.smartScroll?.initialScrollTop ?? 0;

    return {
      height: Math.max(
        24,
        (drop.endMinutes - drop.startMinutes) * layout.pixelsPerMinute,
      ),
      left: column.left + TIMED_EVENT_COLUMN_INSET,
      top:
        layout.edgeNavigation.top +
        drop.startMinutes * layout.pixelsPerMinute -
        scrollTop,
      width: Math.max(0, column.width - TIMED_EVENT_COLUMN_INSET * 2),
    };
  }

  return {
    cancel,
    connectCancellationEvents,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    ownsPointer,
    rebuildLayoutAfterNavigation,
  };
};

const createSomedayOverlayClone = (
  source: HTMLElement,
  event: Schema_Event,
) => {
  const clone = createInteractionClone(source);

  clone.style.zIndex = "25";

  // SomedayEvent renders with a translucent priority tint (15% color-mix),
  // which looks faded once it leaves the sidebar background. Repaint the
  // floating overlay with the solid grid color so the preview reads as the
  // GridEvent / AllDayEvent it's about to become.
  const priority = event.priority ?? Priorities.UNASSIGNED;
  clone.style.background = gridColorByPriority[priority];

  // Strip sidebar-only affordances so the preview matches the landed event.
  for (const node of clone.querySelectorAll<HTMLElement>(
    "[data-someday-drag-affordance]",
  )) {
    node.remove();
  }

  return clone;
};

const mutateOverlay = (
  node: HTMLElement,
  drop: SomedayInteractionDrop | null,
  event: Schema_Event,
) => {
  node.style.overflow = "hidden";

  const isReducedMotion = isReducedMotionPreferred();
  // Only smooth `transform` while the overlay is anchored to a grid slot.
  // In the sidebar (or with no drop target) transform must remain instant so
  // the clone tracks the pointer 1:1.
  const isGridAnchored = drop?.type === "allDay" || drop?.type === "timed";
  const priority = event.priority ?? Priorities.UNASSIGNED;
  const nextBackground = isGridAnchored
    ? gridHoverColorByPriority[priority]
    : gridColorByPriority[priority];

  if (node.style.backgroundColor !== nextBackground) {
    node.style.backgroundColor = nextBackground;
  }

  const nextTransition = isReducedMotion
    ? "none"
    : isGridAnchored
      ? SOMEDAY_OVERLAY_TRANSITION_ANCHORED
      : SOMEDAY_OVERLAY_TRANSITION_BASE;

  if (node.style.transition !== nextTransition) {
    node.style.transition = nextTransition;
  }

  // Lift the overlay while it's floating so pickup reads as a physical "I've
  // grabbed this." Settle to 1 once anchored to a slot so the preview matches
  // the real event's resting size; shadow tightens in tandem.
  const nextScale =
    isReducedMotion || isGridAnchored
      ? SOMEDAY_OVERLAY_SETTLED_SCALE
      : SOMEDAY_OVERLAY_LIFT_SCALE;

  if (node.style.scale !== nextScale) {
    node.style.scale = nextScale;
  }

  const nextShadow =
    isReducedMotion || isGridAnchored
      ? SOMEDAY_OVERLAY_SHADOW_SETTLED
      : SOMEDAY_OVERLAY_SHADOW_LIFTED;

  if (node.style.boxShadow !== nextShadow) {
    node.style.boxShadow = nextShadow;
  }

  node.style.color = isGridAnchored
    ? theme.color.text.dark
    : theme.color.text.lighter;

  const timeLabel = getOrCreateOverlayTimeLabel(node);

  if (drop?.type !== "timed") {
    timeLabel.remove();
    return;
  }

  const start = dayjs().startOf("day").add(drop.startMinutes, "minutes");
  const end = start.add(ONE_HOUR_MINUTES, "minutes");

  timeLabel.textContent = getTimesLabel(start.format(), end.format());
  timeLabel.style.display = event.title ? "inline" : "block";
};

const isReducedMotionPreferred = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getOrCreateOverlayTimeLabel = (node: HTMLElement) => {
  const existing = node.querySelector<HTMLElement>(
    "[data-someday-interaction-time-label]",
  );

  if (existing) {
    return existing;
  }

  const label = document.createElement("span");

  label.setAttribute("data-someday-interaction-time-label", "true");
  label.style.fontSize = "11px";
  label.style.marginLeft = "4px";
  label.style.opacity = "0.78";
  node.append(label);

  return label;
};

const readElementRect = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
};

const isPointInLayout = (
  point: CalendarInteractionPoint,
  layout: WeekLayoutCache,
) =>
  point.x >= layout.edgeNavigation.left &&
  point.x <= layout.edgeNavigation.right &&
  point.y >= layout.edgeNavigation.top &&
  point.y <= layout.edgeNavigation.bottom;

const isPointInsideColumns = (
  point: CalendarInteractionPoint,
  columns: WeekDayColumnCache[],
) => {
  const first = columns[0];
  const last = columns[columns.length - 1];

  if (!first || !last) {
    return false;
  }

  return point.x >= first.left && point.x <= last.left + last.width;
};

const isPointInRect = (
  point: CalendarInteractionPoint,
  rect: Pick<DOMRect, "bottom" | "left" | "right" | "top">,
) =>
  point.x >= rect.left &&
  point.x <= rect.right &&
  point.y >= rect.top &&
  point.y <= rect.bottom;

const getColumnName = (category: SomedayInteractionCategory) =>
  category === Categories_Event.SOMEDAY_WEEK ? COLUMN_WEEK : COLUMN_MONTH;

const getSidebarPreviewKey = ({
  destination,
  eventId,
  source,
}: SomedaySidebarCommitResult) =>
  `${eventId}:${source.droppableId}:${source.index}->${destination.droppableId}:${destination.index}`;

const getWeekOffsetDaysDelta = (side: WeekEdgeNavigationSide) =>
  side === "next" ? 7 : -7;

const isInteractiveChild = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(
    target.closest(
      "button, input, textarea, select, option, a[href], [contenteditable='true']",
    ),
  );
