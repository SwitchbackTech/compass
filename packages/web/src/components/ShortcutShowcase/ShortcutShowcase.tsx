import {
  type FC,
  useCallback,
  useContext,
  useEffect,
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
  getCreateLessonPhase,
  getShowcaseStep,
} from "@web/components/ShortcutShowcase/showcase.steps";
import {
  selectShowcaseActive,
  selectShowcaseStepIndex,
  shortcutShowcaseActions,
  stepIdAt,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
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
 * One lesson, taught as one continuous motion (create.steps.ts explains why);
 * graduation hands off to a prompt on the real calendar, not a checklist.
 */
const ShowcaseTakeover: FC = () => {
  const stepIndex = useShortcutShowcaseStore(selectShowcaseStepIndex);
  const stepId = stepIdAt(stepIndex);
  const { closing, beginDismiss } = useDismissTransition(SHOWCASE_REVEAL_MS);
  const closingRef = useRef(false);
  closingRef.current = closing;
  const { openModal } = useAuthModal();
  // Post-signup is now the showcase's main entry, and "sign up" is not an exit
  // for someone who just did.
  const { authenticated } = useContext(SessionContext);

  // The takeover owns the keyboard: silence every real app handler
  // (useAppShortcut, the e-sequence, bare letters s/f/m) while it is up.
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

  const advance = shortcutShowcaseActions.advance;

  const handleTitleCommit = useCallback(
    (title: string) => {
      apply((state) => commitTitle(state, title));
      if (
        stepIdAt(useShortcutShowcaseStore.getState().stepIndex) === "create"
      ) {
        advance();
      }
    },
    [apply],
  );

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
        // Create never advances by itself: the lesson advances on title
        // commit, so C -> type -> Enter reads as one motion, not two steps.
        apply(createDraft);
        return;
      }

      // Side actions, letter-bound so the practice screen never needs a
      // mouse. Only outside graduation - there Enter is the single action.
      if (currentStepId !== "graduation") {
        if (isBareLetterKey(event, "d")) {
          event.preventDefault();
          sideActionsRef.current.doItForMe();
          return;
        }
        if (
          isBareLetterKey(event, "s") &&
          !sideActionsRef.current.authenticated
        ) {
          event.preventDefault();
          sideActionsRef.current.skipToSignup();
          return;
        }
        if (isBareLetterKey(event, "x")) {
          event.preventDefault();
          shortcutShowcaseActions.skip();
          return;
        }
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [apply]);

  // Performs the lesson's action on the practice board, then moves on.
  const doItForMe = () => {
    track("shortcut_showcase_assist_used", { step: stepId });
    if (stepId === "create") {
      apply(createDraft);
      apply((state) => commitTitle(state, "Coffee with Alex"));
    }
    advance();
  };

  // Side-action letters for the capture listener; refs because the listener
  // mounts once (same pattern as graduateRef).
  const sideActionsRef = useRef({ doItForMe, skipToSignup, authenticated });
  sideActionsRef.current = { doItForMe, skipToSignup, authenticated };

  const step =
    stepId === "create"
      ? {
          ...getShowcaseStep("create"),
          ...getCreateLessonPhase(Boolean(practice.editor)),
        }
      : getShowcaseStep("graduation");

  return (
    <section
      aria-label="Shortcut practice"
      className={`fixed inset-0 flex items-center justify-center bg-background ${closing ? "c-showcase-curtain" : ""}`}
      data-closing={closing || undefined}
      style={{ zIndex: Z_INDEX_MODAL }}
    >
      <div
        className={`flex h-[80vh] max-h-160 w-full max-w-5xl gap-8 px-8 ${closing ? "c-showcase-enter-stage" : ""}`}
      >
        <aside className="flex w-80 shrink-0 flex-col justify-center gap-4">
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
                Enter Compass <ShortcutHint>Enter</ShortcutHint>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={PRIMARY_BUTTON_CLASS}
                  onClick={doItForMe}
                >
                  Do it for me <ShortcutHint>D</ShortcutHint>
                </button>
                {!authenticated && (
                  <button
                    type="button"
                    className={SECONDARY_BUTTON_CLASS}
                    onClick={skipToSignup}
                  >
                    Skip to sign up <ShortcutHint>S</ShortcutHint>
                  </button>
                )}
              </>
            )}
            {stepId !== "graduation" && (
              <button
                type="button"
                className={TEXT_BUTTON_CLASS}
                onClick={() => shortcutShowcaseActions.skip()}
              >
                Skip to calendar <ShortcutHint>X</ShortcutHint>
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
