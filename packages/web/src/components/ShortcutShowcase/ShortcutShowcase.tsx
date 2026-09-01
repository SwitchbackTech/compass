import { type FC, useContext, useEffect, useRef, useState } from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { track } from "@web/auth/posthog/track";
import { SHOWCASE_REVEAL_MS } from "@web/common/constants/motion.constants";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import { getFocusableElements } from "@web/common/utils/focusable-elements";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { GameEndScreen } from "@web/components/ShortcutShowcase/GameEndScreen";
import {
  GameHud,
  GameTaskQueue,
} from "@web/components/ShortcutShowcase/GameHud";
import { GameSimOverlays } from "@web/components/ShortcutShowcase/GameSimOverlays";
import {
  createInitialGameState,
  currentTask,
  type GameKey,
  getJumpLetters,
  getNextKeycapIndex,
  handleGameKey,
  skipCurrentTask,
  startRun,
  tick,
} from "@web/components/ShortcutShowcase/game.state";
import {
  getTaskBlockId,
  getTaskGhost,
  RUN_DURATION_MS,
} from "@web/components/ShortcutShowcase/game.tasks";
import { PracticeCalendar } from "@web/components/ShortcutShowcase/PracticeCalendar";
import { hasPlayDeepLink } from "@web/components/ShortcutShowcase/play-link";
import { type PracticeNudgeDirection } from "@web/components/ShortcutShowcase/practice.state";
import {
  selectShowcaseActive,
  selectShowcaseEntry,
  selectSkipPending,
  shortcutShowcaseActions,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { hasSeenWelcome } from "@web/components/WelcomeModal/welcome.modal.util";
import { settingsActions } from "@web/settings/settings.store";
import { useAppLockReason } from "@web/shortcuts/app-lock";
import {
  isBareLetterKey,
  keyboardKey,
} from "@web/shortcuts/is-bare-letter-key";
import { KEYMAP } from "@web/shortcuts/keymap";

const TEXT_BUTTON_CLASS =
  "c-focus-ring inline-flex items-center gap-2 rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text";
const PRIMARY_BUTTON_CLASS =
  "c-button c-button-primary inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs";
const SECONDARY_BUTTON_CLASS =
  "c-button c-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs";

/** `?` is Shift+/ on common layouts; some browsers report the physical slash. */
const isLegendToggleKey = (event: KeyboardEvent) =>
  event.key === "?" || (event.key === "/" && event.shiftKey);

const arrowDirection = (key: string): PracticeNudgeDirection | null => {
  if (key === "ArrowUp") return "up";
  if (key === "ArrowDown") return "down";
  if (key === "ArrowLeft") return "left";
  if (key === "ArrowRight") return "right";
  return null;
};

const HUD_TICK_MS = 250;

/** How long a bare Mod hold takes to reveal the practice page-jump numbers. */
const MOD_HOLD_REVEAL_MS = 600;

/**
 * Block Party: the full-screen practice arena shown before a new user ever
 * sees the real calendar. One run against a fixed queue of scheduling
 * tasks, played entirely with the app's real keyboard verbs. Bindings come
 * from KEYMAP (shared with the real handlers); behavior is a deliberately
 * simplified reimplementation against ephemeral practice state, so nothing
 * here touches storage or the real grid stores.
 *
 * The first run is untimed practice; the end screen offers a race against
 * the clock, and a timed run that outlives its clock keeps going with the
 * timed score frozen at the buzzer. Esc skips the current task; leaving
 * mid-run is the two-click Leave button, so no single keypress can dump a
 * first-time user onto the calendar.
 */
const ShowcaseTakeover: FC = () => {
  const skipPending = useShortcutShowcaseStore(selectSkipPending);
  const entry = useShortcutShowcaseStore(selectShowcaseEntry);
  const { closing, beginDismiss } = useDismissTransition(SHOWCASE_REVEAL_MS);
  const { openModal } = useAuthModal();
  const { authenticated } = useContext(SessionContext);
  const [game, setGame] = useState(() => createInitialGameState());
  const [remainingSeconds, setRemainingSeconds] = useState(
    RUN_DURATION_MS / 1000,
  );
  const regionRef = useRef<HTMLElement>(null);

  useAppLockReason("shortcutShowcase", true);

  const gameRef = useRef(game);
  gameRef.current = game;

  const dispatchKey = (key: GameKey) => {
    setGame((state) => handleGameKey(state, key, Date.now()));
  };

  const begin = (timed: boolean) => {
    setRemainingSeconds(RUN_DURATION_MS / 1000);
    setGame((state) => startRun({ ...state, timed }, Date.now()));
  };

  const replay = (timed: boolean) => {
    const nextRunCount = gameRef.current.runCount + 1;
    track("shortcut_game_replayed", { run_count: nextRunCount, timed });
    setRemainingSeconds(RUN_DURATION_MS / 1000);
    setGame(startRun(createInitialGameState(nextRunCount, timed), Date.now()));
  };

  // The page-jump task's reveal: hold Mod alone briefly, mirroring the real
  // mod-hold hint engine. The timer lives here so the reducer stays pure.
  const modHoldTimerRef = useRef<number | null>(null);
  const cancelModHold = () => {
    if (modHoldTimerRef.current === null) return;
    window.clearTimeout(modHoldTimerRef.current);
    modHoldTimerRef.current = null;
  };

  /** Funnel context attached to skip events so drop-off is measurable. */
  const gameContext = () => {
    const current = gameRef.current;
    const task = currentTask(current);
    return {
      phase: current.phase,
      task_id: task?.id ?? "none",
      tasks_done: current.tasksDone,
      score: current.score,
      elapsed_ms:
        current.phase === "running" ? Date.now() - current.startedAtMs : 0,
    };
  };

  const graduate = () => {
    shortcutShowcaseActions.markSeen();
    beginDismiss(() => shortcutShowcaseActions.finish());
  };

  const skipToSignup = () => {
    shortcutShowcaseActions.skip("signup", gameContext());
    track("signup_started", { source: "shortcut_showcase" });
    openModal("signUp");
  };

  /** From the end screen the run already finished; this is a handoff, not a skip. */
  const signUpFromEndScreen = () => {
    shortcutShowcaseActions.markSeen();
    shortcutShowcaseActions.finish();
    track("signup_started", { source: "shortcut_showcase" });
    openModal("signUp");
  };

  // Run-started, per-task, and finished events fire from effects (not the
  // setState updater) keyed by run count so each fires exactly once per run.
  const reportedRunRef = useRef(0);
  useEffect(() => {
    if (game.phase !== "running") return;
    if (reportedRunRef.current === game.runCount) return;
    reportedRunRef.current = game.runCount;
    track("shortcut_game_run_started", {
      entry: entry ?? "resume",
      run_count: game.runCount,
      timed: game.timed,
    });
  }, [game.phase, game.runCount, game.timed, entry]);

  const reportedTaskRef = useRef("");
  useEffect(() => {
    if (game.phase !== "running") return;
    const task = currentTask(game);
    if (!task) return;
    const marker = `${game.runCount}:${task.id}`;
    if (reportedTaskRef.current === marker) return;
    reportedTaskRef.current = marker;
    track("shortcut_game_task_shown", {
      task_id: task.id,
      task_type: task.type,
      index: game.taskIndex,
    });
  }, [game]);

  const reportedAwardRef = useRef(0);
  useEffect(() => {
    const award = game.lastAward;
    if (!award || reportedAwardRef.current === award.seq) return;
    reportedAwardRef.current = award.seq;
    track("shortcut_game_task_completed", {
      task_id: award.taskId,
      points: award.points,
      ms: award.elapsedMs,
      streak: game.streak,
      score: game.score,
    });
  }, [game]);

  const reportedEndRef = useRef(0);
  useEffect(() => {
    if (game.phase !== "ended") return;
    if (reportedEndRef.current === game.runCount) return;
    reportedEndRef.current = game.runCount;
    shortcutShowcaseActions.recordRunFinished({
      outcome: game.outcome ?? "cleared",
      score: game.score,
      tasks_done: game.tasksDone,
      tasks_skipped: game.tasksSkipped,
      timed: game.timed,
      ...(game.buzzer
        ? {
            buzzer_score: game.buzzer.score,
            buzzer_tasks_done: game.buzzer.tasksDone,
          }
        : {}),
      duration_ms: game.endedAtMs - game.startedAtMs,
      run_count: game.runCount,
    });
  }, [game]);

  // The countdown, for timed runs only. The reducer stays pure: the interval
  // feeds it wall-clock timestamps and keeps a display clock for the HUD,
  // re-rendering only when the visible second actually changes. Once the
  // buzzer snapshots the score the clock is pinned and the interval stops.
  useEffect(() => {
    if (game.phase !== "running" || !game.timed || game.buzzer) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setGame((state) => tick(state, now));
      const next = Math.max(
        0,
        Math.ceil((gameRef.current.endsAtMs - now) / 1000),
      );
      setRemainingSeconds((prev) => (prev === next ? prev : next));
    }, HUD_TICK_MS);
    return () => window.clearInterval(id);
  }, [game.phase, game.timed, game.buzzer]);

  const seatFocus = () => {
    const root = regionRef.current;
    if (!root || closing) return;
    // Mid-run, Enter and Tab are game verbs: park focus on the region itself
    // so no button can swallow them (a focused Skip button would otherwise
    // turn the lock-in Enter into an exit).
    if (gameRef.current.phase === "running") {
      root.focus();
      return;
    }
    if (root.contains(document.activeElement)) return;
    const [firstFocusable] = getFocusableElements(root);
    (firstFocusable ?? root).focus();
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: phase changes swap the focusable controls.
  useEffect(() => {
    seatFocus();
  }, [game.phase]);

  const claim = (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  const handleTakeoverKeyDown = (event: KeyboardEvent) => {
    if (closing) {
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }

    const phase = gameRef.current.phase;
    const focusedButton =
      event.target instanceof HTMLElement &&
      Boolean(event.target.closest("button"));

    if (event.key !== "Escape") {
      const activatingFocusedButton =
        (event.key === "Enter" || event.key === " ") && focusedButton;
      if (!activatingFocusedButton) {
        shortcutShowcaseActions.clearSkipPending();
      }
    }

    // A bare Mod press starts the page-jump reveal hold; any other keydown
    // means a chord, which breaks the hold.
    if (event.key === "Meta" || event.key === "Control") {
      if (
        phase === "running" &&
        !event.repeat &&
        currentTask(gameRef.current)?.type === "pageJump" &&
        gameRef.current.simOverlay !== "pagejump"
      ) {
        cancelModHold();
        modHoldTimerRef.current = window.setTimeout(() => {
          modHoldTimerRef.current = null;
          dispatchKey({ type: "modHoldReveal" });
        }, MOD_HOLD_REVEAL_MS);
      }
      return;
    }
    cancelModHold();

    if (event.key === "Tab" && regionRef.current) {
      // Mid-run, Tab is the edge-focus verb it teaches; the takeover's
      // buttons stay reachable outside the run.
      if (phase === "running") {
        claim(event);
        dispatchKey({ type: "tab", backward: event.shiftKey });
        return;
      }
      const root = regionRef.current;
      const focusables = getFocusableElements(root);
      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === root)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || active === root)) {
          event.preventDefault();
          first.focus();
        }
      }
      return;
    }

    if (event.key === "Escape") {
      claim(event);
      settingsActions.closeCmdPalette();
      if (phase === "running") {
        shortcutShowcaseActions.clearSkipPending();
        // Esc closes an open sim overlay first; otherwise it skips the task.
        if (gameRef.current.simOverlay) {
          dispatchKey({ type: "closeOverlay" });
          return;
        }
        const task = currentTask(gameRef.current);
        track("shortcut_game_task_skipped", {
          task_id: task?.id ?? "none",
          index: gameRef.current.taskIndex,
        });
        setGame((state) => skipCurrentTask(state, Date.now()));
        return;
      }
      if (phase === "ended") {
        // The run already finished; Esc is just another way out.
        graduate();
        return;
      }
      shortcutShowcaseActions.requestSkip("calendar", gameContext());
      return;
    }

    // The real palette and legend ignore the app lock; claim their triggers
    // so neither overlay can land on top of a run. Mid-run the same keys
    // drive the simulated versions the discovery tasks teach.
    const isModChord = event.metaKey || event.ctrlKey;
    if (isModChord && keyboardKey(event).toLowerCase() === "k") {
      claim(event);
      if (phase === "running") dispatchKey({ type: "palette" });
      return;
    }
    if (isLegendToggleKey(event)) {
      claim(event);
      if (phase === "running") dispatchKey({ type: "legend" });
      return;
    }

    if (
      isModChord &&
      !event.shiftKey &&
      keyboardKey(event).toLowerCase() === "z"
    ) {
      if (phase === "running") {
        claim(event);
        dispatchKey({ type: "undo" });
      }
      return;
    }

    // Mod+digit lands the page-jump task while its reveal is up.
    if (phase === "running" && isModChord && /^[0-9]$/.test(event.key)) {
      claim(event);
      dispatchKey({ type: "pageJumpDigit", digit: event.key });
      return;
    }

    if (phase === "howto") {
      if (event.key === "Enter" && !event.repeat && !focusedButton) {
        claim(event);
        begin(false);
        return;
      }
      if (isBareLetterKey(event, "t") && !event.repeat) {
        claim(event);
        begin(true);
        return;
      }
      if (isBareLetterKey(event, "u") && !authenticated) {
        claim(event);
        skipToSignup();
      }
      return;
    }

    if (phase === "ended") {
      // Enter follows the auto-focused primary CTA: signup while anonymous
      // (the highest-intent moment onboarding gets), the calendar otherwise.
      if (event.key === "Enter" && !event.repeat && !focusedButton) {
        claim(event);
        if (authenticated) graduate();
        else signUpFromEndScreen();
        return;
      }
      if (isBareLetterKey(event, "o") && !authenticated) {
        claim(event);
        graduate();
        return;
      }
      if (isBareLetterKey(event, "u") && !authenticated) {
        claim(event);
        signUpFromEndScreen();
        return;
      }
      if (isBareLetterKey(event, "p") && !event.repeat) {
        claim(event);
        replay(true);
      }
      return;
    }

    // phase === "running"
    if (event.key === "Enter") {
      if (focusedButton) return;
      claim(event);
      dispatchKey({ type: "enter" });
      return;
    }

    const direction = arrowDirection(event.key);
    if (direction) {
      claim(event);
      dispatchKey({ type: "arrow", direction, shift: event.shiftKey });
      return;
    }

    if (event.key === "Delete") {
      claim(event);
      dispatchKey({ type: "delete" });
      return;
    }

    if (isBareLetterKey(event, KEYMAP.eventJump.bareLetter)) {
      claim(event);
      dispatchKey({ type: "jump" });
      return;
    }

    // While jump chips are up, bare letters are jump targets. This branch
    // sits above the create and signup letters on purpose: no letter may
    // fling the player elsewhere mid-jump.
    if (gameRef.current.jumpChipsShown) {
      const letter = keyboardKey(event).toLowerCase();
      if (/^[a-z]$/.test(letter) && !event.altKey) {
        claim(event);
        dispatchKey({ type: "letter", letter });
        return;
      }
    }

    if (isBareLetterKey(event, KEYMAP.createEvent.hotkey.toLowerCase())) {
      claim(event);
      dispatchKey({ type: "create" });
      return;
    }

    if (
      /^[0-9]$/.test(event.key) &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      claim(event);
      dispatchKey({ type: "digit", digit: event.key });
      return;
    }

    if (isBareLetterKey(event, "u") && !authenticated) {
      claim(event);
      skipToSignup();
    }
  };

  const handleTakeoverKeyUp = (event: KeyboardEvent) => {
    // Releasing Mod ends the page-jump hold, revealed or not.
    if (event.key === "Meta" || event.key === "Control") {
      cancelModHold();
      dispatchKey({ type: "modHoldEnd" });
      return;
    }
    // The real legend overlay listens on keyup. Swallow the leftover `?` so
    // it cannot open on top of the takeover.
    if (isLegendToggleKey(event)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  };

  const handleTakeoverKeyDownRef = useRef(handleTakeoverKeyDown);
  handleTakeoverKeyDownRef.current = handleTakeoverKeyDown;
  const handleTakeoverKeyUpRef = useRef(handleTakeoverKeyUp);
  handleTakeoverKeyUpRef.current = handleTakeoverKeyUp;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      handleTakeoverKeyDownRef.current(event);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      handleTakeoverKeyUpRef.current(event);
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      if (modHoldTimerRef.current !== null) {
        window.clearTimeout(modHoldTimerRef.current);
      }
    };
  }, []);

  const task = currentTask(game);
  const isRunning = game.phase === "running";
  const ghost = isRunning && task ? getTaskGhost(task) : null;
  // eventJump leaves its target unfocused on purpose: the jump is the task.
  const pulseFocused = Boolean(
    isRunning &&
      task &&
      "targetEventId" in task &&
      task.type !== "undo" &&
      task.type !== "eventJump",
  );
  const awardBlockId = game.lastAward
    ? getTaskBlockId(game.lastAward.taskId)
    : null;
  const flash =
    game.lastAward && awardBlockId
      ? { eventId: awardBlockId, seq: game.lastAward.seq }
      : null;

  const skipControls = (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      {game.phase === "howto" && (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={PRIMARY_BUTTON_CLASS}
              onClick={() => begin(false)}
            >
              Start practicing
            </button>
            <ShortcutHint className="shrink-0">Enter</ShortcutHint>
          </div>
          <button
            type="button"
            className={SECONDARY_BUTTON_CLASS}
            onClick={() => begin(true)}
          >
            Race the clock
            <ShortcutHint className="shrink-0">T</ShortcutHint>
          </button>
        </>
      )}
      {!authenticated && (
        <button
          type="button"
          className={SECONDARY_BUTTON_CLASS}
          onClick={skipToSignup}
        >
          Skip to sign up
          <ShortcutHint className="shrink-0">U</ShortcutHint>
        </button>
      )}
      <button
        type="button"
        className={TEXT_BUTTON_CLASS}
        onClick={() =>
          shortcutShowcaseActions.requestSkip("calendar", gameContext())
        }
      >
        {skipPending
          ? "Leave now"
          : game.phase === "running"
            ? "Leave practice"
            : "Skip"}
        {game.phase === "howto" && (
          <ShortcutHint className="shrink-0">Esc</ShortcutHint>
        )}
      </button>
      {skipPending && (
        <p className="w-full text-text-muted text-xs" role="status">
          {game.phase === "running"
            ? "Click Leave now to confirm."
            : "Press Esc again to leave practice."}
        </p>
      )}
      {game.phase === "running" && !skipPending && (
        <p className="flex w-full items-center gap-1.5 text-text-muted text-xs">
          <ShortcutHint className="shrink-0">Esc</ShortcutHint> skips this task
        </p>
      )}
    </div>
  );

  return (
    <section
      ref={regionRef}
      aria-label="Shortcut practice"
      className={`fixed inset-0 flex items-center justify-center bg-background ${closing ? "c-showcase-curtain" : ""}`}
      data-closing={closing || undefined}
      style={{ zIndex: Z_INDEX_MODAL }}
      tabIndex={-1}
    >
      {game.phase === "ended" ? (
        <div
          className={`flex items-center justify-center px-8 ${closing ? "c-showcase-enter-stage" : ""}`}
        >
          <GameEndScreen
            outcome={game.outcome}
            score={game.score}
            tasksDone={game.tasksDone}
            tasksSkipped={game.tasksSkipped}
            timeBonus={game.timeBonus}
            timed={game.timed}
            buzzer={game.buzzer}
            authenticated={authenticated}
            closing={closing}
            onSignUp={signUpFromEndScreen}
            onGraduate={graduate}
            onReplay={() => replay(true)}
          />
        </div>
      ) : (
        <div
          className={`flex h-[80vh] max-h-160 w-full max-w-5xl gap-8 px-8 ${closing ? "c-showcase-enter-stage" : ""}`}
        >
          <aside className="flex w-80 shrink-0 flex-col justify-center gap-4">
            {game.phase === "howto" ? (
              <>
                <p className="font-medium text-accent text-xs uppercase tracking-wide">
                  Block Party
                </p>
                <h2 className="font-semibold text-lg text-text">
                  Compass is keyboard-only. Ready?
                </h2>
                <p className="text-sm text-text-muted">
                  Your week needs scheduling. Work through the queue of tasks;
                  each card teaches the move as it comes, and nothing here is
                  saved. No clock on your first run.
                </p>
                <div className="flex flex-col gap-1.5 text-sm text-text">
                  <span className="flex items-center gap-2">
                    <ShortcutKeys keys={[...KEYMAP.createEvent.keycaps]} />
                    drops the next piece
                  </span>
                  <span className="flex items-center gap-2">
                    <ShortcutKeys keys={["ArrowLeft", "ArrowDown"]} />
                    move it into the outline
                  </span>
                  <span className="flex items-center gap-2">
                    <ShortcutKeys keys={[...KEYMAP.saveDraft.keycaps]} />
                    locks it in
                  </span>
                </div>
              </>
            ) : (
              <GameTaskQueue
                taskIndex={game.taskIndex}
                nextKeycapIndex={task ? getNextKeycapIndex(task, game) : 0}
              />
            )}
            {skipControls}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            {isRunning && (
              <GameHud
                remainingSeconds={remainingSeconds}
                score={game.score}
                streak={game.streak}
                award={game.lastAward}
                timed={game.timed}
                overtime={Boolean(game.buzzer)}
              />
            )}
            <div className="relative min-h-0 flex-1 rounded-xl border border-border bg-surface p-4 shadow-xl">
              <PracticeCalendar
                state={game.practice}
                targetSlot={ghost}
                flash={flash}
                pulseFocused={pulseFocused}
                jumpLetters={
                  game.jumpChipsShown ? getJumpLetters(game.practice) : null
                }
                jumpTargetId={
                  task?.type === "eventJump" ? task.targetEventId : null
                }
              />
              {game.simOverlay && <GameSimOverlays overlay={game.simOverlay} />}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export const ShortcutShowcase: FC = () => {
  const isActive = useShortcutShowcaseStore(selectShowcaseActive);

  useEffect(() => {
    // A ?play= deep link owns activation (ShowcasePlayLink); resuming too
    // would double-activate the run.
    if (hasPlayDeepLink()) return;
    if (!hasSeenWelcome()) return;
    shortcutShowcaseActions.resumeIfInProgress();
  }, []);

  if (!isActive) return null;
  return <ShowcaseTakeover />;
};
