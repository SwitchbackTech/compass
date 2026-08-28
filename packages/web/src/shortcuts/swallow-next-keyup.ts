import { keyboardKey } from "@web/shortcuts/is-bare-letter-key";

const SWALLOW_MS = 1000;

/**
 * Overlay letter shortcuts run on keydown and may unmount (and drop app-lock)
 * before the matching keyup. View navigation is bound on keyup, so that leftover
 * release would otherwise navigate. Capture-phase on `window` runs before
 * document-level hotkeys.
 */
export function swallowNextKeyup(key: string): void {
  const target = key.toLowerCase();
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener("keyup", onKeyUp, true);
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (keyboardKey(event).toLowerCase() !== target) return;
    event.preventDefault();
    event.stopPropagation();
    finish();
  };

  window.addEventListener("keyup", onKeyUp, true);
  window.setTimeout(finish, SWALLOW_MS);
}
