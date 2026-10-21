import { type Page } from "@playwright/test";

const maxAlignmentDeltaPx = 4;
/** Matches {@link TIMED_EVENT_COLUMN_INSET} in grid.constants.ts. */
const timedEventColumnInsetPx = 5;

export type WeekGridAlignmentResult = {
  ok: boolean;
  reason?: string;
  horizontalDeltas?: number[];
  verticalDeltas?: number[];
};

/** Assert timed event cards share gutter hour rows and day column left edges. */
export async function evaluateWeekGridEventAlignment(
  page: Page,
  eventTitlePattern: RegExp,
  expectedHourLabel: string,
): Promise<WeekGridAlignmentResult> {
  return page.evaluate(
    ({ columnInsetPx, patternSource, patternFlags, hourLabel, tolerance }) => {
      const pattern = new RegExp(patternSource, patternFlags);
      const grid = document.querySelector("#mainGrid");
      if (!grid) {
        return { ok: false, reason: "missing #mainGrid" };
      }

      const timeColumn = grid.querySelector(
        ':scope > div[aria-hidden="true"].absolute',
      );
      if (!timeColumn) {
        return { ok: false, reason: "missing time column" };
      }

      const labelSpans = [
        ...timeColumn.querySelectorAll<HTMLSpanElement>("span"),
      ].filter((node) => node.classList.contains("text-[10px]"));
      const labelTop = labelSpans
        .find((node) => node.textContent?.trim() === hourLabel)
        ?.getBoundingClientRect().top;
      if (labelTop === undefined) {
        return {
          ok: false,
          reason: `missing gutter label ${hourLabel}`,
        };
      }

      const layers = document.querySelector("#timedEvents");
      if (!layers) {
        return { ok: false, reason: "missing #timedEvents" };
      }

      const cards = [
        ...layers.querySelectorAll<HTMLElement>("[role='button']"),
      ].filter((node) => pattern.test(node.textContent ?? ""));
      if (cards.length === 0) {
        return { ok: false, reason: "no matching event cards" };
      }

      const columns = [
        ...document.querySelectorAll<HTMLElement>("#timedColumns th"),
      ].filter((node) => node.getBoundingClientRect().height > 20);
      if (columns.length === 0) {
        return { ok: false, reason: "missing timed columns" };
      }

      const verticalDeltas = cards.map(
        (node) => node.getBoundingClientRect().top - labelTop,
      );
      const horizontalDeltas = cards.map((card) => {
        const cardBox = card.getBoundingClientRect();
        const cardCenterX = cardBox.left + cardBox.width / 2;
        const column = columns.find((col) => {
          const box = col.getBoundingClientRect();
          return cardCenterX >= box.left && cardCenterX <= box.right;
        });
        if (!column) {
          return Number.POSITIVE_INFINITY;
        }
        return (
          cardBox.left - column.getBoundingClientRect().left - columnInsetPx
        );
      });

      const badVertical = verticalDeltas.filter(
        (delta) => Math.abs(delta) > tolerance,
      );
      const badHorizontal = horizontalDeltas.filter(
        (delta) => Math.abs(delta) > tolerance,
      );

      return {
        ok: badVertical.length === 0 && badHorizontal.length === 0,
        reason:
          badVertical.length > 0
            ? "vertical misalignment"
            : badHorizontal.length > 0
              ? "horizontal misalignment"
              : undefined,
        horizontalDeltas,
        verticalDeltas,
      };
    },
    {
      columnInsetPx: timedEventColumnInsetPx,
      patternSource: eventTitlePattern.source,
      patternFlags: eventTitlePattern.flags,
      hourLabel: expectedHourLabel,
      tolerance: maxAlignmentDeltaPx,
    },
  );
}

export { maxAlignmentDeltaPx };
