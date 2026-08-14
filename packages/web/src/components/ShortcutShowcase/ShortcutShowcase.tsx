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
import { PracticeCalendar } from "@web/components/ShortcutShowcase/PracticeCalendar";
import {
  clearFocus,
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
  setEdge,
  toggleHardcore,
  toggleJumpChips,
  undo,
} from "@web/components/ShortcutShowcase/practice.state";
import {
  getShowcaseStep,
  SHOWCASE_STEP_IDS,
  STRETCH_KEYCAPS,
} from "@web/components/ShortcutShowcase/showcase.steps";
import {
  selectShowcaseActive,
  selectShowcaseConfirmingSkip,
  selectShowcaseStepIndex,
  shortcutShowcaseActions,
  stepIdAt,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { useAppLockReason } from "@web/shortcuts/app-lock";
import { isBareLetterKey } from "@web/shortcuts/is-bare-letter-key";
import { KEYMAP } from "@web/shortcuts/keymap";
import { ShortcutTipParts } from "@web/shortcuts/tips/ShortcutTipParts";
import { ARM_WINDOW_MS } from "@web/shortcuts/useEditSequenceShortcut";

const TEXT_BUTTON_CLASS =
  "c-focus-ring rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text";
const PRIMARY_BUTTON_CLASS =
  "c-button c-button-primary rounded-full px-4 py-1.5 text-xs";

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
 */
const ShowcaseTakeover: FC = () => {
  const stepIndex = useShortcutShowcaseStore(selectShowcaseStepIndex);
  const isConfirmingSkip = useShortcutShowcaseStore(
    selectShowcaseConfirmingSkip,
  );
  const stepId = stepIdAt(stepIndex);
  const step = getShowcaseStep(stepId);
  const { closing, beginDismiss } = useDismissTransition(SHOWCASE_REVEAL_MS);
  const closingRef = useRef(false);
  closingRef.current = closing;

  // The takeover owns the keyboard: silence every real app handler
  // (useAppShortcut, the e-sequence, bare-letter s/h) while it is up.
  useAppLockReason("shortcutShowcase", true);

  const graduate = () => {
    beginDismiss(() => shortcutShowcaseActions.finish());
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
  const undoDoneRef = useRef(false);
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

  // Step-entry effects: snapshot for Back, then stage the board so the
  // taught keystroke lands (mirrors the tour's enterDentistMission trick).
  // Layout, not passive: a step advances from inside a keydown handler, so a
  // passive effect would run after the browser is free to deliver the next
  // keystroke. The lesson key would then land in a title editor this effect
  // has not closed yet (silently appending to the title instead of teaching).
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs per step change by design
  useLayoutEffect(() => {
    entrySnapshotsRef.current[stepIndex] ??= practiceRef.current;
    undoDoneRef.current = false;

    // A still-open editor from a previous step would swallow lesson keys.
    // The editor input is uncontrolled, so read the typed text off the DOM.
    if (practiceRef.current.editor && stepId !== "save") {
      const input = document.querySelector<HTMLInputElement>(
        "[data-practice-title-input]",
      );
      apply((state) => commitTitle(state, input?.value ?? ""));
    }

    if (stepId === "moveFocus" || stepId === "editTitle") {
      apply(focusFallback);
    } else if (stepId === "resizeEdge") {
      apply((state) => setEdge(focusFallback(state), "start"));
    } else if (stepId === "placeDraft") {
      apply(clearFocus);
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
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const currentStepId = stepIdAt(store.stepIndex);

      if (store.isConfirmingSkip) {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          shortcutShowcaseActions.skip();
          return;
        }
        // Any other key keeps practicing and still counts as the lesson key.
        shortcutShowcaseActions.cancelSkipConfirm();
      }

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
        // showcase; a reflexive Escape after the confirm was seen would
        // otherwise end the whole practice with no prompt. The editor input
        // is uncontrolled, so the typed text lives in the DOM, not in state.
        if (practiceRef.current.editor) {
          const input = document.querySelector<HTMLInputElement>(
            "[data-practice-title-input]",
          );
          apply((state) => commitTitle(state, input?.value ?? ""));
          return;
        }
        shortcutShowcaseActions.requestSkipConfirm();
        return;
      }

      if (currentStepId === "graduation" && event.key === "Enter") {
        event.preventDefault();
        graduate();
        return;
      }

      // e -> t sequence (arm, then fire within the window).
      if (
        isBareLetterKey(event, KEYMAP.editTitle.sequence.leader) &&
        practiceRef.current.focusedId &&
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
        const next = apply(openTitleEditor);
        if (next.editor && currentStepId === "editTitle") advance();
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
        const typed = jumpBufferRef.current + event.key.toLowerCase();
        if (hints.includes(typed)) {
          jumpBufferRef.current = "";
          apply((state) => jumpToChipHint(state, typed));
          if (currentStepId === "eventJump") advance();
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
        const next = apply(toggleHardcore);
        if (currentStepId === "hardcore" && next.hardcoreOn) advance();
        return;
      }

      if (isBareLetterKey(event, KEYMAP.createEvent.hotkey.toLowerCase())) {
        event.preventDefault();
        const next = apply(createDraft);
        if (next.editor?.isNew && currentStepId === "create") advance();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        const before = practiceRef.current;
        if (event.shiftKey) {
          const next = apply(redo);
          if (
            currentStepId === "undoRedo" &&
            undoDoneRef.current &&
            next !== before
          ) {
            advance();
          }
        } else {
          const next = apply(undo);
          if (next !== before) undoDoneRef.current = true;
        }
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
          const next = apply((state) => resizeFocusedEdge(state, direction));
          if (
            currentStepId === "resizeEdge" &&
            before.edge === "end" &&
            next !== before
          ) {
            advance();
          }
        } else if (before.focusedId) {
          const next = apply((state) => moveFocusedEvent(state, direction));
          if (currentStepId === "moveEvent" && next !== before) advance();
        } else {
          apply(placeDraft);
          if (currentStepId === "placeDraft") advance();
        }
      } else {
        const next = apply((state) => moveFocus(state, direction));
        if (
          currentStepId === "moveFocus" &&
          before.focusedId &&
          next.focusedId !== before.focusedId
        ) {
          advance();
        }
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
      case "moveFocus":
        apply((state) => {
          const next = moveFocus(state, "right");
          return next !== state ? next : moveFocus(state, "left");
        });
        break;
      case "editTitle":
        apply((state) => openTitleEditor(focusFallback(state)));
        break;
      case "eventJump":
        apply((state) => {
          const withChips = state.jumpChips ? state : toggleJumpChips(state);
          const entries = Object.entries(withChips.jumpChips ?? {});
          const target =
            entries.find(([id]) => id !== withChips.focusedId) ?? entries[0];
          return target ? jumpToChipHint(withChips, target[1]) : withChips;
        });
        break;
      case "moveEvent":
        apply((state) => moveFocusedEvent(focusFallback(state), "down"));
        break;
      case "resizeEdge":
        apply((state) =>
          resizeFocusedEdge(setEdge(focusFallback(state), "end"), "down"),
        );
        break;
      case "placeDraft":
        apply(placeDraft);
        break;
      case "undoRedo":
        apply(undo);
        apply(redo);
        break;
      case "hardcore":
        apply((state) => (state.hardcoreOn ? state : toggleHardcore(state)));
        break;
    }
    advance();
  };

  const progressPercent = ((stepIndex + 1) / SHOWCASE_STEP_IDS.length) * 100;
  // The stretch lesson teaches Tab first, then the chord, so it hints one
  // press at a time rather than showing all three keys at once.
  const isStretchPhase = stepId === "resizeEdge" && practice.edge === "end";
  const keycaps = isStretchPhase ? STRETCH_KEYCAPS : step.keycaps;

  return (
    <section
      aria-label="Shortcut practice"
      className="fixed inset-0 flex items-center justify-center bg-background transition-opacity duration-500 ease-out data-closing:opacity-0 motion-reduce:transition-none"
      data-closing={closing || undefined}
      data-onboarding-ui=""
      style={{ zIndex: Z_INDEX_MODAL }}
    >
      <div className="flex h-[80vh] max-h-160 w-full max-w-5xl gap-8 px-8 transition-[opacity,transform] duration-500 ease-out data-closing:scale-95 data-closing:opacity-0 motion-reduce:transition-none">
        <aside className="flex w-80 shrink-0 flex-col justify-center gap-4">
          {isConfirmingSkip ? (
            <>
              <h2 className="font-semibold text-lg text-text">
                Skip the shortcuts?
              </h2>
              <p className="text-sm text-text-muted">
                Compass is built around these shortcuts. Without them, it's just
                another calendar app.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={PRIMARY_BUTTON_CLASS}
                  onClick={shortcutShowcaseActions.cancelSkipConfirm}
                >
                  Keep practicing
                </button>
                <button
                  type="button"
                  className={TEXT_BUTTON_CLASS}
                  onClick={shortcutShowcaseActions.skip}
                >
                  Skip anyway
                </button>
              </div>
            </>
          ) : (
            <>
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
              {keycaps && <ShortcutKeys keys={[...keycaps]} />}
              <div className="flex items-center gap-2 pt-2">
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
                  <button
                    type="button"
                    className={PRIMARY_BUTTON_CLASS}
                    onClick={doItForMe}
                  >
                    Do it for me
                  </button>
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
                    onClick={shortcutShowcaseActions.requestSkipConfirm}
                  >
                    Skip
                  </button>
                )}
              </div>
            </>
          )}
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
