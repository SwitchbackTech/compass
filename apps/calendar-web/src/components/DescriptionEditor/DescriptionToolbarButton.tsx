import { type MouseEvent, type ReactNode } from "react";

const TOOLBAR_BUTTON_CLASSNAME =
  "c-focus-ring flex size-6 items-center justify-center rounded text-text-muted hover:bg-border aria-pressed:bg-border aria-pressed:text-text";

/** Keep the contenteditable focused so the next keystroke applies inside it. */
const keepEditorFocusedOnPress = (event: MouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
};

interface DescriptionToolbarButtonProps {
  /** Accessible name; the toolbar has icon-only controls. */
  label: string;
  pressed: boolean;
  onPress: () => void;
  children: ReactNode;
}

/**
 * One formatting control in the description editor's toolbar. Every control
 * shares the same chrome (focus ring, pressed styling, and the mousedown
 * preventDefault that stops the press from stealing focus off the editor), so
 * it lives here rather than being repeated per button.
 */
export const DescriptionToolbarButton = ({
  label,
  pressed,
  onPress,
  children,
}: DescriptionToolbarButtonProps) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={pressed}
    className={TOOLBAR_BUTTON_CLASSNAME}
    onMouseDown={keepEditorFocusedOnPress}
    onClick={onPress}
  >
    {children}
  </button>
);
