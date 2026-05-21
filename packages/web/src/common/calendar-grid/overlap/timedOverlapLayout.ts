export interface TimedOverlapInput {
  endDate: string;
  eventId: string;
  startDate: string;
  title?: string | null;
}

export interface TimedOverlapLayout {
  horizontalOffsetPercent: number;
  isFrontmost: boolean;
  isOverlapping: boolean;
  stackIndex: number;
  widthPercent: number;
  zIndex: number;
}

// Back card keeps the full column width; overlays nest right-aligned on top.
const FRONT_OVERLAY_WIDTH_PCT = 42;
const MIDDLE_OVERLAY_RIGHT_INSET_PCT = 13;
const MIDDLE_OVERLAY_MIN_LEFT_PCT = 5;
const MIDDLE_OVERLAY_STEP_PCT = 26;

export const computeTimedOverlapLayout = (
  events: TimedOverlapInput[],
): Map<string, TimedOverlapLayout> => {
  const layout = new Map<string, TimedOverlapLayout>();
  const sorted = [...events].sort(compareForStableLayout);

  for (const event of sorted) {
    const group = sorted.filter((candidate) => overlaps(event, candidate));
    const isOverlapping = group.length > 1;
    const stackIndex = group.indexOf(event);
    const isBackCard = stackIndex === 0;

    let horizontalOffsetPercent: number;
    let widthPercent: number;

    if (!isOverlapping || isBackCard) {
      horizontalOffsetPercent = 0;
      widthPercent = 100;
    } else {
      const overlayCount = group.length - 1;
      const overlayIndex = stackIndex - 1;
      const frontOverlayLeftPercent = 100 - FRONT_OVERLAY_WIDTH_PCT;
      const isFrontOverlay = overlayIndex === overlayCount - 1;

      if (isFrontOverlay) {
        horizontalOffsetPercent = frontOverlayLeftPercent;
        widthPercent = FRONT_OVERLAY_WIDTH_PCT;
      } else {
        const middleOverlayCount = overlayCount - 1;
        const visibleStepPercent = getMiddleVisibleStepPercent(
          middleOverlayCount,
          frontOverlayLeftPercent,
        );
        const stepsBehindFront = middleOverlayCount - overlayIndex;
        const middleOverlayRightPercent = 100 - MIDDLE_OVERLAY_RIGHT_INSET_PCT;

        horizontalOffsetPercent = Math.max(
          MIDDLE_OVERLAY_MIN_LEFT_PCT,
          frontOverlayLeftPercent - stepsBehindFront * visibleStepPercent,
        );
        widthPercent = middleOverlayRightPercent - horizontalOffsetPercent;
      }
    }

    const isFrontmost = isOverlapping && stackIndex === group.length - 1;

    layout.set(event.eventId, {
      horizontalOffsetPercent,
      isFrontmost,
      isOverlapping,
      stackIndex,
      widthPercent,
      zIndex: getZIndex(event, group),
    });
  }

  return layout;
};

const getMiddleVisibleStepPercent = (
  middleOverlayCount: number,
  frontOverlayLeftPercent: number,
): number => {
  if (middleOverlayCount <= 0) return 0;

  const availableRange = frontOverlayLeftPercent - MIDDLE_OVERLAY_MIN_LEFT_PCT;
  return Math.min(MIDDLE_OVERLAY_STEP_PCT, availableRange / middleOverlayCount);
};

const compareForStableLayout = (
  a: TimedOverlapInput,
  b: TimedOverlapInput,
): number => {
  const startDiff = toMs(a.startDate) - toMs(b.startDate);
  if (startDiff !== 0) return startDiff;

  const durationDiff = getDurationMs(b) - getDurationMs(a);
  if (durationDiff !== 0) return durationDiff;

  const titleDiff = (a.title ?? "").localeCompare(b.title ?? "");
  if (titleDiff !== 0) return titleDiff;

  return a.eventId.localeCompare(b.eventId);
};

const getZIndex = (
  event: TimedOverlapInput,
  group: TimedOverlapInput[],
): number => {
  const backToFront = [...group].sort(compareForStableLayout);
  const index = backToFront.findIndex(
    (candidate) => candidate.eventId === event.eventId,
  );

  return index + 1;
};

const overlaps = (
  event: TimedOverlapInput,
  candidate: TimedOverlapInput,
): boolean => {
  if (event.eventId === candidate.eventId) return true;

  return (
    toMs(event.startDate) < toMs(candidate.endDate) &&
    toMs(candidate.startDate) < toMs(event.endDate)
  );
};

const getDurationMs = (event: TimedOverlapInput): number =>
  toMs(event.endDate) - toMs(event.startDate);

const toMs = (date: string): number => new Date(date).getTime();
