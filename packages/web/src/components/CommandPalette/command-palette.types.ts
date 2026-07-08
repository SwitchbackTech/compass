import { type Icon } from "@phosphor-icons/react";
import { type MouseEvent } from "react";

export interface CommandItem {
  id: string;
  label: string;
  icon: Icon;
  /**
   * Receives the row's click event so callers can key off the clicked DOM
   * node (e.g. Week's `onEventTargetVisibility`, which defers draft creation
   * until the palette row unmounts). Most handlers ignore it.
   */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  href?: string;
  target?: "_blank";
  disabled?: boolean;
  /** A single key (`"?"`) or one key per combo entry (`["Shift", "W"]`), rendered as keycap chips. */
  shortcut?: string | string[];
}

export interface CommandSection {
  id: string;
  heading: string;
  items: CommandItem[];
}
