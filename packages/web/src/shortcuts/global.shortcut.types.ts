export interface ShortcutContext {
  isFormOpen?: boolean;
  lifeView?: boolean;
  /** Only while the Share availability panel owns the grid. */
  availabilityOpen?: boolean;
}

export interface Shortcut {
  id: string;
  keys: string[];
  label: string;
  section: string;
  when?: ShortcutContext;
}
