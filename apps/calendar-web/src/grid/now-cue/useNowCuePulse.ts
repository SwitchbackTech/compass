import {
  selectNowCueActive,
  selectNowCuePulseGeneration,
  useNowCueStore,
} from "@web/grid/now-cue/now-cue.store";

/**
 * Subscribes an element to the go-to-today teach pulse.
 *
 * `pulsing` gates the pulse utility class. `pulseKey` is a remount key: a CSS
 * animation only replays on a fresh node, so repeated "t" presses need a key
 * that changes with every pulse. Name it per element so sibling cues under
 * one parent stay distinct, and pass `isTarget` where the element is only
 * sometimes the cue (today's column) so the rest never remount.
 */
export const useNowCuePulse = () => {
  const active = useNowCueStore(selectNowCueActive);
  const generation = useNowCueStore(selectNowCuePulseGeneration);

  return {
    pulsing: active,
    pulseKey: (name: string, isTarget = true) =>
      isTarget ? `${name}-${generation}` : undefined,
  };
};
