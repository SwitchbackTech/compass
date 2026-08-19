import {
  type FC,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { track } from "@web/auth/posthog/track";
import { SHOWCASE_REVEAL_MS } from "@web/common/constants/motion.constants";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { PracticeCalendar } from "@web/components/ShortcutShowcase/PracticeCalendar";
import {
  commitTitle,
  createDraft,
  initialPracticeState,
  type PracticeState,
} from "@web/components/ShortcutShowcase/practice.state";
import {
  getShowcaseStep,
  SHOWCASE_STEP_IDS,
} from "@web/components/ShortcutShowcase/showcase.steps";
import {
  selectShowcaseActive,
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

const TEXT_BUTTON_CLASS =
  "c-focus-ring rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text";
const PRIMARY_BUTTON_CLASS =
  "c-button c-button-primary rounded-full px-4 py-1.5 text-xs";
const SECONDARY_BUTTON_CLASS =
  "c-button c-button-secondary rounded-full px-4 py-1.5 text-xs";

/**
 * Full-screen practice arena shown before a new user ever sees the real
 * calendar. Bindings come from KEYMAP (shared with the real handlers);
 * behavior is a deliberately simplified reimplementation against ephemeral
 * practice state, so nothing here touches storage or the real grid stores.
 *
 * Only the two gating lessons (see showcase.steps.ts) are interactive; the
 * checklist re-teaches the rest on real events after graduation.
 */
const ShowcaseTakeover: FC = () => {
  const stepIndex = useShortcutShowcaseStore(selectShowcaseStepIndex);
  const stepId = stepIdAt(stepIndex);
  const step = getShowcaseStep(stepId);
  const { closing, beginDismiss } = useDismissTransition(SHOWCASE_REVEAL_MS);
  const closingRef = useRef(false);
  closingRef.current = closing;
  const { openModal } = useAuthModal();
  // Post-signup is now the showcase's main entry, and "sign up" is not an exit
  // for someone who just did.
  const { authenticated } = useContext(SessionContext);

  // The takeover owns the keyboard: silence every real app handler
  // (useAppShortcut, the e-sequence, bare-letter s/h) while it is up.
  useAppLockReason("shortcutShowcase", true);

  const graduate = () => {
    // Persist before the curtain so a reload during the reveal does not
    // relaunch the takeover. finish() marks seen again when it unmounts.
    shortcutShowcaseActions.markSeen();
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

      if (isBareLetterKey(event, KEYMAP.createEvent.hotkey.toLowerCase())) {
        event.preventDefault();
        const next = apply(createDraft);
        if (next.editor?.isNew && currentStepId === "create") advance();
        return;
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
                {!authenticated && (
                  <button
                    type="button"
                    className={SECONDARY_BUTTON_CLASS}
                    onClick={skipToSignup}
                  >
                    Skip to sign up
                  </button>
                )}
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
