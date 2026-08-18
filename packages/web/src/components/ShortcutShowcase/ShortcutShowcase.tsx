import {
  type FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { track } from "@web/auth/posthog/track";
import { SHOWCASE_REVEAL_MS } from "@web/common/constants/motion.constants";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { PracticeCalendar } from "@web/components/ShortcutShowcase/PracticeCalendar";
import {
  commitTitle,
  createDraft,
  cycleEdge,
  focusFallback,
  initialPracticeState,
  jumpToChipHint,
  moveFocus,
  moveFocusedEvent,
  openTitleEditor,
  type PracticeDirection,
  type PracticeState,
  placeDraft,
  redo,
  resizeFocusedEdge,
  toggleHardcore,
  toggleJumpChips,
  undo,
} from "@web/components/ShortcutShowcase/practice.state";
import {
  getShowcaseStep,
  SHOWCASE_STEP_IDS,
} from "@web/components/ShortcutShowcase/showcase.steps";
import { markShortcutShowcaseSeen } from "@web/components/ShortcutShowcase/showcase.storage";
import {
  selectShowcaseActive,
  selectShowcaseStepIndex,
  shortcutShowcaseActions,
  stepIdAt,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { useAppLockReason } from "@web/shortcuts/app-lock";
import {
  isBareLetterKey,
  keyboardKey,
} from "@web/shortcuts/is-bare-letter-key";
import { KEYMAP } from "@web/shortcuts/keymap";
import { ShortcutTipParts } from "@web/shortcuts/tips/ShortcutTipParts";
import { ARM_WINDOW_MS } from "@web/shortcuts/useEditSequenceShortcut";

const TEXT_BUTTON_CLASS =
  "c-focus-ring rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text";
const PRIMARY_BUTTON_CLASS =
  "c-button c-button-primary rounded-full px-4 py-1.5 text-xs";
const SECONDARY_BUTTON_CLASS =
  "c-button c-button-secondary rounded-full px-4 py-1.5 text-xs";

const ARROW_DIRECTIONS: Record<string, PracticeDirection> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/**
 * Full-screen practice arena shown before a new user ever sees the real
 * calendar. Bindings come from KEYMAP (shared with the real handlers);
 * behavior is a deliberately simplified reimplementation against ephemeral
 * practice state, so nothing here touches storage or the real grid stores.
 *
 * Two lessons gate the exit (see showcase.steps.ts), but every shortcut the
 * arena ever answered still works here for anyone who wants to poke around.
 */
const ShowcaseTakeover: FC = () => {
  const stepIndex = useShortcutShowcaseStore(selectShowcaseStepIndex);
  const stepId = stepIdAt(stepIndex);
  const step = getShowcaseStep(stepId);
  const { closing, beginDismiss } = useDismissTransition(SHOWCASE_REVEAL_MS);
  const closingRef = useRef(false);
  closingRef.current = closing;
  const { openModal } = useAuthModal();

  // The takeover owns the keyboard: silence every real app handler
  // (useAppShortcut, the e-sequence, bare-letter s/h) while it is up.
  useAppLockReason("shortcutShowcase", true);

  const graduate = () => {
    // Persist before the curtain so a reload during the reveal does not
    // relaunch the takeover. finish() marks seen again when it unmounts.
    markShortcutShowcaseSeen();
    beginDismiss(() => shortcutShowcaseActions.finish());
  };
  const graduateRef = useRef(graduate);
  graduateRef.current = graduate;

  // The showcase is the last thing between a curious visitor and the flow that
  // actually matters, so it always offers the door rather than guarding it.
  const skipToSignup = () => {
    shortcutShowcaseActions.skip("signup");
    track("signup_started", { source: "shortcut_showcase" });
    openModal("signUp");
  };

  const [practice, setPractice] = useState(initialPracticeState);
  const practiceRef = useRef(practice);
  const apply = useCallback(
    (transition: (state: PracticeState) => PracticeState): PracticeState => {
      const next = transition(practiceRef.current);
      practiceRef.current = next;
      setPractice(next);
      return next;
    },
    [],
  );

  // Practice state at each step's entry, so Back can restore and redo.
  const entrySnapshotsRef = useRef<Record<number, PracticeState>>({});
  const editSequenceArmedUntilRef = useRef(0);
  // Typed-so-far jump key while the S chips are showing ("t" awaiting "t1").
  const jumpBufferRef = useRef("");

  const advance = shortcutShowcaseActions.advance;

  const handleTitleCommit = useCallback(
    (title: string) => {
      apply((state) => commitTitle(state, title));
      if (stepIdAt(useShortcutShowcaseStore.getState().stepIndex) === "save") {
        advance();
      }
    },
    [apply],
  );

  // Step-entry effects: snapshot for Back, then close any editor left open by
  // the previous step. Layout, not passive: a step advances from inside a
  // keydown handler, so a passive effect would run after the browser is free
  // to deliver the next keystroke. The lesson key would then land in a title
  // editor this effect has not closed yet (silently appending to the title
  // instead of teaching).
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs per step change by design
  useLayoutEffect(() => {
    entrySnapshotsRef.current[stepIndex] ??= practiceRef.current;

    // The editor input is uncontrolled, so read the typed text off the DOM.
    if (practiceRef.current.editor && stepId !== "save") {
      const input = document.querySelector<HTMLInputElement>(
        "[data-practice-title-input]",
      );
      apply((state) => commitTitle(state, input?.value ?? ""));
    }
  }, [stepIndex]);

  const goBack = () => {
    const snapshot = entrySnapshotsRef.current[stepIndex - 1];
    if (snapshot) {
      practiceRef.current = snapshot;
      setPractice(snapshot);
    }
    // Later entries are stale once the board rewinds.
    for (const key of Object.keys(entrySnapshotsRef.current)) {
      if (Number(key) >= stepIndex) delete entrySnapshotsRef.current[+key];
    }
    shortcutShowcaseActions.back();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const store = useShortcutShowcaseStore.getState();
      if (!store.isActive) return;
      if (closingRef.current) {
        event.stopPropagation();
        return;
      }
      const currentStepId = stepIdAt(store.stepIndex);

      // Let the title editor own typing; only Escape passes through it.
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("[data-practice-title-input]") &&
        event.key !== "Escape"
      ) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        // Escape inside the title editor closes the editor, never the
        // showcase. The editor input is uncontrolled, so the typed text lives
        // in the DOM, not in state.
        if (practiceRef.current.editor) {
          const input = document.querySelector<HTMLInputElement>(
            "[data-practice-title-input]",
          );
          apply((state) => commitTitle(state, input?.value ?? ""));
          return;
        }
        shortcutShowcaseActions.skip();
        return;
      }

      if (currentStepId === "graduation" && event.key === "Enter") {
        event.preventDefault();
        graduateRef.current();
        return;
      }

      // e -> t sequence (arm, then fire within the window).
      if (
        isBareLetterKey(event, KEYMAP.editTitle.sequence.leader) &&
        !practiceRef.current.editor
      ) {
        editSequenceArmedUntilRef.current = Date.now() + ARM_WINDOW_MS;
        event.preventDefault();
        return;
      }
      if (
        editSequenceArmedUntilRef.current > Date.now() &&
        isBareLetterKey(event, KEYMAP.editTitle.sequence.second)
      ) {
        editSequenceArmedUntilRef.current = 0;
        event.preventDefault();
        // No lesson seats focus any more, so the chord picks a block itself
        // rather than silently doing nothing on a cold board.
        apply((state) => openTitleEditor(focusFallback(state)));
        return;
      }

      // A second S closes the chips (matching the real toggle), unless S
      // could still start a hint (never true for the Mon-Wed practice days).
      if (
        practiceRef.current.jumpChips &&
        jumpBufferRef.current === "" &&
        isBareLetterKey(event, KEYMAP.eventJump.bareLetter) &&
        !Object.values(practiceRef.current.jumpChips).some((hint) =>
          hint.startsWith(KEYMAP.eventJump.bareLetter),
        )
      ) {
        event.preventDefault();
        apply(toggleJumpChips);
        return;
      }

      // Jump chips are a key-capture mode while visible: hints are the real
      // day-prefix labels ("m1", "t2"), so collect typed characters until
      // they exactly match one, keep collecting while a prefix still can,
      // and reset on a dead end.
      if (
        practiceRef.current.jumpChips &&
        /^[a-z0-9]$/i.test(event.key) &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        const hints = Object.values(practiceRef.current.jumpChips);
        const typed = jumpBufferRef.current + keyboardKey(event).toLowerCase();
        if (hints.includes(typed)) {
          jumpBufferRef.current = "";
          apply((state) => jumpToChipHint(state, typed));
        } else if (hints.some((hint) => hint.startsWith(typed))) {
          jumpBufferRef.current = typed;
        } else {
          jumpBufferRef.current = "";
        }
        return;
      }

      if (isBareLetterKey(event, KEYMAP.eventJump.bareLetter)) {
        event.preventDefault();
        jumpBufferRef.current = "";
        apply(toggleJumpChips);
        return;
      }

      if (isBareLetterKey(event, KEYMAP.hardcore.bareLetter)) {
        event.preventDefault();
        apply(toggleHardcore);
        return;
      }

      if (isBareLetterKey(event, KEYMAP.createEvent.hotkey.toLowerCase())) {
        event.preventDefault();
        const next = apply(createDraft);
        if (next.editor?.isNew && currentStepId === "create") advance();
        return;
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        keyboardKey(event).toLowerCase() === "z"
      ) {
        event.preventDefault();
        apply(event.shiftKey ? redo : undo);
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        apply(cycleEdge);
        return;
      }

      const direction = ARROW_DIRECTIONS[event.key];
      if (!direction || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      const before = practiceRef.current;
      if (event.shiftKey) {
        if (before.edge && before.focusedId) {
          apply((state) => resizeFocusedEdge(state, direction));
        } else if (before.focusedId) {
          apply((state) => moveFocusedEvent(state, direction));
        } else {
          apply(placeDraft);
        }
      } else {
        apply((state) => moveFocus(state, direction));
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [apply]);

  // Performs the lesson's action on the practice board, then moves on.
  const doItForMe = () => {
    track("shortcut_showcase_assist_used", { step: stepId });
    switch (stepId) {
      case "create":
        apply(createDraft);
        break;
      case "save":
        apply((state) => commitTitle(state, "Coffee with Alex"));
        break;
    }
    advance();
  };

  const progressPercent = ((stepIndex + 1) / SHOWCASE_STEP_IDS.length) * 100;

  return (
    <section
      aria-label="Shortcut practice"
      className={`fixed inset-0 flex items-center justify-center bg-background ${closing ? "c-showcase-curtain" : ""}`}
      data-closing={closing || undefined}
      data-onboarding-ui=""
      style={{ zIndex: Z_INDEX_MODAL }}
    >
      <div
        className={`flex h-[80vh] max-h-160 w-full max-w-5xl gap-8 px-8 ${closing ? "c-showcase-enter-stage" : ""}`}
      >
        <aside className="flex w-80 shrink-0 flex-col justify-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-text-muted text-xs">
              Step {stepIndex + 1} of {SHOWCASE_STEP_IDS.length}
            </span>
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface-overlay">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <h2 className="font-semibold text-lg text-text">{step.title}</h2>
          <p className="text-sm text-text-muted">
            {typeof step.body === "string" ? (
              step.body
            ) : (
              <ShortcutTipParts parts={step.body} />
            )}
          </p>
          {step.keycaps && <ShortcutKeys keys={[...step.keycaps]} />}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {stepId === "graduation" ? (
              <button
                type="button"
                className={PRIMARY_BUTTON_CLASS}
                disabled={closing}
                onClick={graduate}
              >
                Enter Compass
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={PRIMARY_BUTTON_CLASS}
                  onClick={doItForMe}
                >
                  Do it for me
                </button>
                <button
                  type="button"
                  className={SECONDARY_BUTTON_CLASS}
                  onClick={skipToSignup}
                >
                  Skip to sign up
                </button>
              </>
            )}
            {stepIndex > 0 && stepId !== "graduation" && (
              <button
                type="button"
                className={TEXT_BUTTON_CLASS}
                onClick={goBack}
              >
                Previous
              </button>
            )}
            {stepId !== "graduation" && (
              <button
                type="button"
                className={TEXT_BUTTON_CLASS}
                onClick={() => shortcutShowcaseActions.skip()}
              >
                Skip to calendar
              </button>
            )}
          </div>
        </aside>
        <div className="min-w-0 flex-1 rounded-xl border border-border bg-surface p-4 shadow-xl">
          <PracticeCalendar
            state={practice}
            onTitleCommit={handleTitleCommit}
          />
        </div>
      </div>
    </section>
  );
};

export const ShortcutShowcase: FC = () => {
  const isActive = useShortcutShowcaseStore(selectShowcaseActive);
  if (!isActive) return null;
  return <ShowcaseTakeover />;
};
