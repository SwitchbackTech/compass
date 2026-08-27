export interface ShortcutContext {
  isFormOpen?: boolean;
  lifeView?: boolean;
  weekView?: boolean;
}

export interface Shortcut {
  id: string;
  keys: string[];
  label: string;
  section: string;
  when?: ShortcutContext;
}
