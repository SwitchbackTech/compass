import { brighten, darken } from "./color.utils";
import { colors } from "./colors";

// Flat neutral fill shared by every event surface (grid cards, event form
// accents, save button). A muted steel-blue kept light enough that event
// titles/times render in DARK text at >= 4.5:1 — a darker fill forced light,
// "glowing" title text that read as too visually loud on the near-black grid.
export const EVENT_COLOR = "#82A0B2";
// Derived (not colors.accentSecondaryHover) so the hover delta scales with
// EVENT_COLOR the same way it always has, rather than being pinned to a
// fixed step that happens to be smaller for this palette's base lightness.
export const EVENT_HOVER_COLOR = brighten(EVENT_COLOR);
export const EVENT_GRADIENT = `linear-gradient(90deg, ${darken(
  EVENT_COLOR,
  15,
)}, ${darken(EVENT_COLOR, 30)})`;

export const accentGradient = `linear-gradient(${colors.accent}, ${colors.accentStrong})`;
const mutedGradient = `linear-gradient(90deg, ${colors.textMuted}, ${colors.textSubtle})`;

export const getGradient = (color: string) =>
  color === EVENT_COLOR ? EVENT_GRADIENT : mutedGradient;
