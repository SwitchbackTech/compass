export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const snapToStep = (value: number, step: number) =>
  Math.round(value / step) * step;
