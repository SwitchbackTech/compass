// Injectable timer seam shared by the SSE-side background loops, so tests can
// drive ticks deterministically instead of waiting on wall-clock timers.
export type TickScheduler = (
  tick: () => void,
  delayMs: number,
) => { clear: () => void };

// Real timer used when the caller injects none. .unref() keeps it from
// holding the process open in tests or graceful shutdown.
export const defaultSchedule: TickScheduler = (tick, delayMs) => {
  const timer = setTimeout(tick, delayMs);
  timer.unref?.();
  return { clear: () => clearTimeout(timer) };
};
