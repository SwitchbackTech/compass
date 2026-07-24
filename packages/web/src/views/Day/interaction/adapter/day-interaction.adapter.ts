import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import {
  applySmartScroll as applySmartScrollFrame,
  getSavedEventInteractionCursor,
  getSavedEventOwnershipReason,
  readElementRect,
} from "@web/grid/interaction/adapter.helpers";
import { getLocalMinutes } from "@web/grid/interaction/date";
import {
  createDraftEventMount,
  getResizeHandleEdge,
  updateDraftEventTimeLabel,
} from "@web/grid/interaction/dom";
import { type GridLayoutCache } from "@web/grid/interaction/layout.cache";
import {
  createAllDayDragVisual,
  updateAllDayDragVisual,
} from "@web/grid/interaction/math/all-day.drag";
import {
  createAllDayResizeVisual,
  updateAllDayResizeVisual,
} from "@web/grid/interaction/math/all-day.resize";
import {
  createTimedDragVisual,
  updateTimedDragVisual,
} from "@web/grid/interaction/math/timed.drag";
import {
  createTimedResizeVisual,
  updateTimedResizeVisual,
} from "@web/grid/interaction/math/timed.resize";
import { type VisualPoint } from "@web/grid/interaction/types/timed-drag.types";
import { type InteractionAdapter } from "@web/interaction/interaction.adapter.types";
import {
  createInteractionEngine,
  type InteractionCancellationTargets,
  type InteractionEngine,
} from "@web/interaction/interaction.engine";
import { isEligibleInteractionPointerDown } from "@web/interaction/interaction.pointer";
import {
  type DayInteractionEventType,
  dayEventRegistry,
} from "../registry/day-event.registry";
import {
  commitAllDayDragInteraction,
  commitAllDayResizeInteraction,
} from "./commit/all-day.commit";
import {
  commitTimedDragInteraction,
  commitTimedResizeInteraction,
  timedDragVisualToDayGridEvent,
  timedResizeVisualToDayGridEvent,
} from "./commit/timed.commit";
import {
  type DayAllDayDragTarget,
  type DayAllDayResizeTarget,
  type DayInteractionAdapter,
  type DayInteractionAdapterOptions,
  type DayInteractionCommitResult,
  type DayInteractionPointerOwnership,
  type DayInteractionRuntime,
  type DayInteractionTarget,
  type DayInteractionVisual,
  type DayResolvedEventTarget,
  type DayTimedDragTarget,
  type DayTimedResizeTarget,
} from "./day-interaction.adapter.types";
import {
  buildDayLayoutCacheForTarget,
  isDayDragTarget,
} from "./geometry/day-layout.cache";

export type {
  DayAllDayDragCommitResult,
  DayAllDayResizeCommitResult,
  DayInteractionAdapter,
  DayInteractionRuntime,
  DayTimedDragCommitResult,
  DayTimedResizeCommitResult,
} from "./day-interaction.adapter.types";

const inertRuntime: DayInteractionRuntime = {
  getTimedEventById: () => null,
  onClickTimedEvent: () => undefined,
  onCommitTimedDrag: () => undefined,
};

