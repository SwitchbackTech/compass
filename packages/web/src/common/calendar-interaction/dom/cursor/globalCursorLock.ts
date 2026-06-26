/**
 * Single place that forces a cursor globally during a drag/resize interaction.
 *
 * Adds a `cursor-<value>` class to <html>, backed by a stylesheet this module
 * injects into <head>. The rule uses `* { cursor: <value> !important }` so it
 * wins over the `cursor-*` classes that event cards/grid declare (which
 * otherwise own the cursor under the pointer). Inline `document.body.style`
 * can't win that fight, and a rule placed in index.css ends up inside a Tailwind
 * `@layer` and loses to the layered utilities — so the rule is injected at
 * runtime, unlayered, which beats the layered utilities deterministically.
 *
 * Every drag path calls this directly and keeps the returned release fn: the
 * engine overlay (Week + Day saved events, sidebar someday) and the Week draft.
 * Interactions are mutually exclusive (one drag/resize at a time, and the engine
 * releases its prior lock before mounting a new overlay), so a plain
 * add-on-lock / remove-on-release is sufficient. The release is idempotent so
 * repeated calls (e.g. React StrictMode cleanup) are safe.
 */

const STYLE_ELEMENT_ID = "compass-global-cursor-lock";

const CURSOR_LOCK_CSS = `
html.cursor-move, html.cursor-move * { cursor: move !important; }
html.cursor-col-resize, html.cursor-col-resize * { cursor: col-resize !important; }
html.cursor-row-resize, html.cursor-row-resize * { cursor: row-resize !important; }
`;

const ensureStyleInjected = () => {
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById(STYLE_ELEMENT_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = CURSOR_LOCK_CSS;
  document.head.appendChild(style);
};

export const lockGlobalCursor = (cursor: string): (() => void) => {
  ensureStyleInjected();

  const className = `cursor-${cursor}`;
  document.documentElement.classList.add(className);

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    document.documentElement.classList.remove(className);
  };
};
