import {
  createInitialGameState,
  currentTask,
  type GameKey,
  type GameState,
  handleGameKey,
  isTaskComplete,
  resolveTypedTime,
  startRun,
  tick,
} from "@web/components/ShortcutShowcase/game.state";
import {
  RUN_DURATION_MS,
  RUN_TASKS,
  SPEED_BONUS_POINTS,
  TASK_BASE_POINTS,
  TIME_BONUS_PER_SECOND,
} from "@web/components/ShortcutShowcase/game.tasks";
import { describe, expect, it } from "bun:test";

const T0 = 1_000_000;

const key = {
  create: { type: "create" } as GameKey,
  enter: { type: "enter" } as GameKey,
  del: { type: "delete" } as GameKey,
  undo: { type: "undo" } as GameKey,
  tab: { type: "tab", backward: false } as GameKey,
  digit: (digit: string): GameKey => ({ type: "digit", digit }),
  arrow: (
    direction: "up" | "down" | "left" | "right",
    shift = false,
  ): GameKey => ({ type: "arrow", direction, shift }),
};

/** The one keyboard script that clears the whole queue. */
const WINNING_SCRIPT: GameKey[] = [
  // place-standup: spawn Tue 9:00, walk left, lock
  key.create,
  key.arrow("left"),
  key.enter,
  // quicktime-lunch: type 1230, lock
  key.digit("1"),
  key.digit("2"),
  key.digit("3"),
  key.digit("0"),
  key.enter,
  // place-review: spawn Mon 2pm, two days right, lock
  key.create,
  key.arrow("right"),
  key.arrow("right"),
  key.enter,
  // nudge-standup: 9:00 -> 10:00
  key.arrow("down", true),
  key.arrow("down", true),
  key.arrow("down", true),
  key.arrow("down", true),
  // resize-one-on-one: Tab to end edge, stretch 10:30 -> 11:00
  key.tab,
  key.tab,
  key.arrow("down", true),
  key.arrow("down", true),
  // quicktime-focus: type 1600, lock
  key.digit("1"),
  key.digit("6"),
  key.digit("0"),
  key.digit("0"),
  key.enter,
  // delete-gym, undo-gym
  key.del,
  key.undo,
  // nudge-review: Wed -> Tue
  key.arrow("left", true),
  // place-party: spawn Wed 4pm, walk down to 5pm, lock
  key.create,
  key.arrow("down"),
  key.arrow("down"),
  key.arrow("down"),
  key.arrow("down"),
  key.enter,
];

const playKeys = (
  state: GameState,
  keys: GameKey[],
  nowMs: number,
): GameState =>
  keys.reduce(
    (current, gameKey) => handleGameKey(current, gameKey, nowMs),
    state,
  );

describe("run lifecycle", () => {
  it("starts on Enter, pins nothing before the how-to card", () => {
    const initial = createInitialGameState();
    expect(handleGameKey(initial, key.create, T0)).toBe(initial);

    const running = startRun(initial, T0);
    expect(running.phase).toBe("running");
    expect(running.endsAtMs).toBe(T0 + RUN_DURATION_MS);
    expect(currentTask(running)?.id).toBe("place-standup");
  });

  it("clears the whole queue with the winning script and pays the time bonus", () => {
    let state = startRun(createInitialGameState(), T0);
    state = playKeys(state, WINNING_SCRIPT, T0 + 1_000);

    expect(state.phase).toBe("ended");
    expect(state.outcome).toBe("cleared");
    expect(state.tasksDone).toBe(RUN_TASKS.length);
    const remainingSeconds = Math.floor((RUN_DURATION_MS - 1_000) / 1000);
    expect(state.timeBonus).toBe(remainingSeconds * TIME_BONUS_PER_SECOND);
    expect(state.score).toBeGreaterThan(state.timeBonus);
  });

  it("ends with time_up when the clock runs out mid-queue", () => {
    let state = startRun(createInitialGameState(), T0);
    state = playKeys(state, WINNING_SCRIPT.slice(0, 3), T0 + 1_000);
    expect(state.tasksDone).toBe(1);

    const ended = tick(state, T0 + RUN_DURATION_MS);
    expect(ended.phase).toBe("ended");
    expect(ended.outcome).toBe("time_up");
    expect(ended.tasksDone).toBe(1);
    expect(ended.score).toBe(state.score);

    expect(handleGameKey(ended, key.create, T0 + RUN_DURATION_MS)).toBe(ended);
  });
});

describe("scoring", () => {
  it("pays the speed bonus and multiplies streaks of fast clears", () => {
    let state = startRun(createInitialGameState(), T0);
    // Three instant clears: 150, 150, then streak hits 3 -> x2.
    state = playKeys(state, WINNING_SCRIPT.slice(0, 12), T0);
    expect(state.tasksDone).toBe(3);
    const fast = TASK_BASE_POINTS + SPEED_BONUS_POINTS;
    expect(state.score).toBe(fast + fast + fast * 2);
    expect(state.streak).toBe(3);
  });

  it("resets the streak on a slow clear and drops the bonus", () => {
    let state = startRun(createInitialGameState(), T0);
    state = playKeys(state, WINNING_SCRIPT.slice(0, 3), T0 + 20_000);
    expect(state.tasksDone).toBe(1);
    expect(state.streak).toBe(0);
    expect(state.score).toBe(TASK_BASE_POINTS);
  });
});

