export interface ShortcutContext {
  eventFocused?: boolean;
  isFormOpen?: boolean;
  lifeView?: boolean;
}

export interface Shortcut {
  id: string;
  keys: string[];
  label: string;
  section: string;
  when?: ShortcutContext;
}
