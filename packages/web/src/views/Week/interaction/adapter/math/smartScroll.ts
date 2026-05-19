export type SmartScrollZone = "top" | "bottom" | null;

export interface SmartScrollCache {
  bottom: number;
  edgeThresholdPx: number;
  element: HTMLElement;
  initialScrollTop: number;
  maxScrollTop: number;
  speedPx: number;
  top: number;
}

export interface SmartScrollFrame {
  scrollTop: number;
  velocityPx: number;
  zone: SmartScrollZone;
}

export const getSmartScrollFrame = ({
  cache,
  pointerY,
  scrollTop,
}: {
  cache: SmartScrollCache;
  pointerY: number;
  scrollTop: number;
}): SmartScrollFrame => {
  const zone = getSmartScrollZone(cache, pointerY);

  if (zone === "top") {
    const nextScrollTop = Math.max(0, scrollTop - cache.speedPx);

    return {
      scrollTop: nextScrollTop,
      velocityPx: nextScrollTop - scrollTop,
      zone,
    };
  }

  if (zone === "bottom") {
    const nextScrollTop = Math.min(
      cache.maxScrollTop,
      scrollTop + cache.speedPx,
    );

    return {
      scrollTop: nextScrollTop,
      velocityPx: nextScrollTop - scrollTop,
      zone,
    };
  }

  return {
    scrollTop,
    velocityPx: 0,
    zone,
  };
};

const getSmartScrollZone = (
  cache: Pick<SmartScrollCache, "bottom" | "edgeThresholdPx" | "top">,
  pointerY: number,
): SmartScrollZone => {
  if (pointerY < cache.top + cache.edgeThresholdPx) {
    return "top";
  }

  if (pointerY > cache.bottom - cache.edgeThresholdPx) {
    return "bottom";
  }

  return null;
};
