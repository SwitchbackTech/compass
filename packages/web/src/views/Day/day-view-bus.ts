// Plain pub/sub for Day-view commands issued outside the components that
// handle them (shortcuts, command palette). No payloads, so a listener Set
// per command is all that's needed.
export type DayViewCommand =
  | "CREATE_ALLDAY_DRAFT"
  | "CREATE_TIMED_DRAFT"
  | "SCROLL_TO_NOW_LINE";

const listenersByCommand: Record<DayViewCommand, Set<() => void>> = {
  CREATE_ALLDAY_DRAFT: new Set(),
  CREATE_TIMED_DRAFT: new Set(),
  SCROLL_TO_NOW_LINE: new Set(),
};

export function onDayViewCommand(
  command: DayViewCommand,
  listener: () => void,
): () => void {
  const listeners = listenersByCommand[command];
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitDayViewCommand(command: DayViewCommand): void {
  for (const listener of listenersByCommand[command]) listener();
}
