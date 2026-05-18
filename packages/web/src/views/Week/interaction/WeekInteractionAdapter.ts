import {
  createWeekInteractionRuntimeMetrics,
  type WeekInteractionRuntimeMetrics,
} from "./WeekInteractionMetrics";

export type WeekInteractionAdapterMode = "active" | "passive";

export type WeekInteractionOwnedSurface =
  | "savedTimedDrag"
  | "savedTimedResize"
  | "savedAllDayDrag"
  | "savedAllDayResize"
  | "pendingEvent"
  | "draftEvent"
  | "emptyGridSelection"
  | "emptyGridDraftCreation"
  | "somedaySidebarDrop"
  | "formUi";

export interface WeekInteractionOwnershipEntry {
  newOwner: "existing-week-path" | "week-interaction-adapter";
  notes: string;
  surface: WeekInteractionOwnedSurface;
}

export interface WeekInteractionPointerOwnership {
  reason: string;
  shouldOwn: boolean;
}

interface WeekInteractionAdapterOptions {
  metrics?: WeekInteractionRuntimeMetrics;
  mode?: WeekInteractionAdapterMode;
}

export class WeekInteractionAdapter {
  readonly #metrics: WeekInteractionRuntimeMetrics;
  readonly #mode: WeekInteractionAdapterMode;

  constructor({
    metrics = createWeekInteractionRuntimeMetrics(),
    mode = "passive",
  }: WeekInteractionAdapterOptions = {}) {
    this.#metrics = metrics;
    this.#mode = mode;
  }

  getMetrics() {
    return this.#metrics;
  }

  getOwnershipMatrix(): WeekInteractionOwnershipEntry[] {
    return [
      {
        newOwner: "existing-week-path",
        notes:
          "Passive adapter refuses saved timed drag until the timed-drag cutover task.",
        surface: "savedTimedDrag",
      },
      {
        newOwner: "existing-week-path",
        notes:
          "Passive adapter refuses saved timed resize until the timed-resize cutover task.",
        surface: "savedTimedResize",
      },
      {
        newOwner: "existing-week-path",
        notes:
          "Passive adapter refuses saved all-day drag until the all-day drag cutover task.",
        surface: "savedAllDayDrag",
      },
      {
        newOwner: "existing-week-path",
        notes:
          "Passive adapter refuses saved all-day resize until the all-day resize cutover task.",
        surface: "savedAllDayResize",
      },
      {
        newOwner: "existing-week-path",
        notes:
          "Pending events remain non-owned by the adapter and follow the existing pending-event rule.",
        surface: "pendingEvent",
      },
      {
        newOwner: "existing-week-path",
        notes: "Draft events remain with the existing draft provider paths.",
        surface: "draftEvent",
      },
      {
        newOwner: "existing-week-path",
        notes:
          "Empty-grid selection remains outside the adapter in this branch phase.",
        surface: "emptyGridSelection",
      },
      {
        newOwner: "existing-week-path",
        notes:
          "Empty-grid draft creation remains with the current all-day and timed grid handlers.",
        surface: "emptyGridDraftCreation",
      },
      {
        newOwner: "existing-week-path",
        notes:
          "Someday/sidebar drag and drop remains with the planner sidebar DND paths.",
        surface: "somedaySidebarDrop",
      },
      {
        newOwner: "existing-week-path",
        notes: "Form UI remains owned by existing floating form paths.",
        surface: "formUi",
      },
    ];
  }

  handlePointerDown(_event: PointerEvent): WeekInteractionPointerOwnership {
    this.#metrics.pointerDowns += 1;

    if (this.#mode === "passive") {
      return {
        reason: "passive-week-adapter",
        shouldOwn: false,
      };
    }

    return {
      reason: "active-week-adapter-has-no-enabled-surfaces",
      shouldOwn: false,
    };
  }

  handlePointerMove(_event: PointerEvent) {
    this.#metrics.pointerMoves += 1;
  }

  handlePointerUp(_event: PointerEvent) {
    this.#metrics.pointerUps += 1;
  }

  handlePointerCancel(_event: PointerEvent) {
    this.#metrics.pointerCancels += 1;
  }

  recordOwnedPointerDown() {
    this.#metrics.ownedPointerDowns += 1;
  }
}

export const createPassiveWeekInteractionAdapter = () =>
  new WeekInteractionAdapter({ mode: "passive" });