export const createDayInteractionAdapter = ({
  engineOptions,
  getColumnKeys = () => [],
  getLayoutSources = () => ({}),
  getVisibleDate = () => dayjs(),
  runtime = () => inertRuntime,
}: DayInteractionAdapterOptions = {}): DayInteractionAdapter => {
  let layout: GridLayoutCache | null = null;
  let scrollTop: number | null = null;

  const engine: InteractionEngine<
    DayInteractionTarget,
    DayInteractionVisual,
    DayInteractionCommitResult
  > = createInteractionEngine({
    adapter: createEngineAdapter(),
    ...engineOptions,
  });

  function ownsPointer(event: Pick<PointerEvent, "pointerId">) {
    return engine.ownsPointer(event);
  }

  function connectCancellationEvents(targets?: InteractionCancellationTargets) {
    return engine.connectCancellationEvents(targets);
  }

  function handlePointerDown(
    event: PointerEvent,
  ): DayInteractionPointerOwnership {
    if (!isEligibleInteractionPointerDown(event)) {
      return {
        reason: "ineligible-day-pointer",
        shouldOwn: false,
      };
    }

    const target = getInteractionTarget(event);

    if (!target) {
      return {
        reason: "no-day-interaction-target",
        shouldOwn: false,
      };
    }

    if (!engine.handlePointerDown(event)) {
      return {
        reason: "calendar-interaction-engine-busy",
        shouldOwn: false,
      };
    }

    return {
      reason: getSavedEventOwnershipReason(target.type),
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
      if (isAllDayTarget(result.target)) {
        currentRuntime.onClickAllDayEvent?.(result.target.event);
      } else {
        currentRuntime.onClickTimedEvent(result.target.event);
      }

      return isOwnedPointer;
    }

    if (result.result.type === "allDayDragEnd") {
      currentRuntime.onCommitAllDayDrag?.(result.result);
      return isOwnedPointer;
    }

    if (result.result.type === "allDayResizeEnd") {
      currentRuntime.onCommitAllDayResize?.(result.result);
      return isOwnedPointer;
    }

    if (result.result.type === "timedDragEnd") {
      currentRuntime.onCommitTimedDrag(result.result);
      return isOwnedPointer;
    }

    currentRuntime.onCommitTimedResize?.(result.result);

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

  function createEngineAdapter(): InteractionAdapter<
    DayInteractionTarget,
    DayInteractionVisual,
    DayInteractionCommitResult
  > {
    return {
      cancel: () => {
        layout = null;
        scrollTop = null;
      },
      commit: ({ target, visual }) => {
        let result: DayInteractionCommitResult;
        const visibleDate = getVisibleDate();

        if (visual.type === "allDayDrag" && target.type === "allDayDrag") {
          result = commitAllDayDragInteraction(target, visual);
        } else if (
          visual.type === "allDayResize" &&
          target.type === "allDayResize"
        ) {
          result = commitAllDayResizeInteraction(target, visual, visibleDate);
        } else if (
          visual.type === "timedResize" &&
          target.type === "timedResize"
        ) {
          result = commitTimedResizeInteraction(target, visual, visibleDate);
        } else if (visual.type === "timedDrag" && target.type === "timedDrag") {
          result = commitTimedDragInteraction(target, visual, visibleDate);
        } else {
          throw new Error("Mismatched Day interaction target");
        }

        layout = null;
        scrollTop = null;

        return result;
      },
      createVisual: ({ pointerStart, sourceElement, target }) => {
        const visibleDateKey = getVisibleDate().format(YEAR_MONTH_DAY_FORMAT);
        // The Day view renders one column per calendar, all sharing one date,
        // so drag column keys are CALENDAR IDS (not dates like the Week
        // view) — a column change is a cross-calendar move. Resizes stay
        // within the event's own column and keep the single-column layout.
        // An event whose calendar isn't among the rendered columns (columns
        // and events momentarily out of sync) also falls back to the single
        // column: anchoring it to column 0 would make a purely vertical drag
        // commit a calendar move the user never made.
        const calendarColumnKeys = isDayDragTarget(target)
          ? getColumnKeys()
          : [];
        const eventColumnIndex = calendarColumnKeys.indexOf(
          target.event.calendarId ?? "",
        );
        const columnKeys =
          eventColumnIndex >= 0 ? calendarColumnKeys : [visibleDateKey];
        const initialColumnIndex = Math.max(0, eventColumnIndex);
        const initialColumnKey = columnKeys[initialColumnIndex]!;
        const nextLayout = buildDayLayoutCacheForTarget(
          target,
          getLayoutSources(),
          columnKeys,
        );

        if (!nextLayout) {
          return null;
        }

        const sourceRect = readElementRect(sourceElement);

        layout = nextLayout;
        scrollTop = nextLayout.smartScroll?.initialScrollTop ?? null;
        runtime().onMotionActivation?.(target);

        if (target.type === "allDayDrag") {
          return createAllDayDragVisual({
            dayDate: initialColumnKey,
            dayIndex: initialColumnIndex,
            eventId: target.event._id!,
            pointerStart,
            sourceRect,
          });
        }

        if (target.type === "allDayResize") {
          return createAllDayResizeVisual({
            edge: target.edge,
            endDayIndex: 0,
            eventId: target.event._id!,
            pointerStart,
            sourceRect,
            startDayIndex: 0,
          });
        }

        if (target.type === "timedResize") {
          return createTimedResizeVisual({
            edge: target.edge,
            endMinutes: getLocalMinutes(target.event.endDate),
            eventId: target.event._id!,
            pointerStart,
            sourceRect,
            startMinutes: getLocalMinutes(target.event.startDate),
          });
        }

        return createTimedDragVisual({
          dayDate: initialColumnKey,
          dayIndex: initialColumnIndex,
          endMinutes: getLocalMinutes(target.event.endDate),
          eventId: target.event._id!,
          pointerStart,
          sourceRect,
          startMinutes: getLocalMinutes(target.event.startDate),
        });
      },
      getDraftEventMount: ({ sourceElement, target }) =>
        createDraftEventMount({
          cursor: getSavedEventInteractionCursor(target.type),
          source: sourceElement,
        }),
      getSourceElement: (target) => target.registered.element,
      getSourceElementDraftEventMode: (target) =>
        isDayDragTarget(target) ? "dim-source" : "hide-source",
      getTarget: (event) => getInteractionTarget(event),
      updateVisual: ({ pointer, target, visual }) => {
        if (!layout) {
          return {
            draftEvent: null,
            visual,
          };
        }

        if (visual.type === "allDayDrag") {
          const nextVisual = updateAllDayDragVisual(visual, {
            layout,
            pointer,
          });

          return {
            draftEvent: {
              transform: nextVisual.transform,
            },
            visual: nextVisual,
          };
        }

        if (visual.type === "allDayResize") {
          const nextVisual = updateAllDayResizeVisual(visual, {
            layout,
            pointer,
          });

          return {
            draftEvent: {
              height: nextVisual.sourceRect.height,
              transform: nextVisual.transform,
              width: nextVisual.width,
            },
            visual: nextVisual,
          };
        }

        if (visual.type === "timedResize") {
          if (target.type !== "timedResize") {
            throw new Error("Mismatched Day interaction target");
          }

          const smartScroll = applySmartScroll(pointer);
          const nextVisual = updateTimedResizeVisual(visual, {
            layout,
            pointer,
            scrollDeltaPx: smartScroll.scrollDeltaPx,
          });
          const nextEvent = timedResizeVisualToDayGridEvent(
            target.event,
            nextVisual,
            getVisibleDate(),
          );

          return {
            draftEvent: {
              height: nextVisual.height,
              mutate: (node) => updateDraftEventTimeLabel(node, nextEvent),
              transform: nextVisual.transform,
            },
            shouldContinue: smartScroll.isScrolling,
            visual: nextVisual,
          };
        }

        if (target.type !== "timedDrag") {
          throw new Error("Mismatched Day interaction target");
        }

        const smartScroll = applySmartScroll(pointer);
        const nextVisual = updateTimedDragVisual(visual, {
          layout,
          pointer,
          scrollDeltaPx: smartScroll.scrollDeltaPx,
        });
        const nextEvent = timedDragVisualToDayGridEvent(
          target.event,
          nextVisual,
          getVisibleDate(),
        );

        return {
          draftEvent: {
            mutate: (node) => updateDraftEventTimeLabel(node, nextEvent),
            transform: nextVisual.transform,
          },
          shouldContinue: smartScroll.isScrolling,
          visual: nextVisual,
        };
      },
    };
  }

  function applySmartScroll(pointer: VisualPoint) {
    const result = applySmartScrollFrame({ layout, pointer, scrollTop });
    scrollTop = result.scrollTop;
    return {
      isScrolling: result.isScrolling,
      scrollDeltaPx: result.scrollDeltaPx,
    };
  }

  function getInteractionTarget(
    event: PointerEvent,
  ): DayInteractionTarget | null {
    const allDayResizeTarget = getAllDayResizeTarget(event);

    if (allDayResizeTarget) {
      return allDayResizeTarget;
    }

    const timedResizeTarget = getTimedResizeTarget(event);

    if (timedResizeTarget) {
      return timedResizeTarget;
    }

    const timedDragTarget = getTimedDragTarget(event);

    if (timedDragTarget) {
      return timedDragTarget;
    }

    return getAllDayDragTarget(event);
  }

  function getAllDayDragTarget(
    event: PointerEvent,
  ): DayAllDayDragTarget | null {
    if (getResizeHandleEdge(event)) {
      return null;
    }

    const target = resolveAllDayEventTarget(event);

    if (!target) {
      return null;
    }

    return {
      ...target,
      type: "allDayDrag",
    };
  }

  function getAllDayResizeTarget(
    event: PointerEvent,
  ): DayAllDayResizeTarget | null {
    const edge = getResizeHandleEdge(event);

    if (!edge) {
      return null;
    }

    const target = resolveAllDayEventTarget(event);

    if (!target) {
      return null;
    }

    return {
      edge,
      ...target,
      type: "allDayResize",
    };
  }

  function getTimedDragTarget(event: PointerEvent): DayTimedDragTarget | null {
    if (getResizeHandleEdge(event)) {
      return null;
    }

    const target = resolveTimedEventTarget(event);

    if (!target) {
      return null;
    }

    return {
      ...target,
      type: "timedDrag",
    };
  }

  function getTimedResizeTarget(
    event: PointerEvent,
  ): DayTimedResizeTarget | null {
    const edge = getResizeHandleEdge(event);

    if (!edge) {
      return null;
    }

    const target = resolveTimedEventTarget(event);

    if (!target) {
      return null;
    }

    return {
      edge,
      ...target,
      type: "timedResize",
    };
  }

  function resolveAllDayEventTarget(
    event: PointerEvent,
  ): DayResolvedEventTarget | null {
    const registered = getRegisteredTarget(event, "all-day");

    if (!registered) {
      return null;
    }

    const currentRuntime = runtime();
    const allDayEvent = currentRuntime.getAllDayEventById?.(registered.eventId);

    if (!allDayEvent?._id || !allDayEvent.isAllDay) {
      return null;
    }

    return {
      event: allDayEvent,
      hadFormOpenBeforeInteraction: currentRuntime.isFormOpen?.() ?? false,
      registered,
    };
  }

  function resolveTimedEventTarget(
    event: PointerEvent,
  ): DayResolvedEventTarget | null {
    const registered = getRegisteredTarget(event, "timed");

    if (!registered) {
      return null;
    }

    const currentRuntime = runtime();
    const timedEvent = currentRuntime.getTimedEventById(registered.eventId);

    if (!timedEvent?._id || timedEvent.isAllDay) {
      return null;
    }

    return {
      event: timedEvent,
      hadFormOpenBeforeInteraction: currentRuntime.isFormOpen?.() ?? false,
      registered,
    };
  }

  function getRegisteredTarget(
    event: PointerEvent,
    eventType: DayInteractionEventType,
  ) {
    const registered = dayEventRegistry.resolveFromTarget(event.target);

    return registered?.eventType === eventType ? registered : null;
  }

  return {
    cancel,
    connectCancellationEvents,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    ownsPointer,
  };
};

const isAllDayTarget = (
  target: DayInteractionTarget,
): target is DayAllDayDragTarget | DayAllDayResizeTarget =>
  target.type === "allDayDrag" || target.type === "allDayResize";
