import { ID_EVENT_FORM } from "../../constants/web.constants";

const EVENT_FORM_SELECTOR = `form[name="${ID_EVENT_FORM}"]`;

export type EventFormFocusField =
  | "title"
  | "location"
  | "description"
  | "start"
  | "end"
  | "recurrence"
  | "calendar";

const queryEventFormElement = <T extends Element>(selector: string): T | null =>
  document.querySelector<T>(selector);

/** The docked event form itself, used as a positioning anchor. */
export const getEventFormElement = (): HTMLElement | null =>
  queryEventFormElement<HTMLElement>(EVENT_FORM_SELECTOR);

const focusFirstMatch = (selectors: string[]) => {
  for (const selector of selectors) {
    const element = queryEventFormElement<HTMLElement>(selector);
    if (element) {
      element.focus();
      return true;
    }
  }
  return false;
};

/**
 * Focus a field inside the docked event form. The grid card and sidebar form
 * live in separate trees, so sequence shortcuts hop via the DOM.
 */
export const focusEventFormField = (field: EventFormFocusField): boolean => {
  switch (field) {
    case "title":
      return focusFirstMatch([
        `${EVENT_FORM_SELECTOR} input[name="Event Title"]`,
      ]);
    case "location":
      return focusFirstMatch([
        `${EVENT_FORM_SELECTOR} #event-form-location`,
        `${EVENT_FORM_SELECTOR} input[name="Event Location"]`,
      ]);
    case "description":
      return focusFirstMatch([`#event-form-description`]);
    case "start":
      // Timed events expose a start-time combobox; all-day uses the date input.
      return focusFirstMatch([
        `${EVENT_FORM_SELECTOR} #startTimePicker`,
        `${EVENT_FORM_SELECTOR} input[title="Pick Start Date"]`,
      ]);
    case "end":
      return focusFirstMatch([
        `${EVENT_FORM_SELECTOR} #endTimePicker`,
        `${EVENT_FORM_SELECTOR} input[title="Pick End Date"]`,
      ]);
    case "recurrence":
      return focusFirstMatch([
        `${EVENT_FORM_SELECTOR} #event-form-recurrence button[aria-label="Edit recurrence"]`,
        `${EVENT_FORM_SELECTOR} #event-form-recurrence button[aria-label="Repeat"]`,
      ]);
    case "calendar":
      return focusFirstMatch([`#event-form-calendar`]);
  }
};

// The grid draft card and the sidebar-docked form live in separate component
// trees, so "typing on the focused card focuses the form's title" hops via
// the DOM instead of a shared ref.
export const focusEventFormTitle = () => {
  focusEventFormField("title");
};

const getKeyboardTarget = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
): HTMLElement | null => {
  const target = keyboardEvent.target as HTMLElement | null;

  return target instanceof HTMLElement ? target : null;
};

export const isComboboxInteraction = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
) => {
  const target = getKeyboardTarget(keyboardEvent);
  if (!target) {
    return false;
  }

  const role = target.getAttribute("role");

  if (role === "combobox" || role === "listbox" || role === "option") {
    return true;
  }

  const container =
    target.closest?.("[role='combobox']") ??
    target.closest?.("[role='listbox']") ??
    target.closest?.(".freq-select__control") ??
    target.closest?.(".freq-select__menu") ??
    target.closest?.(".freq-select__option");

  return Boolean(container);
};

// Prefer the contenteditable attribute (and ancestors) over
// `HTMLElement.isContentEditable`: jsdom often leaves that getter undefined
// even when TipTap has set contenteditable="true" on the focused node.
const isContentEditableElement = (target: HTMLElement) =>
  Boolean(
    target.isContentEditable ||
      target.closest("[contenteditable='true'], [contenteditable='']"),
  );

export const isEditableKeyboardTarget = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
) => {
  if (isComboboxInteraction(keyboardEvent)) return true;

  const target = getKeyboardTarget(keyboardEvent);
  if (!target) return false;

  if (isContentEditableElement(target)) return true;

  const tagName = target.tagName.toLowerCase();

  return tagName === "input" || tagName === "textarea" || tagName === "select";
};

/**
 * Targets where Enter has a native meaning and the event-form Enter-to-save
 * hotkey must stand down: multiline editing (TipTap contenteditable /
 * textarea), buttons (toolbar + Save/Cancel), and focused links.
 * Single-line inputs are intentionally excluded so title/location Enter
 * still submits.
 */
export const shouldDeferEnterToTarget = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
) => {
  const target = getKeyboardTarget(keyboardEvent);
  if (!target) return false;

  if (isContentEditableElement(target)) return true;

  const tagName = target.tagName.toLowerCase();
  if (tagName === "textarea" || tagName === "button") return true;
  if (tagName === "a" && target.hasAttribute("href")) return true;
  if (target.getAttribute("role") === "button") return true;

  return false;
};

export const isEventFormKeyboardTarget = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
) => {
  const target = getKeyboardTarget(keyboardEvent);
  if (!target) {
    return false;
  }

  const formContainer = target.closest(EVENT_FORM_SELECTOR);

  return Boolean(formContainer);
};

export const isDeleteTextEditingTarget = (
  keyboardEvent: Pick<KeyboardEvent, "target">,
) => isEditableKeyboardTarget(keyboardEvent);
