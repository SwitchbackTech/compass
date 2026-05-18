type WeekInteractionMotionWindow = Window & {
  __weekInteractionMotionActive?: boolean;
};

export const isWeekInteractionMotionActive = () =>
  typeof window !== "undefined" &&
  Boolean(
    (window as WeekInteractionMotionWindow).__weekInteractionMotionActive,
  );

export const setWeekInteractionMotionActive = (isActive: boolean) => {
  if (typeof window === "undefined") {
    return;
  }

  (window as WeekInteractionMotionWindow).__weekInteractionMotionActive =
    isActive;
};
