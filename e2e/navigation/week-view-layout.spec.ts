import { expect, type Page, test } from "@playwright/test";

const layoutWidths = [900, 1728];
const maxLayoutDelta = 1;
const weekDayTitles = [
  "20260426",
  "20260427",
  "20260428",
  "20260429",
  "20260430",
  "20260501",
  "20260502",
];

test.describe("Week view layout", () => {
  for (const width of layoutWidths) {
    test(`aligns day headers with calendar columns at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/week");
      await page.locator("#allDayColumns").waitFor();
      await page.locator("#timedColumns").waitFor();

      const layout = await getWeekColumnLayout(page);
      const mainGridScrollbarWidth = await page
        .locator("#mainGrid")
        .evaluate(
          (node) => getComputedStyle(node, "::-webkit-scrollbar").width,
        );

      expect(layout.allDayColumns).toHaveLength(weekDayTitles.length);
      expect(layout.dayLabels).toHaveLength(weekDayTitles.length);
      expect(layout.timedColumns).toHaveLength(weekDayTitles.length);
      expect(mainGridScrollbarWidth).toBe("0px");

      for (const [index, dayLabel] of layout.dayLabels.entries()) {
        expectColumnsToAlign(dayLabel, layout.allDayColumns[index]);
        expectColumnsToAlign(dayLabel, layout.timedColumns[index]);
      }
    });
  }
});

const getWeekColumnLayout = async (page: Page) =>
  page.evaluate((titles) => {
    const roundRect = (rect: DOMRect) => ({
      right: Math.round(rect.right * 100) / 100,
      width: Math.round(rect.width * 100) / 100,
      x: Math.round(rect.x * 100) / 100,
    });

    const dayLabels = titles.map((title) => {
      const node = document.querySelector(`[title="${title}"]`);
      if (!(node instanceof HTMLElement)) {
        throw new Error(`Missing day label ${title}`);
      }

      return roundRect(node.getBoundingClientRect());
    });

    const getColumns = (selector: string) =>
      [...document.querySelectorAll(selector)]
        .filter((node): node is HTMLElement => node instanceof HTMLElement)
        .map((node) => {
          const rect = node.getBoundingClientRect();

          return {
            ...roundRect(rect),
            height: rect.height,
          };
        })
        .filter((rect) => rect.height > 20)
        .slice(0, titles.length);

    return {
      allDayColumns: getColumns("#allDayColumns > div"),
      dayLabels,
      timedColumns: getColumns("#timedColumns > div"),
    };
  }, weekDayTitles);

const expectColumnsToAlign = (
  dayLabel: { right: number; width: number; x: number },
  gridColumn: { right: number; width: number; x: number },
) => {
  expect(Math.abs(dayLabel.x - gridColumn.x)).toBeLessThanOrEqual(
    maxLayoutDelta,
  );
  expect(Math.abs(dayLabel.right - gridColumn.right)).toBeLessThanOrEqual(
    maxLayoutDelta,
  );
  expect(Math.abs(dayLabel.width - gridColumn.width)).toBeLessThanOrEqual(
    maxLayoutDelta,
  );
};
