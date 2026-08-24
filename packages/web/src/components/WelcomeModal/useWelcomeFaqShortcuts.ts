import { resolveModifier } from "@tanstack/react-hotkeys";
import { useEffect, useState } from "react";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { FAQ_ITEMS } from "./faq";

const isPlatformModKey = (event: KeyboardEvent) =>
  resolveModifier("Mod") === "Meta"
    ? event.key === "Meta"
    : event.key === "Control";

const faqIndexFromEvent = (event: KeyboardEvent): number | null => {
  const match = /^Digit([1-9])$/.exec(event.code);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  if (index < 0 || index >= FAQ_ITEMS.length) return null;
  return index;
};

/**
 * Hold Mod to reveal numbered FAQ keycaps; press 1–5 (with or without Mod)
 * to toggle that question. Bare digits work because browsers steal
 * Cmd/Ctrl+1–8 for tab switching.
 */
export function useWelcomeFaqShortcuts(toggleFaqAt: (index: number) => void) {
  const [isModHeld, setIsModHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isPlatformModKey(event)) {
        setIsModHeld(true);
      }

      if (isEditableKeyboardTarget(event)) return;

      const index = faqIndexFromEvent(event);
      if (index === null) return;

      event.preventDefault();
      toggleFaqAt(index);
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
