import {
  GAME_SEED_EVENTS,
  type GameTask,
  RUN_DURATION_MS,
  RUN_TASKS,
  SPEED_BONUS_MS,
  SPEED_BONUS_POINTS,
  STREAK_X2_AT,
  STREAK_X3_AT,
  TASK_BASE_POINTS,
  TIME_BONUS_PER_SECOND,
} from "@web/components/ShortcutShowcase/game.tasks";
import {
  createPracticeState,
  cycleEdgeFocus,
  deleteFocused,
  focusEvent,
  lockPlacing,
  nudgeFocused,
  PRACTICE_GRID_END_MIN,
  PRACTICE_GRID_START_MIN,
  PRACTICE_NUDGE_MIN,
  type PracticeNudgeDirection,
  type PracticeState,
  spawnPiece,
  undoDelete,
} from "@web/components/ShortcutShowcase/practice.state";

/**
 * The Schedule Rush reducer. Every function is pure and every timestamp
 * arrives as an argument — no Date.now() in here — so a full run scripts
 * cleanly in tests without fake timers.
 */

export type GamePhase = "howto" | "running" | "ended";
export type GameOutcome = "cleared" | "time_up";

/** Keyboard input, already translated from the DOM event by the component. */
export type GameKey =
  | { type: "create" }
  | { type: "digit"; digit: string }
  | { type: "arrow"; direction: PracticeNudgeDirection; shift: boolean }
  | { type: "tab"; backward: boolean }
  | { type: "enter" }
  | { type: "delete" }
  | { type: "undo" };

export type GameAward = {
  seq: number;
  points: number;
  taskId: string;
  elapsedMs: number;
};

export type GameState = {
  phase: GamePhase;
  outcome: GameOutcome | null;
  practice: PracticeState;
  taskIndex: number;
  tasksDone: number;
  score: number;
  /** Consecutive speed-bonus clears; resets on a slow clear. */
  streak: number;
  /** Remaining-seconds points granted on a full clear. */
  timeBonus: number;
  /** Pending quick-time digits for the current task. */
  digitBuffer: string;
  startedAtMs: number;
  endsAtMs: number;
  /** When the run actually ended (cleared or time-up); 0 while running. */
  endedAtMs: number;
  taskStartedAtMs: number;
  /** Seq bumps on every award so the UI can key the score popup. */
  lastAward: GameAward | null;
  runCount: number;
};

export const createInitialGameState = (runCount = 1): GameState => ({
  phase: "howto",
  outcome: null,
  practice: createPracticeState(
    GAME_SEED_EVENTS.map((event) => ({ ...event })),
  ),
  taskIndex: 0,
  tasksDone: 0,
  score: 0,
  streak: 0,
  timeBonus: 0,
  digitBuffer: "",
  startedAtMs: 0,
  endsAtMs: 0,
  endedAtMs: 0,
  taskStartedAtMs: 0,
  lastAward: null,
  runCount,
});

export const currentTask = (state: GameState): GameTask | null =>
  RUN_TASKS[state.taskIndex] ?? null;

export const remainingMs = (state: GameState, nowMs: number): number =>
  state.phase === "running" ? Math.max(0, state.endsAtMs - nowMs) : 0;

/** Pin focus to a task's target so Shift+Arrow/Delete land without hunting. */
const enterTask = (state: GameState): GameState => {
  const task = currentTask(state);
  const next = { ...state, digitBuffer: "" };
  if (task && "targetEventId" in task && task.type !== "undo") {
    return { ...next, practice: focusEvent(next.practice, task.targetEventId) };
  }
  return next;
};

export const startRun = (state: GameState, nowMs: number): GameState => {
  if (state.phase !== "howto") return state;
  return enterTask({
    ...state,
    phase: "running",
    startedAtMs: nowMs,
    endsAtMs: nowMs + RUN_DURATION_MS,
    taskStartedAtMs: nowMs,
  });
};