describe("task validation", () => {
  it("does not complete a place task until the piece is locked on target", () => {
    let state = startRun(createInitialGameState(), T0);
    state = playKeys(state, [key.create, key.arrow("left")], T0);
    // On target but still placing.
    expect(currentTask(state)?.id).toBe("place-standup");
    state = handleGameKey(state, key.enter, T0);
    expect(currentTask(state)?.id).toBe("quicktime-lunch");
  });

  it("lets a piece locked in the wrong slot be nudged home afterwards", () => {
    let state = startRun(createInitialGameState(), T0);
    // Lock immediately at the Tuesday spawn slot: wrong day.
    state = playKeys(state, [key.create, key.enter], T0);
    expect(currentTask(state)?.id).toBe("place-standup");
    // C must not respawn the locked piece.
    const beforeRespawn = state;
    expect(handleGameKey(state, key.create, T0)).toBe(beforeRespawn);
    // Shift+Left walks the locked block home and completes the task.
    state = handleGameKey(state, key.arrow("left", true), T0);
    expect(currentTask(state)?.id).toBe("quicktime-lunch");
  });

  it("requires the end edge for the resize task: whole-block moves fail", () => {
    let state = startRun(createInitialGameState(), T0);
    state = playKeys(state, WINNING_SCRIPT.slice(0, 16), T0);
    expect(currentTask(state)?.id).toBe("resize-one-on-one");

    // Whole-block Shift+Down twice moves 10:00 -> 10:30; not a resize.
    state = playKeys(
      state,
      [key.arrow("down", true), key.arrow("down", true)],
      T0,
    );
    expect(currentTask(state)?.id).toBe("resize-one-on-one");

    // Recover, then do it properly via the end edge.
    state = playKeys(
      state,
      [
        key.arrow("up", true),
        key.arrow("up", true),
        key.tab,
        key.tab,
        key.arrow("down", true),
        key.arrow("down", true),
      ],
      T0,
    );
    expect(currentTask(state)?.id).toBe("quicktime-focus");
  });

  it("restores the scripted delete with undo", () => {
    let state = startRun(createInitialGameState(), T0);
    state = playKeys(state, WINNING_SCRIPT.slice(0, 25), T0);
    expect(currentTask(state)?.id).toBe("delete-gym");

    state = handleGameKey(state, key.del, T0);
    expect(currentTask(state)?.id).toBe("undo-gym");
    expect(state.practice.events.some((e) => e.id === "game-gym")).toBe(false);

    state = handleGameKey(state, key.undo, T0);
    expect(currentTask(state)?.id).toBe("nudge-review");
    expect(state.practice.events.some((e) => e.id === "game-gym")).toBe(true);
  });
});

describe("typed times", () => {
  it("resolves 4-digit and 3-digit quarter-hour times inside the grid", () => {
    expect(resolveTypedTime("1230")).toBe(12 * 60 + 30);
    expect(resolveTypedTime("830")).toBe(8 * 60 + 30);
    expect(resolveTypedTime("915")).toBe(9 * 60 + 15);
    // Not quarter-hour aligned, or outside the 8am-6pm grid.
    expect(resolveTypedTime("1234")).toBeNull();
    expect(resolveTypedTime("0700")).toBeNull();
    expect(resolveTypedTime("1800")).toBeNull();
  });

  it("keeps a promising buffer and clears a hopeless one", () => {
    let state = startRun(createInitialGameState(), T0);
    state = playKeys(state, WINNING_SCRIPT.slice(0, 3), T0);
    expect(currentTask(state)?.id).toBe("quicktime-lunch");

    state = playKeys(state, [key.digit("1"), key.digit("2")], T0);
    expect(state.digitBuffer).toBe("12");
    // "129" cannot extend to any valid quarter-hour time.
    state = handleGameKey(state, key.digit("9"), T0);
    expect(state.digitBuffer).toBe("");
  });

  it("commits a short hour buffer with Enter", () => {
    let state = startRun(createInitialGameState(), T0);
    state = playKeys(state, WINNING_SCRIPT.slice(0, 3), T0);
    state = playKeys(state, [key.digit("1"), key.digit("2"), key.enter], T0);
    // Spawned at 12:00 (placing); not yet at the 12:30 target.
    const lunch = state.practice.events.find((e) => e.id === "piece-lunch");
    expect(lunch?.startMin).toBe(12 * 60);
    expect(state.practice.placingId).toBe("piece-lunch");

    state = playKeys(
      state,
      [key.arrow("down"), key.arrow("down"), key.enter],
      T0,
    );
    expect(currentTask(state)?.id).toBe("place-review");
  });
});

describe("winning script sanity", () => {
  it("every task in the queue has a reachable, well-formed target", () => {
    const state = startRun(createInitialGameState(), T0);
    for (const task of RUN_TASKS) {
      expect(isTaskComplete(task, state.practice)).toBe(
        // Only already-satisfied tasks would be undo of something present.
        task.type === "undo",
      );
    }
  });
});
