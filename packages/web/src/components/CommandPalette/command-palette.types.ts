import { type Icon } from "@phosphor-icons/react";

export interface CommandItem {
  id: string;
  label: string;
  icon: Icon;
  onClick?: () => void;
  disabled?: boolean;
  /** When true, selecting the item does not close the palette. */
  keepOpen?: boolean;
  /** A single key (`"?"`) or one key per combo entry (`["Shift", "W"]`), rendered as keycap chips. */
  shortcut?: string | string[];
}

export interface CommandSection {
  id: string;
  heading: string;
  items: CommandItem[];
}