/** Time-up is a soft landing: the score stands and the end screen shows. */
export const tick = (state: GameState, nowMs: number): GameState =>
  state.phase === "running" && nowMs >= state.endsAtMs
    ? { ...state, phase: "ended", outcome: "time_up", endedAtMs: nowMs }
    : state;

const blockById = (practice: PracticeState, id: string) =>
  practice.events.find((event) => event.id === id);

const matchesSlot = (
  block: { dayIndex: number; startMin: number; endMin: number },
  slot: { dayIndex: number; startMin: number; endMin: number },
) =>
  block.dayIndex === slot.dayIndex &&
  block.startMin === slot.startMin &&
  block.endMin === slot.endMin;

export const isTaskComplete = (
  task: GameTask,
  practice: PracticeState,
): boolean => {
  switch (task.type) {
    case "place":
    case "quickTime": {
      const block = blockById(practice, task.piece.id);
      // Reaching the slot while still placing doesn't count: Enter locks.
      return (
        Boolean(block) &&
        practice.placingId !== task.piece.id &&
        matchesSlot(block as NonNullable<typeof block>, task.target)
      );
    }
    case "nudge":
    case "resize": {
      const block = blockById(practice, task.targetEventId);
      return (
        Boolean(block) &&
        matchesSlot(block as NonNullable<typeof block>, task.target)
      );
    }
    case "delete":
      return !blockById(practice, task.targetEventId);
    case "undo":
      return Boolean(blockById(practice, task.targetEventId));
  }
};

/**
 * Sandbox quick-time: the grid runs 8am-6pm so there is no meridiem
 * ambiguity and no commit timer. 3-4 digits resolve as H:MM/HH:MM the moment
 * they form a valid quarter-hour start inside the grid; 1-2 digits resolve
 * as a whole hour via Enter.
 */
const timeFromParts = (hour: number, minute: number): number | null => {
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (minute >= 60 || minute % PRACTICE_NUDGE_MIN !== 0) return null;
  const startMin = hour * 60 + minute;
  if (startMin < PRACTICE_GRID_START_MIN) return null;
  if (startMin + PRACTICE_NUDGE_MIN > PRACTICE_GRID_END_MIN) return null;
  return startMin;
};

export const resolveTypedTime = (buffer: string): number | null => {
  if (buffer.length === 4) {
    return timeFromParts(Number(buffer.slice(0, 2)), Number(buffer.slice(2)));
  }
  if (buffer.length === 3) {
    return timeFromParts(Number(buffer.slice(0, 1)), Number(buffer.slice(1)));
  }
  return null;
};

/** Enter commits a short buffer as a whole hour ("9" -> 9:00, "12" -> 12:00). */
export const resolveTypedTimeEagerly = (buffer: string): number | null => {
  if (buffer.length === 1 || buffer.length === 2) {
    return timeFromParts(Number(buffer), 0);
  }
  return resolveTypedTime(buffer);
};

/** Could more digits (or Enter) still turn this buffer into a valid time? */
const canBecomeValidTime = (buffer: string): boolean => {
  if (buffer.length === 0) return false;
  if (resolveTypedTimeEagerly(buffer) !== null) return true;
  if (buffer.length >= 4) return false;
  for (let digit = 0; digit <= 9; digit += 1) {
    if (canBecomeValidTime(`${buffer}${digit}`)) return true;
  }
  return false;
};

const spawnTypedPiece = (
  state: GameState,
  task: Extract<GameTask, { type: "quickTime" }>,
  startMin: number,
): GameState => {
  const duration = task.target.endMin - task.target.startMin;
  const endMin = Math.min(PRACTICE_GRID_END_MIN, startMin + duration);
  return {
    ...state,
    digitBuffer: "",
    practice: spawnPiece(state.practice, {
      ...task.piece,
      dayIndex: task.target.dayIndex,
      startMin,
      endMin,
    }),
  };
};

