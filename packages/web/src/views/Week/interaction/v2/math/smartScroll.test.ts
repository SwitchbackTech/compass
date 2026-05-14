import { getSmartScrollFrame, type SmartScrollCache } from "./smartScroll";
import { describe, expect, it } from "bun:test";

const cache: SmartScrollCache = {
  bottom: 300,
  edgeThresholdPx: 50,
  element: document.createElement("div"),
  initialScrollTop: 100,
  maxScrollTop: 250,
  speedPx: 10,
  top: 0,
};

describe("smart scroll math", () => {
  it("scrolls upward near the top edge and clamps at the top", () => {
    expect(
      getSmartScrollFrame({ cache, pointerY: 20, scrollTop: 100 }),
    ).toMatchObject({
      scrollTop: 90,
      velocityPx: -10,
      zone: "top",
    });
    expect(
      getSmartScrollFrame({ cache, pointerY: 20, scrollTop: 0 }),
    ).toMatchObject({
      scrollTop: 0,
      velocityPx: 0,
      zone: "top",
    });
  });

  it("scrolls downward near the bottom edge and clamps at the bottom", () => {
    expect(
      getSmartScrollFrame({ cache, pointerY: 280, scrollTop: 100 }),
    ).toMatchObject({
      scrollTop: 110,
      velocityPx: 10,
      zone: "bottom",
    });
    expect(
      getSmartScrollFrame({ cache, pointerY: 280, scrollTop: 250 }),
    ).toMatchObject({
      scrollTop: 250,
      velocityPx: 0,
      zone: "bottom",
    });
  });

  it("does not scroll outside the edge zones", () => {
    expect(
      getSmartScrollFrame({ cache, pointerY: 150, scrollTop: 100 }),
    ).toMatchObject({
      scrollTop: 100,
      velocityPx: 0,
      zone: null,
    });
  });
});
