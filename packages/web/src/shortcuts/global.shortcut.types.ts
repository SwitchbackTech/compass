export interface ShortcutContext {
  isFormOpen?: boolean;
  lifeView?: boolean;
  weekView?: boolean;
  /** Only listed while a Stripe trial is running. */
  isTrialing?: boolean;
}

export interface Shortcut {
  id: string;
  keys: string[];
  label: string;
  section: string;
  when?: ShortcutContext;
}
