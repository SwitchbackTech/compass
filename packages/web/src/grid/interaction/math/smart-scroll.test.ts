import { getSmartScrollFrame, type SmartScrollCache } from "./smart-scroll";
import { describe, expect, it } from "bun:test";

const cache = {
  bottom: 600,
  edgeThresholdPx: 40,
  element: document.createElement("div"),
  initialScrollTop: 0,
  maxScrollTop: 500,
  speedPx: 10,
  top: 100,
} satisfies SmartScrollCache;

describe("smart scroll", () => {
  it("scrolls near an edge and stops at the content boundary", () => {
    expect(getSmartScrollFrame({ cache, pointerY: 120, scrollTop: 5 })).toEqual(
      { scrollTop: 0, velocityPx: -5, zone: "top" },
    );
    expect(
      getSmartScrollFrame({ cache, pointerY: 590, scrollTop: 495 }),
    ).toEqual({ scrollTop: 500, velocityPx: 5, zone: "bottom" });
  });

  it("does not scroll away from the edge zones", () => {
    expect(
      getSmartScrollFrame({ cache, pointerY: 300, scrollTop: 200 }),
    ).toEqual({ scrollTop: 200, velocityPx: 0, zone: null });
  });
});
