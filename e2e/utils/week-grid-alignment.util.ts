import { type Page } from "@playwright/test";

const maxAlignmentDeltaPx = 4;
/** Matches {@link TIMED_EVENT_COLUMN_INSET} in grid.constants.ts. */
const timedEventColumnInsetPx = 5;
const timedGridRowAttr = "data-calendar-timed-grid-row";

export type WeekGridAlignmentResult = {
  ok: boolean;
  reason?: string;
  horizontalDeltas?: number[];
  verticalDeltas?: number[];
  labelToRowDeltas?: number[];
  nowLineDeltaPx?: number;
};

/** Assert timed cards align with gutter labels and hour row bands (not just labels). */
export async function evaluateWeekGridEventAlignment(
  page: Page,
  eventTitlePattern: RegExp,
  expectedHourLabel: string,
  options?: { expectNowLineMinutes?: number },
): Promise<WeekGridAlignmentResult> {
  return page.evaluate(
    ({
      columnInsetPx,
      expectNowLineMinutes,
      hourLabel,
      patternFlags,
      patternSource,
      rowAttr,
      tolerance,
    }) => {
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

      const labelColumns = [
        ...timeColumn.querySelectorAll<HTMLElement>(":scope > div.h-full"),
      ];
      const primaryColumn = labelColumns.at(-1);
      if (!primaryColumn) {
        return { ok: false, reason: "missing primary hour label column" };
      }
      const labelSpans = [
        ...primaryColumn.querySelectorAll<HTMLSpanElement>("span"),
      ].filter((node) => node.className.includes("text-[10px]"));
      const labels = labelSpans.map((node) => node.textContent?.trim() ?? "");
      const labelIndex = labels.indexOf(hourLabel);
      if (labelIndex < 0) {
        return {
          ok: false,
          reason: `missing gutter label ${hourLabel}`,
        };
      }
      const labelTop = labelSpans[labelIndex]?.getBoundingClientRect().top;
      if (labelTop === undefined) {
        return { ok: false, reason: "missing label geometry" };
      }

      const rows = [
        ...grid.querySelectorAll<HTMLElement>(`[${rowAttr}="true"]`),
      ];
      if (rows.length === 0) {
        return { ok: false, reason: "missing timed hour rows" };
      }
      if (rows.length !== labels.length) {
        return {
          ok: false,
          reason: `row/label count mismatch (${rows.length} vs ${labels.length})`,
        };
      }
      const rowTop = rows[labelIndex]?.getBoundingClientRect().top;
      if (rowTop === undefined) {
        return { ok: false, reason: "missing hour row geometry" };
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
        (node) => node.getBoundingClientRect().top - rowTop,
      );
      const labelToRowDeltas = [labelTop - rowTop];
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

      let nowLineDeltaPx: number | undefined;
      if (expectNowLineMinutes !== undefined) {
        const nowLine = grid.querySelector<HTMLElement>(".c-now-line-rim");
        if (!nowLine) {
          return { ok: false, reason: "missing now line" };
        }
        const hour = Math.floor(expectNowLineMinutes / 60);
        const minute = expectNowLineMinutes % 60;
        const hourLabelFor = (h: number) => {
          if (h === 0 || h === 24) return "12 AM";
          if (h === 12) return "12 PM";
          if (h < 12) return `${h} AM`;
          return `${h - 12} PM`;
        };
        const startLabel = hourLabelFor(hour);
        const endLabel = hourLabelFor((hour + 1) % 24);
        const startIndex = labels.indexOf(startLabel);
        const endIndex = labels.indexOf(endLabel);
        if (startIndex < 0 || endIndex < 0) {
          return {
            ok: false,
            reason: `missing rows for now line (${startLabel}/${endLabel})`,
          };
        }
        const startTop = rows[startIndex].getBoundingClientRect().top;
        const endTop = rows[endIndex].getBoundingClientRect().top;
        const expectedNowTop = startTop + (minute / 60) * (endTop - startTop);
        nowLineDeltaPx = nowLine.getBoundingClientRect().top - expectedNowTop;
      }

      const badVertical = verticalDeltas.filter(
        (delta) => Math.abs(delta) > tolerance,
      );
      const badLabelRow = labelToRowDeltas.filter(
        (delta) => Math.abs(delta) > tolerance,
      );
      const badHorizontal = horizontalDeltas.filter(
        (delta) => Math.abs(delta) > tolerance,
      );
      const badNow =
        nowLineDeltaPx !== undefined && Math.abs(nowLineDeltaPx) > tolerance;

      return {
        ok:
          badVertical.length === 0 &&
          badLabelRow.length === 0 &&
          badHorizontal.length === 0 &&
          !badNow,
        reason: badLabelRow.length
          ? "gutter label misaligned with hour row"
          : badVertical.length
            ? "event misaligned with hour row"
            : badNow
              ? "now line misaligned with wall clock"
              : badHorizontal.length
                ? "horizontal misalignment"
                : undefined,
        horizontalDeltas,
        verticalDeltas,
        labelToRowDeltas,
        nowLineDeltaPx,
      };
    },
    {
      columnInsetPx: timedEventColumnInsetPx,
      expectNowLineMinutes: options?.expectNowLineMinutes,
      hourLabel: expectedHourLabel,
      patternFlags: eventTitlePattern.flags,
      patternSource: eventTitlePattern.source,
      rowAttr: timedGridRowAttr,
      tolerance: maxAlignmentDeltaPx,
    },
  );
}

export { maxAlignmentDeltaPx };
