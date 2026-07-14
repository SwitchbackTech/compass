import { brighten, darken } from "./color.utils";
import { c } from "./colors";

export const darkBlueGradient = {
  level1: c.darkBlue400,
  level2: c.darkBlue400,
  level3: c.darkBlue200,
  level4: c.darkBlue300,
  level5: c.darkBlue400,
};

// Flat neutral color used everywhere an event was previously colored by
// priority (event grid cards, event form, save button, tags, context menu).
export const EVENT_COLOR = c.blueGray400;
export const EVENT_HOVER_COLOR = brighten(EVENT_COLOR);
export const EVENT_GRADIENT = `linear-gradient(90deg, ${darken(
  EVENT_COLOR,
  15,
)}, ${darken(EVENT_COLOR, 30)})`;

export const blueGradient = `linear-gradient(${c.blue100}, ${c.blue300})`;
const grayGradient = `linear-gradient(90deg, ${c.gray100}, ${c.gray200})`;

export const getGradient = (color: string) =>
  color === EVENT_COLOR ? EVENT_GRADIENT : grayGradient;
