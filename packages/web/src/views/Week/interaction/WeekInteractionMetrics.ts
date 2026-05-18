export const recordWeekInteractionRender = () => {
  recordWeekViewPerfReactCommit();
};

const recordWeekViewPerfReactCommit = () => {
  if (typeof window === "undefined") {
    return;
  }

  (
    window as unknown as {
      __WEEK_VIEW_PERF_PROBE__?: {
        recordReactCommit?: () => void;
      };
    }
  ).__WEEK_VIEW_PERF_PROBE__?.recordReactCommit?.();
};
