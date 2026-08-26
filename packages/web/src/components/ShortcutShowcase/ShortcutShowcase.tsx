import { resolveModifier } from "@tanstack/react-hotkeys";
import {
  type FC,
  type KeyboardEvent as ReactKeyboardEvent,
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
import { getFocusableElements } from "@web/common/utils/focusable-elements";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { PracticeCalendar } from "@web/components/ShortcutShowcase/PracticeCalendar";
import { PracticePalette } from "@web/components/ShortcutShowcase/PracticePalette";
import {
  armEdit,
  commitTitle,
  createDraft,
  disarmEdit,
  ensureFocused,
  initialPracticeState,
  jumpToEvent,
  nudgeFocused,
  openTitleFromEdit,
  PRACTICE_TEAM_SYNC_ID,
  type PracticeNudgeDirection,
  type PracticeState,
  toggleJumpHints,
} from "@web/components/ShortcutShowcase/practice.state";
import {
  getCreateLessonPhase,
  getLevelLabel,
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
import { getNotificationPort } from "@web/notifications/notification.port";
import { notificationActions } from "@web/notifications/notification.store";
import { settingsActions } from "@web/settings/settings.store";
import { useAppLockReason } from "@web/shortcuts/app-lock";
import {
  isBareLetterKey,
  keyboardKey,
} from "@web/shortcuts/is-bare-letter-key";
import { KEYMAP } from "@web/shortcuts/keymap";
import { ShortcutTipParts } from "@web/shortcuts/tips/ShortcutTipParts";

const TEXT_BUTTON_CLASS =
  "c-focus-ring inline-flex items-center gap-2 rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text";
const PRIMARY_BUTTON_CLASS =
  "c-button c-button-primary inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs";
const SECONDARY_BUTTON_CLASS =
  "c-button c-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs";

const isPlatformModKey = (event: KeyboardEvent) =>
  resolveModifier("Mod") === "Meta"
    ? event.key === "Meta"
    : event.key === "Control";

const arrowDirection = (key: string): PracticeNudgeDirection | null => {
  if (key === "ArrowUp") return "up";
  if (key === "ArrowDown") return "down";
  if (key === "ArrowLeft") return "left";
  if (key === "ArrowRight") return "right";
  return null;
};

/**
 * Full-screen practice arena shown before a new user ever sees the real
 * calendar. Bindings come from KEYMAP (shared with the real handlers);
 * behavior is a deliberately simplified reimplementation against ephemeral
 * practice state, so nothing here touches storage or the real grid stores.
 *
 * Levels teach create, hold-Mod jumps, event jump, nudge, the E-then-T
 * edit sequence, and Cmd+K; graduation hands off to a prompt on the real
 * calendar. Skip is always offered.
 */
const ShowcaseTakeover: FC = () => {
  const stepIndex = useShortcutShowcaseStore(selectShowcaseStepIndex);
  const stepId = stepIdAt(stepIndex);
  const { closing, beginDismiss } = useDismissTransition(SHOWCASE_REVEAL_MS);
  const closingRef = useRef(false);
  closingRef.current = closing;
  const { openModal } = useAuthModal();
  const { authenticated } = useContext(SessionContext);
  const [isModHeld, setIsModHeld] = useState(false);
  const hasRevealedJumpsRef = useRef(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteOpenRef = useRef(false);
  paletteOpenRef.current = paletteOpen;

  useAppLockReason("shortcutShowcase", true);

  const graduate = () => {
    shortcutShowcaseActions.markSeen();
    beginDismiss(() => shortcutShowcaseActions.finish());
  };
  const graduateRef = useRef(graduate);
  graduateRef.current = graduate;

  const skipToSignup = () => {
    shortcutShowcaseActions.skip("signup");
    track("signup_started", { source: "shortcut_showcase" });
    openModal("signUp");
  };

  const regionRef = useRef<HTMLElement>(null);

  const handleTakeoverKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !regionRef.current) return;
    const root = regionRef.current;
    const focusables = getFocusableElements(root);
    if (focusables.length === 0) return;
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
      const id = stepIdAt(useShortcutShowcaseStore.getState().stepIndex);
      if (id === "create" || id === "editTitle") {
        advance();
      }
    },
    [apply],
  );

  const seatFocus = useCallback(() => {
    const root = regionRef.current;
    if (!root || closingRef.current) return;
    if (root.contains(document.activeElement)) return;
    const [firstFocusable] = getFocusableElements(root);
    (firstFocusable ?? root).focus();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: stepId and practice.editor trigger a reseat after lesson chrome unmounts; seatFocus does not read them.
  useEffect(() => {
    seatFocus();
  }, [seatFocus, stepId, practice.editor, paletteOpen]);

  useEffect(() => {
    const claim = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const store = useShortcutShowcaseStore.getState();
      if (!store.isActive) return;
      if (closingRef.current) {
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      const currentStepId = stepIdAt(store.stepIndex);

      if (isPlatformModKey(event)) {
        setIsModHeld(true);
        if (currentStepId === "pageJump") {
          hasRevealedJumpsRef.current = true;
        }
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("[data-practice-title-input]") &&
        event.key !== "Escape"
      ) {
        return;
      }

      if (event.key === "Escape") {
        claim(event);
        settingsActions.closeCmdPalette();
        if (paletteOpenRef.current) {
          setPaletteOpen(false);
          return;
        }
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

      const isModChord = event.metaKey || event.ctrlKey;
      if (isModChord && keyboardKey(event).toLowerCase() === "k") {
        claim(event);
        if (currentStepId === "palette" && !paletteOpenRef.current) {
          setPaletteOpen(true);
        }
        return;
      }

      if (paletteOpenRef.current) {
        if (event.key === "Enter") {
          claim(event);
          setPaletteOpen(false);
          if (currentStepId === "palette") advance();
        }
        return;
      }

      if (currentStepId === "graduation" && event.key === "Enter") {
        claim(event);
        graduateRef.current();
        return;
      }

      // The notifications offer: Enter allows, N passes. Both move on.
      if (currentStepId === "notifications") {
        // Unlike graduation, this step renders several buttons, so Enter is
        // the step's shortcut only when no button owns it - otherwise
        // "Not now" and "Skip" would raise a permission prompt
        // instead of doing what they say. Auto-repeat is ignored too: the
        // Enter that committed a practice title must not carry into the
        // offer once the input unmounts.
        const focusedButton =
          event.target instanceof HTMLElement && event.target.closest("button");
        if (
          event.key === "Enter" &&
          !event.repeat &&
          !focusedButton &&
          sideActionsRef.current.notificationsSupported
        ) {
          claim(event);
          sideActionsRef.current.enableNotifications();
          return;
        }
        if (isBareLetterKey(event, "n")) {
          claim(event);
          shortcutShowcaseActions.advance();
          return;
        }
      }

      if (currentStepId === "pageJump") {
        const digit = /^Digit([12])$/.exec(event.code);
        if (digit && hasRevealedJumpsRef.current) {
          claim(event);
          advance();
          return;
        }
      }

      if (currentStepId === "nudge") {
        const direction = arrowDirection(event.key);
        if (event.shiftKey && direction) {
          claim(event);
          const before = practiceRef.current;
          const next = apply((state) => nudgeFocused(state, direction));
          if (next !== before) advance();
          return;
        }
      }

      // Every other non-graduation step teaches the board; the notifications
      // offer does not, so C must not open a practice draft behind it.
      if (
        currentStepId !== "notifications" &&
        isBareLetterKey(event, KEYMAP.createEvent.hotkey.toLowerCase())
      ) {
        claim(event);
        apply(createDraft);
        return;
      }

      if (currentStepId === "eventJump") {
        if (isBareLetterKey(event, KEYMAP.eventJump.bareLetter)) {
          claim(event);
          apply(toggleJumpHints);
          return;
        }
        const jumpKey = keyboardKey(event).toLowerCase();
        if (jumpKey.length === 1 && practiceRef.current.jumpHintsVisible) {
          const before = practiceRef.current;
          const next = apply((state) => jumpToEvent(state, jumpKey));
          if (next !== before) {
            claim(event);
            advance();
            return;
          }
        }
      }

      if (currentStepId === "editTitle") {
        if (isBareLetterKey(event, KEYMAP.editTitle.sequence.leader)) {
          claim(event);
          apply(armEdit);
          return;
        }
        if (
          practiceRef.current.editArmed &&
          isBareLetterKey(event, KEYMAP.editTitle.sequence.second)
        ) {
          claim(event);
          apply(openTitleFromEdit);
          return;
        }
        if (practiceRef.current.editArmed && event.key.length === 1) {
          apply(disarmEdit);
        }
      }

      if (currentStepId !== "graduation") {
        // U is a practice affordance: the notifications offer has no
        // board action to perform, and no lesson to skip past. Esc leaves.
        if (
          currentStepId !== "notifications" &&
          isBareLetterKey(event, "u") &&
          !sideActionsRef.current.authenticated
        ) {
          claim(event);
          sideActionsRef.current.skipToSignup();
        }
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (isPlatformModKey(event)) setIsModHeld(false);
    };
    const clearMod = () => setIsModHeld(false);

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", clearMod);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", clearMod);
    };
  }, [apply]);

  const runPracticeCommand = () => {
    apply((state) => ({
      ...ensureFocused(state),
      focusedId: PRACTICE_TEAM_SYNC_ID,
    }));
    setPaletteOpen(false);
    if (stepId === "palette") advance();
  };

  const notificationsSupported = getNotificationPort().isSupported();
  const offerTakenRef = useRef(false);
  // A browser prompt stays up until the user answers it, and some never get
  // answered - so say so on the button rather than letting it look live.
  const [offerPending, setOfferPending] = useState(false);

  // The offer moves on either way: a denial is explained by the toast, and
  // holding the user here would turn a one-key offer into a decision to make.
  const enableNotifications = () => {
    if (offerTakenRef.current) return;
    offerTakenRef.current = true;
    setOfferPending(true);
    void notificationActions.enable("showcase").finally(() => {
      setOfferPending(false);
      // Only advance if the offer is still what's on screen: passing on it or
      // leaving while the prompt was up already moved the user along, and a
      // second advance from graduation would close the showcase outright.
      const { stepIndex: current } = useShortcutShowcaseStore.getState();
      if (stepIdAt(current) !== "notifications") return;
      advance();
    });
  };

  const sideActionsRef = useRef({
    skipToSignup,
    authenticated,
    enableNotifications,
    notificationsSupported,
  });
  sideActionsRef.current = {
    skipToSignup,
    authenticated,
    enableNotifications,
    notificationsSupported,
  };

  const step =
    stepId === "create"
      ? {
          ...getShowcaseStep("create"),
          ...getCreateLessonPhase(Boolean(practice.editor)),
        }
      : getShowcaseStep(stepId);

  const levelLabel = getLevelLabel(stepId);
  const showPageJumpHints = isModHeld && stepId === "pageJump";

  return (
    <section
      ref={regionRef}
      aria-label="Shortcut practice"
      className={`fixed inset-0 flex items-center justify-center bg-background ${closing ? "c-showcase-curtain" : ""}`}
      data-closing={closing || undefined}
      onKeyDown={handleTakeoverKeyDown}
      style={{ zIndex: Z_INDEX_MODAL }}
      tabIndex={-1}
    >
      <div
        className={`flex h-[80vh] max-h-160 w-full max-w-5xl gap-8 px-8 ${closing ? "c-showcase-enter-stage" : ""}`}
      >
        <aside className="flex w-80 shrink-0 flex-col justify-center gap-4">
          {levelLabel && (
            <p className="font-medium text-accent text-xs uppercase tracking-wide">
              {levelLabel}
            </p>
          )}
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={PRIMARY_BUTTON_CLASS}
                  disabled={closing}
                  onClick={graduate}
                >
                  See your calendar
                </button>
                <ShortcutHint className="shrink-0">Enter</ShortcutHint>
              </div>
            ) : stepId === "notifications" ? (
              <>
                {notificationsSupported ? (
                  <button
                    type="button"
                    className={PRIMARY_BUTTON_CLASS}
                    disabled={offerPending}
                    onClick={enableNotifications}
                  >
                    Enable notifications
                    <ShortcutHint className="shrink-0">Enter</ShortcutHint>
                  </button>
                ) : (
                  <span className="text-text-muted text-xs">
                    Not supported in this browser
                  </span>
                )}
                <button
                  type="button"
                  className={SECONDARY_BUTTON_CLASS}
                  onClick={advance}
                >
                  Not now
                  <ShortcutHint className="shrink-0">N</ShortcutHint>
                </button>
              </>
            ) : (
              !authenticated && (
                <button
                  type="button"
                  className={SECONDARY_BUTTON_CLASS}
                  onClick={skipToSignup}
                >
                  Skip to sign up
                  <ShortcutHint className="shrink-0">U</ShortcutHint>
                </button>
              )
            )}
            {stepId !== "graduation" && (
              <button
                type="button"
                className={TEXT_BUTTON_CLASS}
                onClick={() => shortcutShowcaseActions.skip()}
              >
                Skip
                <ShortcutHint className="shrink-0">Esc</ShortcutHint>
              </button>
            )}
          </div>
        </aside>
        <div className="relative min-w-0 flex-1 rounded-xl border border-border bg-surface p-4 shadow-xl">
          {paletteOpen && <PracticePalette onRun={runPracticeCommand} />}
          <PracticeCalendar
            state={practice}
            onTitleCommit={handleTitleCommit}
            showPageJumpHints={showPageJumpHints}
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
