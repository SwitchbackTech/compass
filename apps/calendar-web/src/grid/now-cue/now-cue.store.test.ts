import {
  NOW_CUE_PULSE_MS,
  nowCueActions,
  useNowCueStore,
} from "@web/grid/now-cue/now-cue.store";
import { afterEach, describe, expect, it } from "bun:test";

describe("nowCueActions.pulse", () => {
  afterEach(() => {
    nowCueActions.resetForTests();
  });

  it("activates the cue and clears after the pulse duration", () => {
    nowCueActions.pulse();

    expect(useNowCueStore.getState().active).toBe(true);
    expect(useNowCueStore.getState().pulseGeneration).toBe(1);

    nowCueActions.resetForTests();
    expect(useNowCueStore.getState().active).toBe(false);
  });

  it("bumps pulseGeneration on every press so animations can restart", () => {
    nowCueActions.pulse();
    nowCueActions.pulse();
    nowCueActions.pulse();

    expect(useNowCueStore.getState().pulseGeneration).toBe(3);
    expect(useNowCueStore.getState().active).toBe(true);
  });

  it("extends the active window when pulsed again before it ends", () => {
    nowCueActions.pulse();
    nowCueActions.pulse();

    expect(useNowCueStore.getState().pulseGeneration).toBe(2);

    nowCueActions.resetForTests();
    expect(useNowCueStore.getState().active).toBe(false);
    expect(useNowCueStore.getState().pulseGeneration).toBe(0);
  });
});

describe("NOW_CUE_PULSE_MS", () => {
  it("matches the CSS animation duration", () => {
    expect(NOW_CUE_PULSE_MS).toBe(1000);
  });
});
