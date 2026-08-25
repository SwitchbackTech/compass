import { resolveModifier } from "@tanstack/react-hotkeys";
import { useEffect, useRef, useState } from "react";
import { isAppLocked } from "@web/shortcuts/app-lock";
import { normalizedKeyboardKey } from "@web/shortcuts/is-bare-letter-key";

/**
 * How long Mod must be held, with nothing else pressed, before hint chips
 * appear. Matches the `e`-leader's ARM_WINDOW_MS cadence so both hold
 * gestures feel the same.
 */
export const MOD_HOLD_HINT_MS = 600;

/**
 * The hold-Mod discoverability engine: holding the platform Mod key alone for
 * MOD_HOLD_HINT_MS flips `areHintsVisible` on (an overlay renders keycap
 * chips over the jump targets), and a Mod chord dispatches through
 * `onModChord`. Each surface supplies only its own digit-to-target mapping —
 * the event form's fields (useFormDigitJumpShortcut) and the page's areas
 * (usePageJumpShortcut) share this one gesture so the muscle memory of
 * "hold Mod to see where to go next" works the same everywhere.
 *
 * `onModChord` receives every keydown while Mod (and no other modifier) is
 * held and returns whether it consumed the key; a consumed key is
 * preventDefaulted and its macOS keyup replay suppressed.
 *
 * Safari may still switch tabs for some Cmd+digit combos despite
 * preventDefault; Chromium and Firefox honor it.
 */
export function useModHoldHintShortcut({
  enabled = true,
  onModChord,
}: {
  enabled?: boolean;
  onModChord: (event: KeyboardEvent) => boolean;
}): { areHintsVisible: boolean } {
  const [areHintsVisible, setAreHintsVisible] = useState(false);
  const onModChordRef = useRef(onModChord);
  onModChordRef.current = onModChord;

  useEffect(() => {
    if (!enabled) {
      setAreHintsVisible(false);
      return;
    }

    const isMac = resolveModifier("Mod") === "Meta";
    const modKey = isMac ? "Meta" : "Control";
    let holdTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let hintsVisible = false;
    const suppressKeyUp = new Set<string>();

    const clearHoldTimer = () => {
      if (holdTimeoutId !== null) {
        clearTimeout(holdTimeoutId);
        holdTimeoutId = null;
      }
    };

    const hideHints = () => {
      clearHoldTimer();
      if (hintsVisible) {
        hintsVisible = false;
        setAreHintsVisible(false);
      }
    };

    const armHoldTimer = () => {
      holdTimeoutId = setTimeout(() => {
        holdTimeoutId = null;
        hintsVisible = true;
        setAreHintsVisible(true);
      }, MOD_HOLD_HINT_MS);
    };

    const isModOnly = (event: KeyboardEvent) =>
      isMac
        ? event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey
        : event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isAppLocked()) {
        hideHints();
        return;
      }

      if (event.key === modKey) {
        // Held modifiers auto-repeat; only the initial press should start the
        // clock, or the timer would keep resetting for as long as Mod stays down.
        if (event.repeat) return;
        if (!hintsVisible && holdTimeoutId === null) {
          armHoldTimer();
        }
        return;
      }

      if (isModOnly(event) && onModChordRef.current(event)) {
        event.preventDefault();
        event.stopPropagation();
        // macOS swallows this key's keyup while Cmd is held and replays it
        // with metaKey:false on release; suppress so nothing downstream
        // reacts to that replay as a bare keystroke.
        suppressKeyUp.add(normalizedKeyboardKey(event));
        hideHints();
        return;
      }

      // Any other keydown (including an unmatched Mod chord like Mod+K) means
      // the user wasn't pausing to look; only a fresh Mod press re-arms it.
      clearHoldTimer();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = normalizedKeyboardKey(event);
      if (suppressKeyUp.has(key)) {
        suppressKeyUp.delete(key);
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key === modKey) {
        hideHints();
      }
    };

    // Clicking away or losing the window abandons the gesture rather than
    // leaving chips pinned to a spot the user isn't looking at. Window
    // switches (Cmd+Tab) can swallow the Meta keyup entirely, so blur and
    // visibilitychange are covered independently of onKeyUp.
    const onPointerDown = () => hideHints();
    const onWindowBlur = () => hideHints();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") hideHints();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      hideHints();
      suppressKeyUp.clear();
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);

  return { areHintsVisible };
}
