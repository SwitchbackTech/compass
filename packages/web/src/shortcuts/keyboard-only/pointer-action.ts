export const POINTER_ACTION_ATTRIBUTE = "data-pointer-action";
export const POINTER_EVENT_ID_ATTRIBUTE = "data-pointer-event-id";
export const POINTER_EVENT_JUMP_REQUEST = "compass:pointer-event-jump";

export const POINTER_ACTIONS = {
  eventOpen: "event.open",
  sidebarClose: "sidebar.close",
  sidebarOpen: "sidebar.open",
} as const;

export type PointerActionId =
  (typeof POINTER_ACTIONS)[keyof typeof POINTER_ACTIONS];

export type BlockedPointerAttempt = {
  actionId: PointerActionId | "unknown";
  eventId?: string;
};

const POINTER_ACTION_IDS = new Set<string>(Object.values(POINTER_ACTIONS));

const isPointerActionId = (value: string): value is PointerActionId =>
  POINTER_ACTION_IDS.has(value);

export const resolveBlockedPointerAttempt = (
  path: EventTarget[],
): BlockedPointerAttempt => {
  for (const target of path) {
    if (!(target instanceof HTMLElement)) continue;
    const action = target.getAttribute(POINTER_ACTION_ATTRIBUTE);
    if (!action || !isPointerActionId(action)) continue;
    const eventId =
      target.getAttribute(POINTER_EVENT_ID_ATTRIBUTE) ?? undefined;
    return { actionId: action, ...(eventId ? { eventId } : {}) };
  }
  return { actionId: "unknown" };
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

export const pointerEventJumpId = (event: Event): string | undefined => {
  if (!(event instanceof CustomEvent)) return undefined;
  const eventId = event.detail?.eventId;
  return typeof eventId === "string" && eventId.length > 0
    ? eventId
    : undefined;
};
