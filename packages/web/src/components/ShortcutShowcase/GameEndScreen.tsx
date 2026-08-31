import { type FC } from "react";
import { type GameOutcome } from "@web/components/ShortcutShowcase/game.state";
import {
  getLearnedMoves,
  RUN_TASKS,
  TIME_BONUS_PER_SECOND,
} from "@web/components/ShortcutShowcase/game.tasks";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { KEYMAP } from "@web/shortcuts/keymap";

const PRIMARY_BUTTON_CLASS =
  "c-button c-button-primary inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs";
const SECONDARY_BUTTON_CLASS =
  "c-button c-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs";

/**
 * The run's scoreboard, shown on a clear and on time-up alike (time-up is a
 * soft landing, not a failure). For anonymous players the loudest button is
 * signup — the moment right after the game lands is the highest-intent
 * moment onboarding gets, and the old lesson flow never asked.
 */
export const GameEndScreen: FC<{
  outcome: GameOutcome;
  score: number;
  tasksDone: number;
  timeBonus: number;
  authenticated: boolean;
  notificationsSupported: boolean;
  notificationsPending: boolean;
  closing: boolean;
  onSignUp: () => void;
  onGraduate: () => void;
  onReplay: () => void;
  onEnableNotifications: () => void;
}> = ({
  outcome,
  score,
  tasksDone,
  timeBonus,
  authenticated,
  notificationsSupported,
  notificationsPending,
  closing,
  onSignUp,
  onGraduate,
  onReplay,
  onEnableNotifications,
}) => {
  const cleared = outcome === "cleared";
  const learnedMoves = getLearnedMoves(tasksDone);

  return (
    <div
      className="flex w-full max-w-lg flex-col gap-5 rounded-xl border border-border bg-surface p-8 shadow-xl"
      data-game-end-screen={outcome}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-text text-xl">
          {cleared ? "You cleared the week!" : "Time! Nice run."}
        </h2>
        <p className="text-sm text-text-muted">
          {cleared
            ? "Every one of those moves works the same on your real calendar."
            : "The moves you made work the same on your real calendar — the rest will come."}
        </p>
      </div>

      <div className="flex items-end justify-between rounded-lg bg-surface-overlay px-4 py-3">
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wide">
            Score
          </p>
          <p className="font-semibold text-3xl text-text tabular-nums">
            {score}
          </p>
        </div>
        <div className="text-right text-text-muted text-xs">
          <p>
            {tasksDone}/{RUN_TASKS.length} tasks cleared
          </p>
          {timeBonus > 0 && (
            <p>
              +{timeBonus} time bonus ({timeBonus / TIME_BONUS_PER_SECOND}s
              left)
            </p>
          )}
        </div>
      </div>

      {learnedMoves.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-text-muted uppercase tracking-wide">
            Moves you learned
          </p>
          {learnedMoves.map((move) => (
            <div
              key={move.label}
              className="flex items-center justify-between gap-3 text-sm text-text"
            >
              <span>{move.label}</span>
              <ShortcutKeys keys={[...move.keys]} />
            </div>
          ))}
        </div>
      )}

      <p className="text-text-muted text-xs">
        There's more: <ShortcutKeys keys="?" /> opens the full shortcut legend
        anytime, and <ShortcutKeys keys={KEYMAP.eventJump.keycaps[0]} /> jumps
        straight to any event.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {!authenticated && (
          <button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            disabled={closing}
            onClick={onSignUp}
          >
            Sign up to keep your calendar
            <ShortcutHint className="shrink-0">Enter</ShortcutHint>
          </button>
        )}
        <button
          type="button"
          className={
            authenticated ? PRIMARY_BUTTON_CLASS : SECONDARY_BUTTON_CLASS
          }
          disabled={closing}
          onClick={onGraduate}
        >
          Open your calendar
          <ShortcutHint className="shrink-0">
            {authenticated ? "Enter" : "O"}
          </ShortcutHint>
        </button>
        <button
          type="button"
          className={SECONDARY_BUTTON_CLASS}
          disabled={closing}
          onClick={onReplay}
        >
          Play again
          <ShortcutHint className="shrink-0">P</ShortcutHint>
        </button>
        {notificationsSupported && (
          <button
            type="button"
            className={SECONDARY_BUTTON_CLASS}
            disabled={closing || notificationsPending}
            onClick={onEnableNotifications}
          >
            Enable reminders
            <ShortcutHint className="shrink-0">N</ShortcutHint>
          </button>
        )}
      </div>
    </div>
  );
};
