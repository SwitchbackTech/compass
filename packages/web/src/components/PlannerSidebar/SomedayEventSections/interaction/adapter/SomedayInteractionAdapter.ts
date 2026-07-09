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
import { createDraftEventClone } from "@web/common/calendar-interaction/dom/clone/createDraftEventClone";
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
} from "@web/views/Week/interaction/adapter/geometry/weekLayoutCache";
import { createWeekEdgeNavigationController } from "@web/views/Week/interaction/adapter/weekEdgeNavigation";
import {
  resetWeekInteractionEdgeNavigationState,
  setWeekInteractionEdgeNavigationState,
} from "@web/views/Week/interaction/state/weekInteractionEdgeNavigationState";
import { setWeekInteractionMotionActive } from "@web/views/Week/interaction/state/weekInteractionMotionState";
import {
  EVENT_ALLDAY_HEIGHT,
  EVENT_PADDING_RIGHT,
  GRID_EVENT_TIME_LABEL_FONT_SIZE,
  GRID_EVENT_TIME_LABEL_OPACITY,
  GRID_TIME_STEP,
  TIMED_EVENT_COLUMN_INSET,
} from "@web/views/Week/layout.constants";
import { somedayDropTargetRegistry } from "../registry/somedayDropTargetRegistry";
import {
  type SomedayInteractionCategory,
  somedayEventRegistry,
} from "../registry/somedayEventRegistry";
import {
  type ClampZoneRect,
  clampPointToZones,
} from "./geometry/clampPointToZones";
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
// applied while the draft event is anchored to a grid slot, so cursor-follow in
// the sidebar stays 1:1 with the pointer.
const SOMEDAY_DRAFT_EVENT_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const SOMEDAY_DRAFT_EVENT_RESHAPE_MS = 240;
const SOMEDAY_DRAFT_EVENT_ANCHOR_MS = 110;
const SOMEDAY_DRAFT_EVENT_LIFT_MS = 160;
// Subtle lift while the draft event is floating (in the sidebar / between
// targets). Settles back to 1 once anchored to a slot so the preview matches
// the resting size of the real event.
const SOMEDAY_DRAFT_EVENT_LIFT_SCALE = "1.04";
const SOMEDAY_DRAFT_EVENT_SETTLED_SCALE = "1";
const SOMEDAY_DRAFT_EVENT_TRANSITION_BASE =
  `height ${SOMEDAY_DRAFT_EVENT_RESHAPE_MS}ms ${SOMEDAY_DRAFT_EVENT_EASING}, ` +
  `width ${SOMEDAY_DRAFT_EVENT_RESHAPE_MS}ms ${SOMEDAY_DRAFT_EVENT_EASING}, ` +
  `color ${SOMEDAY_DRAFT_EVENT_RESHAPE_MS}ms ${SOMEDAY_DRAFT_EVENT_EASING}, ` +
  `scale ${SOMEDAY_DRAFT_EVENT_LIFT_MS}ms ${SOMEDAY_DRAFT_EVENT_EASING}, ` +
  `box-shadow ${SOMEDAY_DRAFT_EVENT_LIFT_MS}ms ${SOMEDAY_DRAFT_EVENT_EASING}`;
const SOMEDAY_DRAFT_EVENT_TRANSITION_ANCHORED =
  `${SOMEDAY_DRAFT_EVENT_TRANSITION_BASE}, ` +
  `transform ${SOMEDAY_DRAFT_EVENT_ANCHOR_MS}ms ${SOMEDAY_DRAFT_EVENT_EASING}`;
const SOMEDAY_DRAFT_EVENT_SHADOW_LIFTED = `0 12px 28px color-mix(in srgb, ${theme.color.shadow.default} 22%, transparent)`;
const SOMEDAY_DRAFT_EVENT_SHADOW_SETTLED = `0 6px 14px color-mix(in srgb, ${theme.color.shadow.default} 14%, transparent)`;
const SOMEDAY_EVENT_TITLE_ROW_SELECTOR =
  '[data-someday-event-title-row="true"]';
const SOMEDAY_TIME_LABEL_SELECTOR =
  '[data-someday-interaction-time-label="true"]';

