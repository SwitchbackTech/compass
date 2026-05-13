import {
  createInteractionStore,
  initialInteractionState,
} from "./interaction.store";
import { describe, expect, it, mock } from "bun:test";

describe("createInteractionStore", () => {
  it("notifies subscribers when the snapshot changes", () => {
    const store = createInteractionStore();
    const listener = mock();

    store.subscribe(listener);
    store.setState({ mode: "drag", pointer: { x: 12, y: 34 } });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({
      mode: "drag",
      pointer: { x: 12, y: 34 },
    });
  });

  it("resets back to the idle interaction snapshot", () => {
    const store = createInteractionStore({
      mode: "resize",
      pointer: { x: 50, y: 60 },
    });

    store.reset();

    expect(store.getSnapshot()).toEqual(initialInteractionState);
  });
});
