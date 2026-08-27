import { resolveModifier } from "@tanstack/react-hotkeys";
import {
  type FC,
  type KeyboardEvent as ReactKeyboardEvent,
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
  toggleJumpHints,
} from "@web/components/ShortcutShowcase/practice.state";
import {
  getCreateLessonPhase,
  getShowcaseStep,
  SHOWCASE_LEVEL_IDS,
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
 * An unnumbered intro gates first-time entry, then levels teach create,
 * hold-Mod jumps, event jump, nudge, the E-then-T edit sequence, and Cmd+K.
 * Graduation hands off to a prompt on the real calendar. Skip is always
 * offered.
 */
const ShowcaseTakeover: FC = () => {
  const stepIndex = useShortcutShowcaseStore(selectShowcaseStepIndex);
  const stepId = stepIdAt(stepIndex);
  const { closing, beginDismiss } = useDismissTransition(SHOWCASE_REVEAL_MS);
  const { openModal } = useAuthModal();
  const { authenticated } = useContext(SessionContext);
  const [isModHeld, setIsModHeld] = useState(false);
  const hasRevealedJumpsRef = useRef(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [practice, setPractice] = useState(initialPracticeState);
  const [offerPending, setOfferPending] = useState(false);
  const offerTakenRef = useRef(false);
  const regionRef = useRef<HTMLElement>(null);

  useAppLockReason("shortcutShowcase", true);

  const apply = (transition: typeof createDraft) => {
    const next = transition(practice);
    setPractice(next);
    return next;
  };
  const advance = shortcutShowcaseActions.advance;

  const graduate = () => {
    shortcutShowcaseActions.markSeen();
    beginDismiss(() => shortcutShowcaseActions.finish());
  };

  const skipToSignup = () => {
    shortcutShowcaseActions.skip("signup");
    track("signup_started", { source: "shortcut_showcase" });
    openModal("signUp");
  };

  const notificationsSupported = getNotificationPort().isSupported();

  // A prompt may outlive this step. Deduplicate it and only advance while the
  // offer is still visible so a late answer cannot dismiss graduation.
  const enableNotifications = () => {
    if (offerTakenRef.current) return;
    offerTakenRef.current = true;
    setOfferPending(true);
    void notificationActions.enable("showcase").finally(() => {
      setOfferPending(false);
      const { stepIndex: current } = useShortcutShowcaseStore.getState();
      if (stepIdAt(current) === "notifications") advance();
    });
  };

  const handleTitleCommit = (title: string) => {
    setPractice((state) => commitTitle(state, title));
    const id = stepIdAt(useShortcutShowcaseStore.getState().stepIndex);
    if (id === "create" || id === "editTitle") advance();
  };

  const seatFocus = () => {
    const root = regionRef.current;
    if (!root || closing || root.contains(document.activeElement)) return;
    const [firstFocusable] = getFocusableElements(root);
    (firstFocusable ?? root).focus();
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: lesson transitions reseat focus after transient controls unmount.
  useEffect(() => {
    seatFocus();
  }, [stepId, practice.editor, paletteOpen]);

  useEffect(() => {
    const clearMod = () => setIsModHeld(false);
    window.addEventListener("blur", clearMod);
    return () => window.removeEventListener("blur", clearMod);
  }, []);

  const claim = (event: ReactKeyboardEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
  };

  const handleTakeoverKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (closing) {
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      return;
    }

    if (event.key === "Tab" && regionRef.current) {
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

    if (isPlatformModKey(event.nativeEvent)) {
      setIsModHeld(true);
      if (stepId === "pageJump") hasRevealedJumpsRef.current = true;
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
      if (paletteOpen) {
        setPaletteOpen(false);
      } else if (practice.editor) {
        const input = document.querySelector<HTMLInputElement>(
          "[data-practice-title-input]",
        );
        apply((state) => commitTitle(state, input?.value ?? ""));
      } else {
        shortcutShowcaseActions.skip();
      }
      return;
    }

    const isModChord = event.metaKey || event.ctrlKey;
    if (isModChord && keyboardKey(event.nativeEvent).toLowerCase() === "k") {
      claim(event);
      if (stepId === "palette" && !paletteOpen) setPaletteOpen(true);
      return;
    }

    if (paletteOpen) {
      if (event.key === "Enter") {
        claim(event);
        setPaletteOpen(false);
        if (stepId === "palette") advance();
      }
      return;
    }

    if (stepId === "intro") {
      if (event.key === "Enter" && !event.repeat) {
        const focusedButton =
          event.target instanceof HTMLElement && event.target.closest("button");
        if (!focusedButton) {
          claim(event);
          advance();
        }
        return;
      }
      if (!isBareLetterKey(event.nativeEvent, "u")) return;
    }

    if (stepId === "graduation" && event.key === "Enter") {
      claim(event);
      graduate();
      return;
    }

    if (stepId === "notifications") {
      const focusedButton =
        event.target instanceof HTMLElement && event.target.closest("button");
      if (
        event.key === "Enter" &&
        !event.repeat &&
        !focusedButton &&
        notificationsSupported
      ) {
        claim(event);
        enableNotifications();
        return;
      }
      if (isBareLetterKey(event.nativeEvent, "n")) {
        claim(event);
        advance();
      }
      return;
    }

    if (stepId === "pageJump") {
      const digit = /^Digit([12])$/.exec(event.code);
      if (digit && hasRevealedJumpsRef.current) {
        claim(event);
        advance();
        return;
      }
    }

    if (stepId === "nudge") {
      const direction = arrowDirection(event.key);
      if (event.shiftKey && direction) {
        claim(event);
        const next = apply((state) => nudgeFocused(state, direction));
        if (next !== practice) advance();
        return;
      }
    }

    if (
      isBareLetterKey(
        event.nativeEvent,
        KEYMAP.createEvent.hotkey.toLowerCase(),
      )
    ) {
      claim(event);
      apply(createDraft);
      return;
    }

    if (stepId === "eventJump") {
      if (isBareLetterKey(event.nativeEvent, KEYMAP.eventJump.bareLetter)) {
        claim(event);
        apply(toggleJumpHints);
        return;
      }
      const jumpKey = keyboardKey(event.nativeEvent).toLowerCase();
      if (jumpKey.length === 1 && practice.jumpHintsVisible) {
        const next = apply((state) => jumpToEvent(state, jumpKey));
        if (next !== practice) {
          claim(event);
          advance();
        }
        return;
      }
    }

    if (stepId === "editTitle") {
      if (
        isBareLetterKey(event.nativeEvent, KEYMAP.editTitle.sequence.leader)
      ) {
        claim(event);
        apply(armEdit);
        return;
      }
      if (
        practice.editArmed &&
        isBareLetterKey(event.nativeEvent, KEYMAP.editTitle.sequence.second)
      ) {
        claim(event);
        apply(openTitleFromEdit);
        return;
      }
      if (practice.editArmed && event.key.length === 1) apply(disarmEdit);
    }

    if (
      stepId !== "graduation" &&
      isBareLetterKey(event.nativeEvent, "u") &&
      !authenticated
    ) {
      claim(event);
      skipToSignup();
    }
  };

  const handleTakeoverKeyUp = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (isPlatformModKey(event.nativeEvent)) setIsModHeld(false);
  };

  const runPracticeCommand = () => {
    apply((state) => ({
      ...ensureFocused(state),
      focusedId: PRACTICE_TEAM_SYNC_ID,
    }));
    setPaletteOpen(false);
    if (stepId === "palette") advance();
  };

  const step =
    stepId === "create"
      ? {
          ...getShowcaseStep("create"),
          ...getCreateLessonPhase(Boolean(practice.editor)),
        }
      : getShowcaseStep(stepId);

  const levelLabel =
    "level" in step ? `Level ${step.level}/${SHOWCASE_LEVEL_IDS.length}` : null;
  const showPageJumpHints = isModHeld && stepId === "pageJump";

  return (
    <section
      ref={regionRef}
      aria-label="Shortcut practice"
      className={`fixed inset-0 flex items-center justify-center bg-background ${closing ? "c-showcase-curtain" : ""}`}
      data-closing={closing || undefined}
      onKeyDownCapture={handleTakeoverKeyDown}
      onKeyUpCapture={handleTakeoverKeyUp}
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
            {stepId === "intro" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={PRIMARY_BUTTON_CLASS}
                  onClick={advance}
                >
                  Start practicing
                </button>
                <ShortcutHint className="shrink-0">Enter</ShortcutHint>
              </div>
            )}
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