const applyKey = (state: GameState, key: GameKey): GameState => {
  const task = currentTask(state);
  if (!task) return state;
  const { practice } = state;

  switch (key.type) {
    case "create": {
      if (task.type !== "place") return state;
      // Re-pressing C after a lock must not respawn a placed piece.
      if (practice.placingId || blockById(practice, task.piece.id)) {
        return state;
      }
      return {
        ...state,
        practice: spawnPiece(practice, { ...task.piece, ...task.spawn }),
      };
    }
    case "digit": {
      if (task.type !== "quickTime") return state;
      if (practice.placingId || blockById(practice, task.piece.id)) {
        return state;
      }
      const buffer = state.digitBuffer + key.digit;
      const startMin = resolveTypedTime(buffer);
      if (startMin !== null) return spawnTypedPiece(state, task, startMin);
      return {
        ...state,
        digitBuffer: canBecomeValidTime(buffer) ? buffer : "",
      };
    }
    case "arrow": {
      // Plain arrows move an open piece (like the real grid's draft);
      // Shift+Arrow nudges whatever is focused, placing or locked.
      if (!practice.placingId && !key.shift) return state;
      const next = nudgeFocused(practice, key.direction);
      return next === practice ? state : { ...state, practice: next };
    }
    case "tab": {
      if (practice.placingId) return state;
      return {
        ...state,
        practice: cycleEdgeFocus(
          practice,
          key.backward ? "backward" : "forward",
        ),
      };
    }
    case "enter": {
      if (practice.placingId) {
        return { ...state, practice: lockPlacing(practice) };
      }
      if (task.type === "quickTime" && state.digitBuffer) {
        const startMin = resolveTypedTimeEagerly(state.digitBuffer);
        if (startMin === null) return { ...state, digitBuffer: "" };
        return spawnTypedPiece(state, task, startMin);
      }
      return state;
    }
    case "delete": {
      const next = deleteFocused(practice);
      return next === practice ? state : { ...state, practice: next };
    }
    case "undo": {
      const next = undoDelete(practice);
      return next === practice ? state : { ...state, practice: next };
    }
  }
};

const completeIfDone = (state: GameState, nowMs: number): GameState => {
  const task = currentTask(state);
  if (!task || !isTaskComplete(task, state.practice)) return state;

  const elapsed = nowMs - state.taskStartedAtMs;
  const speedy = elapsed <= SPEED_BONUS_MS;
  const streak = speedy ? state.streak + 1 : 0;
  const multiplier =
    streak >= STREAK_X3_AT ? 3 : streak >= STREAK_X2_AT ? 2 : 1;
  const points =
    (TASK_BASE_POINTS + (speedy ? SPEED_BONUS_POINTS : 0)) * multiplier;

  const advanced: GameState = {
    ...state,
    score: state.score + points,
    streak,
    tasksDone: state.tasksDone + 1,
    taskIndex: state.taskIndex + 1,
    taskStartedAtMs: nowMs,
    lastAward: {
      seq: (state.lastAward?.seq ?? 0) + 1,
      points,
      taskId: task.id,
      elapsedMs: elapsed,
    },
  };

  if (advanced.taskIndex >= RUN_TASKS.length) {
    const remainingSeconds = Math.max(
      0,
      Math.floor((state.endsAtMs - nowMs) / 1000),
    );
    const timeBonus = remainingSeconds * TIME_BONUS_PER_SECOND;
    return {
      ...advanced,
      phase: "ended",
      outcome: "cleared",
      endedAtMs: nowMs,
      timeBonus,
      score: advanced.score + timeBonus,
    };
  }
  return enterTask(advanced);
};

export const handleGameKey = (
  state: GameState,
  key: GameKey,
  nowMs: number,
): GameState => {
  if (state.phase !== "running") return state;
  const next = applyKey(state, key);
  if (next === state) return state;
  return completeIfDone(next, nowMs);
};