const inertRuntime: SomedayInteractionRuntime = {
  getSomedayEventById: () => null,
  getVisibleDays: () => [],
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
          pointerStart,
          sourceIndex: target.registered.index,
          sourceRect,
          transform: { x: 0, y: 0 },
        };
      },
      getDraftEventMount: ({ sourceElement, target }) => ({
        clone: createSomedayDraftEventClone(sourceElement, target.event),
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
        // Edge navigation reads the raw pointer (it only engages inside grid
        // layouts). Drop resolution and the floating preview use the clamped
        // pointer so the draft event can't wander into dead zones like the week
        // header — it slides along the nearest valid drop zone instead.
        const clampedPointer = clampPointToZones(pointer, getClampZones());
        const nextDrop = resolveDrop(
          clampedPointer,
          edgeNavigationUpdate.visual,
        );
        previewSidebarDrop(target, edgeNavigationUpdate.visual, nextDrop);
        const draftEventRect = getCalendarDraftEventRect(nextDrop);
        const nextVisual = {
          ...edgeNavigationUpdate.visual,
          drop: nextDrop,
          transform: draftEventRect
            ? {
                x:
                  draftEventRect.left -
                  edgeNavigationUpdate.visual.sourceRect.left,
                y:
                  draftEventRect.top -
                  edgeNavigationUpdate.visual.sourceRect.top,
              }
            : {
                x:
                  clampedPointer.x - edgeNavigationUpdate.visual.pointerStart.x,
                y:
                  clampedPointer.y - edgeNavigationUpdate.visual.pointerStart.y,
              },
        };

        return {
          draftEvent: {
            height: draftEventRect?.height,
            mutate: (node) => mutateDraftEvent(node, nextDrop, target.event),
            transform: nextVisual.transform,
            width: draftEventRect?.width,
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

    if (!somedayEvent?._id) {
      return null;
    }

    return {
      category: registered.category,
      event: somedayEvent,
      registered,
    };
  }

  function getClampZones(): ClampZoneRect[] {
    const zones: ClampZoneRect[] = [];

    for (const target of somedayDropTargetRegistry.getTargets()) {
      const rect = target.element.getBoundingClientRect();

      zones.push({
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        top: rect.top,
      });
    }

    const allDayZone = getLayoutClampZone(allDayLayout);

    if (allDayZone) {
      zones.push(allDayZone);
    }

    const timedZone = getLayoutClampZone(timedLayout);

    if (timedZone) {
      zones.push(timedZone);
    }

    return zones;
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
      date: column.date,
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
      pointer.y - layout.edgeNavigation.top + getLayoutScrollTop(layout);
    const startMinutes = Math.max(
      0,
      Math.floor(gridY / layout.pixelsPerMinute / GRID_TIME_STEP) *
        GRID_TIME_STEP,
    );

    return {
      date: column.date,
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
      // The drop column carries its own date, so no view-start arithmetic
      const start = dayjs(drop.date).startOf("day");

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

    const start = dayjs(drop.date)
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
      // No day bookkeeping: the pending layout rebuild carries the new column
      // dates, and the next drop resolution reads them directly.
      isLayoutRebuildPending = true;
      runtime().onRequestWeekNavigation?.(update.requestedSide);

      return {
        isDwellActive: false,
        visual,
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

  function rebuildLayouts() {
    const input = {
      ...getLayoutSources(),
      visibleDays: runtime().getVisibleDays(),
    };
    allDayLayout = buildAllDayWeekLayoutCache(input);
    timedLayout = buildTimedWeekLayoutCache(input);
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

  function getCalendarDraftEventRect(drop: SomedayInteractionDrop | null) {
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

    const scrollTop = getLayoutScrollTop(layout);

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

const createSomedayDraftEventClone = (
  source: HTMLElement,
  event: Schema_Event,
) => {
  const clone = createDraftEventClone(source);

  clone.style.zIndex = "25";

  // SomedayEvent renders with a translucent priority tint (15% color-mix),
  // which looks faded once it leaves the sidebar background. Repaint the
  // floating draft event with the solid grid color so the preview reads as the
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

const mutateDraftEvent = (
  node: HTMLElement,
  drop: SomedayInteractionDrop | null,
  event: Schema_Event,
) => {
  node.style.overflow = "hidden";

  const isReducedMotion = isReducedMotionPreferred();
  // Only smooth `transform` while the draft event is anchored to a grid slot.
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
      ? SOMEDAY_DRAFT_EVENT_TRANSITION_ANCHORED
      : SOMEDAY_DRAFT_EVENT_TRANSITION_BASE;

  if (node.style.transition !== nextTransition) {
    node.style.transition = nextTransition;
  }

  // Lift the draft event while it's floating so pickup reads as a physical "I've
  // grabbed this." Settle to 1 once anchored to a slot so the preview matches
  // the real event's resting size; shadow tightens in tandem.
  const nextScale =
    isReducedMotion || isGridAnchored
      ? SOMEDAY_DRAFT_EVENT_SETTLED_SCALE
      : SOMEDAY_DRAFT_EVENT_LIFT_SCALE;

  if (node.style.scale !== nextScale) {
    node.style.scale = nextScale;
  }

  const nextShadow =
    isReducedMotion || isGridAnchored
      ? SOMEDAY_DRAFT_EVENT_SHADOW_SETTLED
      : SOMEDAY_DRAFT_EVENT_SHADOW_LIFTED;

  if (node.style.boxShadow !== nextShadow) {
    node.style.boxShadow = nextShadow;
  }

  node.style.color = isGridAnchored
    ? theme.color.text.dark
    : theme.color.text.lighter;

  if (drop?.type !== "timed") {
    resetTimedDraftEventLayout(node);
    return;
  }

  const titleRow = applyTimedDraftEventLayout(node);
  const { end, start } = getTimedDropDateRange(drop);

  const timeLabel = getOrCreateDraftEventTimeLabel(node, titleRow);

  timeLabel.textContent = getTimesLabel(start.format(), end.format());
  timeLabel.style.display = "block";
};

const isReducedMotionPreferred = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getTimedDropDateRange = (drop: SomedayTimedDrop) => {
  const start = dayjs(drop.date)
    .startOf("day")
    .add(drop.startMinutes, "minutes");

  return {
    end: start.add(ONE_HOUR_MINUTES, "minutes"),
    start,
  };
};

const applyTimedDraftEventLayout = (node: HTMLElement) => {
  const titleRow = getDraftEventTitleRow(node);
  const textStack = getDraftEventTextStack(titleRow);

  textStack.style.alignItems = "flex-start";
  textStack.style.display = "flex";
  textStack.style.flexDirection = "column";
  textStack.style.justifyContent = "flex-start";

  titleRow.style.alignSelf = "stretch";
  titleRow.style.alignItems = "flex-start";
  titleRow.style.flex = "0 1 auto";
  titleRow.style.flexDirection = "row";
  titleRow.style.gap = "0";
  titleRow.style.justifyContent = "flex-start";

  return textStack;
};

const resetTimedDraftEventLayout = (node: HTMLElement) => {
  removeDraftEventTimeLabel(node);

  const titleRow = node.querySelector<HTMLElement>(
    SOMEDAY_EVENT_TITLE_ROW_SELECTOR,
  );

  if (!titleRow) {
    return;
  }

  const textStack = getDraftEventTextStack(titleRow);

  textStack.style.alignItems = "";
  textStack.style.display = "";
  textStack.style.flexDirection = "";
  textStack.style.justifyContent = "";

  titleRow.style.alignSelf = "";
  titleRow.style.alignItems = "";
  titleRow.style.flex = "";
  titleRow.style.flexDirection = "";
  titleRow.style.gap = "";
  titleRow.style.justifyContent = "";
};

const removeDraftEventTimeLabel = (node: HTMLElement) => {
  node.querySelector<HTMLElement>(SOMEDAY_TIME_LABEL_SELECTOR)?.remove();
};

const getDraftEventTitleRow = (node: HTMLElement) =>
  node.querySelector<HTMLElement>(SOMEDAY_EVENT_TITLE_ROW_SELECTOR) ?? node;

const getDraftEventTextStack = (titleRow: HTMLElement) =>
  titleRow.parentElement ?? titleRow;

const getOrCreateDraftEventTimeLabel = (
  node: HTMLElement,
  parent: HTMLElement,
) => {
  const existing = node.querySelector<HTMLElement>(SOMEDAY_TIME_LABEL_SELECTOR);

  if (existing) {
    if (existing.parentElement !== parent) {
      parent.append(existing);
    }

    return existing;
  }

  const label = document.createElement("span");

  label.setAttribute("data-someday-interaction-time-label", "true");
  label.style.fontSize = GRID_EVENT_TIME_LABEL_FONT_SIZE;
  label.style.marginLeft = "0";
  label.style.opacity = GRID_EVENT_TIME_LABEL_OPACITY;
  label.style.alignSelf = "flex-start";
  label.style.flexShrink = "0";
  label.style.whiteSpace = "nowrap";
  parent.append(label);

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

// Intersects the layout's vertical bounds with its day-column span so a
// point clamped into the zone always satisfies both isPointInLayout and
// isPointInsideColumns during drop resolution.
const getLayoutClampZone = (
  layout: WeekLayoutCache | null,
): ClampZoneRect | null => {
  if (!layout) {
    return null;
  }

  const first = layout.dayColumns[0];
  const last = layout.dayColumns[layout.dayColumns.length - 1];

  if (!first || !last) {
    return null;
  }

  const left = Math.max(layout.edgeNavigation.left, first.left);
  const right = Math.min(layout.edgeNavigation.right, last.left + last.width);

  if (right < left) {
    return null;
  }

  return {
    bottom: layout.edgeNavigation.bottom,
    left,
    right,
    top: layout.edgeNavigation.top,
  };
};

const getLayoutScrollTop = (layout: WeekLayoutCache) =>
  layout.smartScroll?.element.scrollTop ?? 0;

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

const isInteractiveChild = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(
    target.closest(
      "button, input, textarea, select, option, a[href], [contenteditable='true']",
    ),
  );
