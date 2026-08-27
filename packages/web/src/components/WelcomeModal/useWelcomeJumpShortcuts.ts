import { resolveModifier } from "@tanstack/react-hotkeys";
import { useEffect, useState } from "react";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { physicalDigitIndex } from "@web/shortcuts/digit-pick.util";
import { FAQ_ITEMS } from "./faq";

export const WELCOME_JUMP_ATTR = "data-welcome-jump";

const isPlatformModKey = (event: KeyboardEvent) =>
  resolveModifier("Mod") === "Meta"
    ? event.key === "Meta"
    : event.key === "Control";

/**
 * Hold Mod to reveal numbered keycaps; press a number (with or without Mod)
 * to toggle that FAQ or open a footer link. Bare digits work because
 * browsers steal Cmd/Ctrl+1–8 for tab switching.
 *
 * 1–5 toggle FAQ items. 6–0 activate matching `[data-welcome-jump]` links.
 */
export function useWelcomeJumpShortcuts(toggleFaqAt: (index: number) => void) {
  const [isModHeld, setIsModHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isPlatformModKey(event)) {
        setIsModHeld(true);
      }

      if (isEditableKeyboardTarget(event)) return;

      const index = physicalDigitIndex(event);
      if (index === null) return;

      if (index < FAQ_ITEMS.length) {
        event.preventDefault();
        toggleFaqAt(index);
        return;
      }

      const footerIndex = index - FAQ_ITEMS.length;
      const el = document.querySelector<HTMLElement>(
        `[${WELCOME_JUMP_ATTR}="${footerIndex}"]`,
      );
      if (!el) return;

      event.preventDefault();
      el.click();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (isPlatformModKey(event)) {
        setIsModHeld(false);
      }
    };

    const clearMod = () => setIsModHeld(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearMod);
    document.addEventListener("visibilitychange", clearMod);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearMod);
      document.removeEventListener("visibilitychange", clearMod);
    };
  }, [toggleFaqAt]);

  return isModHeld;
}
