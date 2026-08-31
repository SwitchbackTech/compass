import { type FC } from "react";
import { type GameAward } from "@web/components/ShortcutShowcase/game.state";
import {
  type GameTask,
  RUN_TASKS,
  STREAK_X2_AT,
  STREAK_X3_AT,
} from "@web/components/ShortcutShowcase/game.tasks";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

const formatClock = (remainingSeconds: number) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const TIMER_WARNING_SECONDS = 15;

/** Countdown, score, and streak strip above the practice grid. */
export const GameHud: FC<{
  remainingSeconds: number;
  score: number;
  streak: number;
  award: GameAward | null;
}> = ({ remainingSeconds, score, streak, award }) => {
  const warning = remainingSeconds <= TIMER_WARNING_SECONDS;
  const multiplier =
    streak >= STREAK_X3_AT ? 3 : streak >= STREAK_X2_AT ? 2 : null;

  return (
    <div className="flex items-center justify-between pb-3">
      <span
        aria-label="Time left"
        aria-live="off"
        className={`font-semibold text-lg tabular-nums ${
          warning
            ? "motion-reduce:animate-none animate-pulse text-error"
            : "text-text"
        }`}
        role="timer"
      >
        {formatClock(remainingSeconds)}
      </span>
      <div className="relative flex items-center gap-2">
        {multiplier && (
          <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-background text-xs">
            x{multiplier} streak
          </span>
        )}
        <span
          className="font-semibold text-lg text-text tabular-nums"
          data-game-score=""
        >
          {score}
        </span>
        {award && (
          <span
            key={award.seq}
            aria-hidden
            className="c-game-score-pop -top-4 absolute right-0 font-semibold text-accent text-sm"
          >
            +{award.points}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * The piece queue: the current task as a big card with its keycaps, and the
 * next two peeking underneath — the tetris "next piece" preview.
 */
export const GameTaskQueue: FC<{ taskIndex: number }> = ({ taskIndex }) => {
  const task: GameTask | undefined = RUN_TASKS[taskIndex];
  if (!task) return null;
  const upNext = RUN_TASKS.slice(taskIndex + 1, taskIndex + 3);

  return (
    <div className="flex flex-col gap-3">
      <p className="font-medium text-accent text-xs uppercase tracking-wide">
        Task {taskIndex + 1}/{RUN_TASKS.length}
      </p>
      <div
        className="rounded-xl border border-border bg-surface p-4 shadow-md"
        data-game-task={task.id}
      >
        <h3 className="font-semibold text-lg text-text">{task.title}</h3>
        <p className="pt-1 text-sm text-text-muted">{task.instruction}</p>
        <div className="pt-3">
          <ShortcutKeys keys={[...task.keycaps]} />
        </div>
      </div>
      {upNext.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] text-text-muted uppercase tracking-wide">
            Up next
          </p>
          {upNext.map((next) => (
            <div
              key={next.id}
              className="truncate rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-text-muted text-xs"
            >
              {next.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
