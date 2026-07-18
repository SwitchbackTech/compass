import { brighten, darken } from "./color.utils";
import { colors } from "./colors";

// Flat neutral color used everywhere an event was previously colored by
// priority (event grid cards, event form, save button, tags, context menu).
export const EVENT_COLOR = colors.accentSecondary;
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
