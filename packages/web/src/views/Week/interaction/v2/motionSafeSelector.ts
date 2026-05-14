export const areSelectedValuesEqualDuringWeekMotion = <T>(
  previous: T,
  next: T,
) => {
  if (typeof window !== "undefined" && window.__weekInteractionV2MotionActive) {
    return true;
  }

  return Object.is(previous, next);
};
