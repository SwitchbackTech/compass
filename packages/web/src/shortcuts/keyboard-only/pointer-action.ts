import dayjs from "@core/util/date/dayjs";
import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_EVENTS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { GRID_TIME_STEP } from "@web/grid/grid.constants";
import { getEffectiveTimeZone } from "@web/timezone/effective-timezone.store";

export const POINTER_ACTION_ATTRIBUTE = "data-pointer-action";
export const POINTER_EVENT_ID_ATTRIBUTE = "data-pointer-event-id";
export const POINTER_SHORTCUT_ATTRIBUTE = "data-pointer-shortcut";
export const POINTER_EVENT_JUMP_REQUEST = "compass:pointer-event-jump";
export const POINTER_GRID_CREATE_REQUEST = "compass:pointer-grid-create";

export const POINTER_ACTIONS = {
  eventOpen: "event.open",
  goToToday: "calendar.today",
  sidebarClose: "sidebar.close",
  sidebarOpen: "sidebar.open",
} as const;

export type PointerActionId =
  (typeof POINTER_ACTIONS)[keyof typeof POINTER_ACTIONS];

export type BlockedPointerAttempt = {
  actionId: PointerActionId | "grid.timed" | "grid.all-day" | "unknown";
  eventId?: string;
  shortcutKey?: string;
  gridDate?: string;
  gridTimeKey?: string;
  gridTimeLabel?: string;
};

const POINTER_ACTION_IDS = new Set<string>(Object.values(POINTER_ACTIONS));

const isPointerActionId = (value: string): value is PointerActionId =>
  POINTER_ACTION_IDS.has(value);

export const resolveBlockedPointerAttempt = (
  path: EventTarget[],
): BlockedPointerAttempt => {
  let actionId: PointerActionId | "unknown" = "unknown";
  let eventId: string | undefined;
  let shortcutKey: string | undefined;

  for (const target of path) {
    if (!(target instanceof HTMLElement)) continue;
    if (actionId === "unknown") {
      const action = target.getAttribute(POINTER_ACTION_ATTRIBUTE);
      if (action && isPointerActionId(action)) {
        actionId = action;
        eventId = target.getAttribute(POINTER_EVENT_ID_ATTRIBUTE) ?? undefined;
      }
    }
    if (shortcutKey === undefined) {
      const shortcut = target.getAttribute(POINTER_SHORTCUT_ATTRIBUTE);
      if (shortcut) shortcutKey = shortcut;
    }
    if (actionId !== "unknown" && shortcutKey !== undefined) break;
  }

  return {
    actionId,
    ...(eventId ? { eventId } : {}),
    ...(shortcutKey ? { shortcutKey } : {}),
  };
};

export const pointerShortcutAttributes = (key: string) => ({
  [POINTER_SHORTCUT_ATTRIBUTE]: key,
});

const PRIMARY_POINTER_BUTTON = 0;

/**
 * Right/middle clicks on an event must not start event jump: `m` would then
 * be consumed as Monday instead of opening the context menu.
 */
export const teachingFromBlockedPointer = (
  path: EventTarget[],
  button = PRIMARY_POINTER_BUTTON,
): { attempt: BlockedPointerAttempt; jumpEventId?: string } => {
  const attempt = resolveBlockedPointerAttempt(path);
  const isPrimary = button === PRIMARY_POINTER_BUTTON;
  if (
    isPrimary &&
    attempt.actionId === POINTER_ACTIONS.eventOpen &&
    attempt.eventId
  ) {
    return { attempt, jumpEventId: attempt.eventId };
  }
  if (!isPrimary && attempt.actionId === POINTER_ACTIONS.eventOpen) {
    return { attempt: { actionId: "unknown" } };
  }
  return { attempt };
};

export const eventPointerActionAttributes = (eventId?: string) =>
  eventId
    ? {
        [POINTER_ACTION_ATTRIBUTE]: POINTER_ACTIONS.eventOpen,
        [POINTER_EVENT_ID_ATTRIBUTE]: eventId,
      }
    : {};

export const requestPointerEventJump = (eventId: string) => {
  document.dispatchEvent(
    new CustomEvent(POINTER_EVENT_JUMP_REQUEST, { detail: { eventId } }),
  );
};

export type PointerGridIntent = {
  date: string;
  kind: "all-day" | "timed";
  /** Exact effective-zone instant selected by the pointer. */
  start?: string;
  timeKey?: string;
  timeLabel?: string;
};

export const requestPointerGridCreate = (intent: PointerGridIntent) => {
  document.dispatchEvent(
    new CustomEvent(POINTER_GRID_CREATE_REQUEST, { detail: intent }),
  );
};

export const pointerGridIntent = (event: Event): PointerGridIntent | null => {
  if (!(event instanceof CustomEvent)) return null;
  const detail = event.detail;
  if (
    !detail ||
    typeof detail.date !== "string" ||
    (detail.kind !== "all-day" && detail.kind !== "timed")
  ) {
    return null;
  }
  return {
    date: detail.date,
    kind: detail.kind,
    ...(typeof detail.timeKey === "string" ? { timeKey: detail.timeKey } : {}),
    ...(typeof detail.start === "string" ? { start: detail.start } : {}),
    ...(typeof detail.timeLabel === "string"
      ? { timeLabel: detail.timeLabel }
      : {}),
  };
};

export const pointerGridIntentFromPointer = (
  path: EventTarget[],
  clientX: number,
  clientY: number,
): PointerGridIntent | null => {
  let date: string | undefined;
  let kind: PointerGridIntent["kind"] | undefined;
  for (const target of path) {
    if (!(target instanceof HTMLElement)) continue;
    date ??= target.dataset.gridDate;
    if (target.id === ID_ALLDAY_COLUMNS) kind = "all-day";
    if (target.id === ID_GRID_COLUMNS_TIMED) kind = "timed";
    if (target.id === ID_GRID_EVENTS_ALLDAY) kind = "all-day";
    if (target.id === ID_GRID_EVENTS_TIMED) kind = "timed";
  }
  if (!kind) return null;
  if (!date) {
    const columns = document.getElementById(
      kind === "all-day" ? ID_ALLDAY_COLUMNS : ID_GRID_COLUMNS_TIMED,
    );
    date = [
      ...(columns?.querySelectorAll<HTMLElement>("[data-grid-date]") ?? []),
    ].find((column) => {
      const rect = column.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right;
    })?.dataset.gridDate;
  }
  if (!date) return null;
  if (kind === "all-day") return { date, kind };

  const grid = document.getElementById(ID_GRID_MAIN);
  if (!grid) return null;
  const rect = grid.getBoundingClientRect();
  const relative = grid.scrollTop + clientY - rect.top;
  const rawMinute = (relative / grid.scrollHeight) * 1440;
  const minute = Math.min(
    24 * 60 - GRID_TIME_STEP,
    Math.max(0, Math.round(rawMinute / GRID_TIME_STEP) * GRID_TIME_STEP),
  );
  const hour = Math.floor(minute / 60);
  const minutes = minute % 60;
  const timeKey = `${String(hour).padStart(2, "0")}${String(minutes).padStart(2, "0")}`;
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hour, minutes));
  const start = dayjs
    .tz(
      `${date}T${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
      getEffectiveTimeZone(),
    )
    .format();
  return { date, kind, start, timeKey, timeLabel };
};

export const pointerEventJumpId = (event: Event): string | undefined => {
  if (!(event instanceof CustomEvent)) return undefined;
  const eventId = event.detail?.eventId;
  return typeof eventId === "string" && eventId.length > 0
    ? eventId
    : undefined;
};
