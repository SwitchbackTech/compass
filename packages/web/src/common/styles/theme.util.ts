import { type ThemeName } from "@web/settings/theme/theme.constants";
import { selectTheme, useThemeStore } from "@web/settings/theme/theme.store";
import { brighten, darken } from "./color.utils";

// Flat neutral fill shared by every event surface (grid cards, event form
// accents, save button), one value per theme. Title/time text is picked per
// fill by theme.getContrastText, so each base just has to sit clearly on one
// side of the mid-tone dead zone.
//   Dark Abyss:  muted steel-blue, light enough for dark text (>= 4.5:1) — a
//                darker fill forced light, "glowing" titles on the near-black
//                grid that read as too visually loud.
//   Light Beach: near-neutral ink charcoal that takes light text (8.8:1) —
//                dark blocks on the warm paper grid, matching the theme's
//                restrained pen-and-paper brief.
const EVENT_BASE_COLOR: Record<ThemeName, string> = {
  "dark-abyss": "#82A0B2",
  "light-beach": "#454442",
};

export interface EventPalette {
  base: string;
  /** Derived (not a fixed hex) so the hover delta scales with the base the
   * same way it always has, rather than being pinned to a step that happens
   * to suit one palette's lightness. */
  hover: string;
  gradient: string;
  saveButtonBg: string;
  /** The c-button-elevated underside, a step deeper than the button fill. */
  saveButtonShadow: string;
}

const buildEventPalette = (theme: ThemeName): EventPalette => {
  const base = EVENT_BASE_COLOR[theme];
  return {
    base,
    hover: brighten(base),
    gradient: `linear-gradient(90deg, ${darken(base, 15)}, ${darken(base, 30)})`,
    saveButtonBg: darken(base),
    saveButtonShadow: darken(base, 25),
  };
};

// Precomputed for both themes at module load — consumers just index in.
const EVENT_PALETTES: Record<ThemeName, EventPalette> = {
  "dark-abyss": buildEventPalette("dark-abyss"),
  "light-beach": buildEventPalette("light-beach"),
};

/** The active theme's event palette; subscribes so a theme switch re-renders
 * the caller with the new fills. */
export const useEventPalette = (): EventPalette =>
  EVENT_PALETTES[useThemeStore(selectTheme)];

/** Non-reactive read for plain functions (e.g. getGradient's identity check).
 * Components should use useEventPalette so they repaint on switch. */
export const getEventPalette = (): EventPalette =>
  EVENT_PALETTES[useThemeStore.getState().theme];

// CSS-variable gradients: these land in inline `background` styles, so the
// browser resolves them against the active [data-theme] — no JS hex needed.
export const accentGradient =
  "linear-gradient(var(--accent), var(--accent-strong))";
const mutedGradient =
  "linear-gradient(90deg, var(--text-muted), var(--text-subtle))";

export const getGradient = (color: string) => {
  const { base, gradient } = getEventPalette();
  return color === base ? gradient : mutedGradient;
};
